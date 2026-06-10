from datetime import datetime, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from equipamentos.models import Equipamento
from manutencao.models import AnomaliaIoT
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario

FAILURE_TYPES = (
    OrdemServico.TipoManutencao.CORRETIVA,
    OrdemServico.TipoManutencao.PREDITIVA,
)


def _parse_momento(valor, *, fim_do_dia=False):
    """Interpreta YYYY-MM-DD como dia inteiro (evita parse_datetime à meia-noite)."""
    if not valor:
        return None

    texto = str(valor).strip()
    if len(texto) == 10:
        dia = parse_date(texto)
        if dia:
            hora = datetime.max.time() if fim_do_dia else datetime.min.time()
            return timezone.make_aware(datetime.combine(dia, hora))

    parsed = parse_datetime(texto)
    if parsed:
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
        return parsed

    dia = parse_date(texto)
    if dia:
        hora = datetime.max.time() if fim_do_dia else datetime.min.time()
        return timezone.make_aware(datetime.combine(dia, hora))

    return None


def _parse_periodo(data_inicio, data_fim):
    agora = timezone.now()
    fim = _parse_momento(data_fim, fim_do_dia=True) if data_fim else agora

    inicio = fim - timedelta(days=30)
    if data_inicio:
        inicio_parsed = _parse_momento(data_inicio, fim_do_dia=False)
        if inicio_parsed:
            inicio = inicio_parsed

    if inicio > fim:
        raise ValueError("A data inicial nao pode ser posterior a data final.")

    return inicio, fim


def equipamentos_visiveis(usuario, setor_id=None):
    if not usuario.id_empresa_id:
        return Equipamento.objects.none()

    queryset = Equipamento.objects.select_related("id_setor", "id_tipo").filter(
        id_setor__id_empresa=usuario.id_empresa
    )

    if usuario.perfil != Usuario.Perfil.ADMIN:
        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        queryset = queryset.filter(id_setor__in=setores_ids)

    if setor_id:
        queryset = queryset.filter(id_setor_id=setor_id)

    return queryset


def _segundos_entre(inicio, fim):
    if not inicio or not fim or fim <= inicio:
        return 0
    return (fim - inicio).total_seconds()


def _inicio_observacao(equipamento, periodo_inicio):
    referencia = equipamento.data_entrada_operacao or equipamento.data_instalacao
    if referencia:
        if hasattr(referencia, "hour"):
            inicio = referencia
        else:
            inicio = timezone.make_aware(
                datetime.combine(referencia, datetime.min.time())
            )
        return max(inicio, periodo_inicio)
    return periodo_inicio


def _falhas_equipamento(equipamento, periodo_inicio, periodo_fim):
    return OrdemServico.objects.filter(
        id_equipamento=equipamento,
        status=OrdemServico.Status.CONCLUIDA,
        tipo_manutencao__in=FAILURE_TYPES,
        data_fim__gte=periodo_inicio,
        data_fim__lte=periodo_fim,
    ).order_by("data_fim")


def _downtime_de_ordens(ordens, periodo_inicio, periodo_fim, agora):
    total = 0.0
    for ordem in ordens:
        inicio = ordem.data_indisponibilidade or ordem.data_inicio or ordem.data_abertura
        fim = ordem.timestamp_retorno_operacao or ordem.data_fim or agora
        if not inicio:
            continue
        total += _segundos_entre(max(inicio, periodo_inicio), min(fim, periodo_fim))
    return total


def _downtime_equipamento(equipamento, falhas_concluidas, periodo_inicio, periodo_fim, agora):
    total = _downtime_de_ordens(falhas_concluidas, periodo_inicio, periodo_fim, agora)

    ordens_abertas = OrdemServico.objects.filter(
        id_equipamento=equipamento,
        status=OrdemServico.Status.EM_ANDAMENTO,
        data_indisponibilidade__isnull=False,
    )
    total += _downtime_de_ordens(ordens_abertas, periodo_inicio, periodo_fim, agora)
    return total


def _horas(valor_segundos):
    return round(valor_segundos / 3600, 2)


