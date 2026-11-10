"""Leitura das preventivas: agenda (ocorrencias registradas + projetadas) e
indicadores da aba Preventivas. Nao altera nada no banco."""

from collections import defaultdict
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db.models import Count
from django.utils import timezone

from equipamentos.models import Equipamento
from ordens_servico.models import OrdemServico

from .models import ExecucaoPlano, PlanoManutencao
from .services import datas_entre


class StatusAgenda:
    PREVISTA = "prevista"      # ainda nao gerada, data no futuro
    GERADA = "gerada"          # OS gerada e em aberto, ainda no prazo
    ATRASADA = "atrasada"      # data prevista ja passou e nada foi concluido
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"    # OS rejeitada/cancelada ou excluida
    PULADA = "pulada"


EM_ABERTO = (OrdemServico.Status.ABERTA, OrdemServico.Status.EM_ANDAMENTO)


def _hoje(hoje):
    return hoje or timezone.localdate()


def _automaticos(planos):
    """Planos cujas ocorrencias o sistema projeta e gera sozinho."""
    return planos.filter(
        tipo=PlanoManutencao.Tipo.PREVENTIVA, ativo=True, periodicidade_dias__gt=0
    ).exclude(id_equipamento__status=Equipamento.Status.INATIVO)


def concluida_no_prazo(execucao, tolerancia_dias=None):
    """A OS da ocorrencia foi concluida ate data prevista + tolerancia?"""
    if tolerancia_dias is None:
        tolerancia_dias = settings.PREVENTIVA_TOLERANCIA_DIAS
    ordem = execucao.id_os
    if ordem is None or ordem.status != OrdemServico.Status.CONCLUIDA or ordem.data_fim is None:
        return False
    concluida_em = timezone.localtime(ordem.data_fim).date()
    return concluida_em <= execucao.data_prevista + timedelta(days=tolerancia_dias)


def _status_execucao(execucao, hoje):
    if execucao.status == ExecucaoPlano.Status.PULADA:
        return StatusAgenda.PULADA
    ordem = execucao.id_os
    if ordem is None or ordem.status == OrdemServico.Status.CANCELADA:
        return StatusAgenda.CANCELADA
    if ordem.status == OrdemServico.Status.CONCLUIDA:
        return StatusAgenda.CONCLUIDA
    return StatusAgenda.ATRASADA if execucao.data_prevista < hoje else StatusAgenda.GERADA


def _item(plano, data_prevista, status, execucao=None):
    equipamento = plano.id_equipamento
    tecnico = plano.tecnico_sugerido
    ordem = execucao.id_os if execucao is not None else None
    return {
        "id_plano": plano.id_plano,
        "descricao": plano.descricao,
        "id_equipamento": equipamento.id_equipamento,
        "equipamento_tag": equipamento.tag,
        "equipamento_nome": equipamento.nome,
        "id_setor": plano.id_setor_id,
        "setor_nome": plano.id_setor.nome if plano.id_setor_id else None,
        "data_prevista": data_prevista,
        "status": status,
        "motivo": execucao.motivo if execucao is not None else "",
        "id_os": ordem.id_os if ordem is not None else None,
        "os_status": ordem.status if ordem is not None else None,
        "concluida_em": (
            timezone.localtime(ordem.data_fim).date()
            if ordem is not None and ordem.data_fim and status == StatusAgenda.CONCLUIDA
            else None
        ),
        "no_prazo": (
            concluida_no_prazo(execucao) if status == StatusAgenda.CONCLUIDA else None
        ),
        "prioridade": plano.prioridade,
        "id_tecnico_sugerido": plano.tecnico_sugerido_id,
        "tecnico_nome": tecnico.id_usuario.nome if tecnico is not None else None,
        "duracao_estimada_horas": (
            float(plano.duracao_estimada_horas)
            if plano.duracao_estimada_horas is not None
            else None
        ),
    }


def montar_agenda(planos, inicio, fim, hoje=None):
    """Ocorrencias de [inicio, fim] dos planos informados (ja filtrados pela
    visibilidade do usuario), ordenadas por data:
    - as registradas em ExecucaoPlano (geradas ou puladas);
    - as projetadas dos planos automaticos (ainda nao geradas)."""
    hoje = _hoje(hoje)
    planos = planos.select_related(
        "id_equipamento", "id_setor", "tecnico_sugerido__id_usuario"
    )

    itens = []
    execucoes = ExecucaoPlano.objects.filter(
        id_plano__in=planos, data_prevista__range=(inicio, fim)
    ).select_related(
        "id_os",
        "id_plano__id_equipamento",
        "id_plano__id_setor",
        "id_plano__tecnico_sugerido__id_usuario",
    )
    for execucao in execucoes:
        itens.append(
            _item(execucao.id_plano, execucao.data_prevista, _status_execucao(execucao, hoje), execucao)
        )

    for plano in _automaticos(planos):
        primeira = plano.proxima_execucao
        for data in datas_entre(primeira, plano.periodicidade_dias, max(inicio, primeira), fim):
            status = StatusAgenda.ATRASADA if data < hoje else StatusAgenda.PREVISTA
            itens.append(_item(plano, data, status))

    itens.sort(key=lambda item: (item["data_prevista"], item["id_plano"]))
    return itens


def _aderencia(planos, hoje, dias):
    """% das ocorrencias cujo prazo (data prevista + tolerancia) ja terminou
    na janela e que foram concluidas dentro dele. Puladas manualmente pelo
    admin nao contam; puladas por atraso ou OS em aberto contam como nao
    cumpridas."""
    tolerancia = settings.PREVENTIVA_TOLERANCIA_DIAS
    avaliadas = list(
        ExecucaoPlano.objects.filter(
            id_plano__in=planos,
            data_prevista__gte=hoje - timedelta(days=dias),
            data_prevista__lt=hoje - timedelta(days=tolerancia),
        )
        .exclude(status=ExecucaoPlano.Status.PULADA, motivo=ExecucaoPlano.Motivo.MANUAL)
        .select_related("id_os")
    )
    no_prazo = sum(concluida_no_prazo(execucao, tolerancia) for execucao in avaliadas)
    return {
        "percentual": round(no_prazo / len(avaliadas), 3) if avaliadas else None,
        "no_prazo": no_prazo,
        "avaliadas": len(avaliadas),
    }


def _atrasadas(planos, hoje):
    """Ocorrencias com data prevista no passado e nada concluido: OS gerada
    ainda em aberto + ocorrencias que nem chegaram a ser geradas."""
    geradas_em_aberto = ExecucaoPlano.objects.filter(
        id_plano__in=planos,
        status=ExecucaoPlano.Status.GERADA,
        data_prevista__lt=hoje,
        id_os__status__in=EM_ABERTO,
    ).count()
    ontem = hoje - timedelta(days=1)
    nao_geradas = sum(
        len(datas_entre(p.proxima_execucao, p.periodicidade_dias, p.proxima_execucao, ontem))
        for p in _automaticos(planos).filter(proxima_execucao__lt=hoje)
    )
    return geradas_em_aberto + nao_geradas


def _manutencao_planejada(ordens, hoje, dias):
    """OS abertas na janela (sem as canceladas) por tipo de manutencao."""
    desde = timezone.make_aware(datetime.combine(hoje - timedelta(days=dias), time.min))
    contagem = dict(
        ordens.filter(data_abertura__gte=desde)
        .exclude(status=OrdemServico.Status.CANCELADA)
        .values_list("tipo_manutencao")
        .annotate(total=Count("id_os"))
        .order_by()
    )
    preventivas = contagem.get(OrdemServico.TipoManutencao.PREVENTIVA, 0)
    corretivas = contagem.get(OrdemServico.TipoManutencao.CORRETIVA, 0)
    base = preventivas + corretivas
    return {
        "preventivas": preventivas,
        "preditivas": contagem.get(OrdemServico.TipoManutencao.PREDITIVA, 0),
        "corretivas": corretivas,
        "percentual_preventiva": round(preventivas / base, 3) if base else None,
    }


def _carga_tecnicos(agenda):
    """Horas estimadas por tecnico sugerido nas ocorrencias da agenda que
    ainda vao acontecer (previstas ou geradas e em aberto)."""
    carga = defaultdict(lambda: {"horas": 0.0, "ocorrencias": 0, "sem_estimativa": 0})
    nomes = {}
    for item in agenda:
        if item["status"] not in (StatusAgenda.PREVISTA, StatusAgenda.GERADA):
            continue
        chave = item["id_tecnico_sugerido"]
        nomes[chave] = item["tecnico_nome"] or "Sem técnico definido"
        carga[chave]["ocorrencias"] += 1
        if item["duracao_estimada_horas"] is None:
            carga[chave]["sem_estimativa"] += 1
        else:
            carga[chave]["horas"] += item["duracao_estimada_horas"]

    linhas = [
        {"id_tecnico": chave, "nome": nomes[chave], **valores}
        for chave, valores in carga.items()
    ]
    linhas.sort(key=lambda linha: (linha["id_tecnico"] is None, -linha["horas"], linha["nome"]))
    return linhas


def calcular_indicadores(planos, ordens, hoje=None, dias=90):
    """Indicadores da aba Preventivas para os planos e OS visiveis ao usuario."""
    hoje = _hoje(hoje)
    proximas_4_semanas = montar_agenda(planos, hoje, hoje + timedelta(days=27), hoje)
    return {
        "hoje": hoje,
        "periodo_dias": dias,
        "tolerancia_dias": settings.PREVENTIVA_TOLERANCIA_DIAS,
        "aderencia": _aderencia(planos, hoje, dias),
        "atrasadas": _atrasadas(planos, hoje),
        "proximos_7_dias": sum(
            item["data_prevista"] <= hoje + timedelta(days=6)
            and item["status"] in (StatusAgenda.PREVISTA, StatusAgenda.GERADA)
            for item in proximas_4_semanas
        ),
        "manutencao_planejada": _manutencao_planejada(ordens, hoje, dias),
        "carga_tecnicos": _carga_tecnicos(proximas_4_semanas),
    }