def _metricas_equipamento(equipamento, periodo_inicio, periodo_fim, agora):
    inicio_obs = _inicio_observacao(equipamento, periodo_inicio)
    if inicio_obs >= periodo_fim:
        return None

    tempo_total = _segundos_entre(inicio_obs, periodo_fim)
    falhas = list(_falhas_equipamento(equipamento, periodo_inicio, periodo_fim))
    falhas_corretivas = [o for o in falhas if o.tipo_manutencao == OrdemServico.TipoManutencao.CORRETIVA]
    falhas_preditivas = [o for o in falhas if o.tipo_manutencao == OrdemServico.TipoManutencao.PREDITIVA]

    downtime = _downtime_equipamento(equipamento, falhas, periodo_inicio, periodo_fim, agora)
    tempo_operacional = max(0, tempo_total - downtime)

    qtd_falhas = len(falhas)
    mtbf_horas = _horas(tempo_operacional / qtd_falhas) if qtd_falhas else None
    confiabilidade = round((tempo_operacional / tempo_total) * 100, 2) if tempo_total else 100.0

    reparos = [
        _segundos_entre(o.data_inicio or o.data_indisponibilidade, o.data_fim)
        for o in falhas
        if o.data_fim
    ]
    mttr_horas = _horas(sum(reparos) / len(reparos)) if reparos else None

    mttf_horas = None
    if falhas_preditivas:
        mttf_horas = _horas(tempo_operacional / len(falhas_preditivas))

    return {
        "id_equipamento": equipamento.id_equipamento,
        "tag": equipamento.tag,
        "nome": equipamento.nome,
        "setor": equipamento.id_setor.nome if equipamento.id_setor else None,
        "tipo": equipamento.id_tipo.nome if equipamento.id_tipo else None,
        "status": equipamento.status,
        "falhas": qtd_falhas,
        "falhas_corretivas": len(falhas_corretivas),
        "falhas_preditivas": len(falhas_preditivas),
        "tempo_total_horas": _horas(tempo_total),
        "tempo_operacional_horas": _horas(tempo_operacional),
        "tempo_manutencao_horas": _horas(downtime),
        "mtbf_horas": mtbf_horas,
        "mttf_horas": mttf_horas,
        "mttr_horas": mttr_horas,
        "confiabilidade_percent": confiabilidade,
    }


def gerar_relatorio(usuario, *, data_inicio=None, data_fim=None, setor_id=None, equipamento_id=None):
    periodo_inicio, periodo_fim = _parse_periodo(data_inicio, data_fim)
    agora = timezone.now()

    equipamentos = equipamentos_visiveis(usuario, setor_id=setor_id)
    if equipamento_id:
        equipamentos = equipamentos.filter(id_equipamento=equipamento_id)
        if not equipamentos.exists():
            raise PermissionError("Equipamento nao encontrado ou sem permissao.")

    itens = []
    for equipamento in equipamentos:
        metrica = _metricas_equipamento(equipamento, periodo_inicio, periodo_fim, agora)
        if metrica:
            itens.append(metrica)

    total_falhas = sum(item["falhas"] for item in itens)
    tempo_operacional_total = sum(item["tempo_operacional_horas"] for item in itens)
    tempo_total_agregado = sum(item["tempo_total_horas"] for item in itens)

    mtbf_values = [item["mtbf_horas"] for item in itens if item["mtbf_horas"] is not None]
    mttr_values = [item["mttr_horas"] for item in itens if item["mttr_horas"] is not None]
    mttf_values = [item["mttf_horas"] for item in itens if item["mttf_horas"] is not None]
    confiabilidade_values = [item["confiabilidade_percent"] for item in itens]

    anomalias_iot = AnomaliaIoT.objects.filter(
        equipamento__in=equipamentos,
        detectada_em__gte=periodo_inicio,
        detectada_em__lte=periodo_fim,
    ).count()

    resumo = {
        "equipamentos_analisados": len(itens),
        "total_falhas": total_falhas,
        "anomalias_iot": anomalias_iot,
        "mtbf_medio_horas": round(sum(mtbf_values) / len(mtbf_values), 2) if mtbf_values else None,
        "mttf_medio_horas": round(sum(mttf_values) / len(mttf_values), 2) if mttf_values else None,
        "mttr_medio_horas": round(sum(mttr_values) / len(mttr_values), 2) if mttr_values else None,
        "confiabilidade_media_percent": (
            round(sum(confiabilidade_values) / len(confiabilidade_values), 2)
            if confiabilidade_values
            else 100.0
        ),
        "tempo_operacional_total_horas": round(tempo_operacional_total, 2),
        "tempo_total_horas": round(tempo_total_agregado, 2),
        "mtbf_geral_horas": (
            round(tempo_operacional_total / total_falhas, 2) if total_falhas else None
        ),
    }

    return {
        "periodo": {
            "inicio": periodo_inicio.isoformat(),
            "fim": periodo_fim.isoformat(),
        },
        "resumo": resumo,
        "equipamentos": sorted(itens, key=lambda item: item["confiabilidade_percent"]),
    }
