import logging
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from equipamentos.models import Equipamento
from notificacoes.services import NotificacaoService
from ordens_servico.models import OrdemServico

from .models import ExecucaoPlano, PlanoManutencao

logger = logging.getLogger(__name__)


def calcular_status_geral(anomalias):
    """Resume as anomalias recentes: "critico", "alerta" ou "normal"."""
    severidades = {anomalia.severidade for anomalia in anomalias}
    if "alta" in severidades:
        return "critico"
    if "media" in severidades:
        return "alerta"
    return "normal"


# ─── Calendario do plano (funcoes puras) ──────────────────────────────────────


def datas_entre(primeira, periodicidade_dias, inicio, fim):
    """Datas da serie primeira + k * periodicidade (k >= 0) dentro de
    [inicio, fim]. A serie e ancorada na primeira data: atrasos na geracao
    nao deslocam o calendario."""
    if periodicidade_dias <= 0:
        raise ValueError("A periodicidade deve ser maior que zero.")
    if fim < inicio:
        return []

    passo = timedelta(days=periodicidade_dias)
    saltos = max(0, -(-(inicio - primeira).days // periodicidade_dias))  # teto
    data = primeira + saltos * passo
    datas = []
    while data <= fim:
        datas.append(data)
        data += passo
    return datas


def proximas_datas(primeira, periodicidade_dias, a_partir_de, quantidade):
    """As `quantidade` primeiras datas da serie em ou depois de `a_partir_de`."""
    if quantidade <= 0:
        return []
    inicio = max(primeira, a_partir_de)
    fim = inicio + timedelta(days=periodicidade_dias * quantidade)
    return datas_entre(primeira, periodicidade_dias, inicio, fim)[:quantidade]


def antecedencia_efetiva(plano):
    """Antecedencia limitada a periodicidade - 1: mais que isso faria duas
    ocorrencias vencerem ao mesmo tempo."""
    return min(plano.dias_antecedencia, plano.periodicidade_dias - 1)


def ocorrencias_vencidas(plano, hoje):
    """Ocorrencias ainda nao geradas cuja OS ja deveria existir
    (data prevista - antecedencia <= hoje), da mais antiga a mais recente."""
    limite = hoje + timedelta(days=antecedencia_efetiva(plano))
    return datas_entre(
        plano.proxima_execucao, plano.periodicidade_dias, plano.proxima_execucao, limite
    )


# ─── Geracao das OS ───────────────────────────────────────────────────────────


def criar_os_preventiva(plano: PlanoManutencao, data_prevista) -> OrdemServico:
    """
    Cria a OS preventiva de uma ocorrencia do plano, registra a execucao e
    avisa os admins. Nao mexe no calendario do plano (ver _processar_plano).

    A última manutenção do plano só é registrada quando esta OS for de
    fato concluída (ver OrdemServicoService.concluir), não na abertura.
    """
    equipamento = plano.id_equipamento
    descricao = f"Manutenção preventiva automática\n\n{plano.descricao}"
    if plano.instrucoes:
        descricao += f"\n\nInstruções:\n{plano.instrucoes}"
    descricao += f"\n\nData prevista: {data_prevista:%d/%m/%Y}"

    ordem = OrdemServico.objects.create(
        titulo=f"Manutenção Preventiva - {equipamento.nome}",
        descricao=descricao,
        tipo_manutencao=OrdemServico.TipoManutencao.PREVENTIVA,
        prioridade=plano.prioridade,
        id_equipamento=equipamento,
        solicitante=None,  # Sistema não tem usuário
        plano_origem=plano,
    )
    ExecucaoPlano.objects.create(
        id_plano=plano,
        id_equipamento=equipamento,
        data_prevista=data_prevista,
        id_os=ordem,
        status=ExecucaoPlano.Status.GERADA,
    )

    NotificacaoService.notificar_os_sistema(ordem)
    logger.info(
        "os_preventiva_criada id_os=%s id_plano=%s data_prevista=%s",
        ordem.id_os, plano.id_plano, data_prevista,
    )
    return ordem


def _registrar_pulada(plano, data_prevista, motivo):
    ExecucaoPlano.objects.create(
        id_plano=plano,
        id_equipamento=plano.id_equipamento,
        data_prevista=data_prevista,
        status=ExecucaoPlano.Status.PULADA,
        motivo=motivo,
    )


def _os_em_aberto(plano):
    return (
        OrdemServico.objects.em_aberto()
        .filter(plano_origem=plano, id_equipamento=plano.id_equipamento_id)
        .first()
    )


@transaction.atomic
def _processar_plano(plano_id, hoje, forcar=False):
    """Gera a OS da ocorrencia vencida mais recente do plano e avanca o
    calendario. Devolve (ordem ou None, quantidade de ocorrencias puladas).

    - Ocorrencias vencidas mais antigas (worker parado) viram "pulada/atrasada".
    - Se ainda ha OS do plano em aberto, a ocorrencia vira "pulada/os_em_aberto"
      em vez de gerar uma OS duplicada.
    - forcar=True ("executar agora") gera a proxima ocorrencia mesmo que ainda
      nao tenha vencido e recusa (ValueError) se houver OS em aberto.
    """
    plano = (
        PlanoManutencao.objects.select_for_update()
        .select_related("id_equipamento")
        .get(pk=plano_id)
    )
    datas = ocorrencias_vencidas(plano, hoje)
    if not datas:
        if not forcar:
            return None, 0
        datas = [plano.proxima_execucao]

    *atrasadas, data_prevista = datas
    for data in atrasadas:
        _registrar_pulada(plano, data, ExecucaoPlano.Motivo.ATRASADA)

    ordem = None
    puladas = len(atrasadas)
    em_aberto = _os_em_aberto(plano)
    if em_aberto is None:
        ordem = criar_os_preventiva(plano, data_prevista)
    elif forcar:
        raise ValueError(
            f"Já existe uma OS deste plano em aberto (OS #{em_aberto.id_os})."
        )
    else:
        _registrar_pulada(plano, data_prevista, ExecucaoPlano.Motivo.OS_EM_ABERTO)
        puladas += 1

    plano.proxima_execucao = data_prevista + timedelta(days=plano.periodicidade_dias)
    plano.save(update_fields=["proxima_execucao"])
    return ordem, puladas


def _planos_automaticos():
    """Planos que o sistema executa sozinho: preventivos, ativos e de
    equipamento que nao esteja inativo."""
    return PlanoManutencao.objects.filter(
        tipo=PlanoManutencao.Tipo.PREVENTIVA, ativo=True
    ).exclude(id_equipamento__status=Equipamento.Status.INATIVO)


def gerar_preventivas_vencidas(hoje=None):
    """Gera as OS de todos os planos vencidos. Idempotente: rodar de novo no
    mesmo dia nao duplica nada. Um plano com erro nao interrompe os demais."""
    hoje = hoje or timezone.localdate()
    resumo = {"geradas": 0, "puladas": 0, "erros": 0}

    for plano in _planos_automaticos():
        try:
            if not ocorrencias_vencidas(plano, hoje):
                continue
            ordem, puladas = _processar_plano(plano.pk, hoje)
        except (ValueError, IntegrityError):
            logger.exception("falha_preventiva id_plano=%s", plano.pk)
            resumo["erros"] += 1
            continue
        resumo["geradas"] += ordem is not None
        resumo["puladas"] += puladas

    logger.info(
        "preventivas_verificadas geradas=%s puladas=%s erros=%s",
        resumo["geradas"], resumo["puladas"], resumo["erros"],
    )
    return resumo


def avisar_planos_vencendo(hoje=None):
    """Avisa (PLANO_VENCENDO) os admins e o tecnico sugerido dos planos que
    vencem nos proximos PREVENTIVA_AVISO_DIAS dias. Um aviso por ocorrencia."""
    hoje = hoje or timezone.localdate()
    limite = hoje + timedelta(days=settings.PREVENTIVA_AVISO_DIAS)
    planos = (
        _planos_automaticos()
        .filter(proxima_execucao__gte=hoje, proxima_execucao__lte=limite)
        .exclude(aviso_enviado_para=F("proxima_execucao"))
        .select_related("id_equipamento__id_setor", "tecnico_sugerido__id_usuario")
    )

    avisados = 0
    for plano in planos:
        NotificacaoService.notificar_plano_vencendo(plano, hoje)
        plano.aviso_enviado_para = plano.proxima_execucao
        plano.save(update_fields=["aviso_enviado_para"])
        avisados += 1
    return avisados


# ─── Acoes do admin sobre o plano ─────────────────────────────────────────────


def executar_agora(plano, hoje=None):
    """Gera ja a OS da proxima ocorrencia e avanca o calendario."""
    if not plano.ativo:
        raise ValueError("Retome o plano antes de executá-lo.")
    if plano.id_equipamento.status == Equipamento.Status.INATIVO:
        raise ValueError("Equipamento inativo não gera OS.")

    ordem, _ = _processar_plano(plano.pk, hoje or timezone.localdate(), forcar=True)
    return ordem


@transaction.atomic
def pular_proxima(plano):
    """Registra a proxima ocorrencia como pulada e avanca o calendario."""
    plano = PlanoManutencao.objects.select_for_update().get(pk=plano.pk)
    _registrar_pulada(plano, plano.proxima_execucao, ExecucaoPlano.Motivo.MANUAL)
    plano.proxima_execucao += timedelta(days=plano.periodicidade_dias)
    plano.save(update_fields=["proxima_execucao"])
    return plano


def pausar(plano):
    if not plano.ativo:
        raise ValueError("O plano já está pausado.")
    plano.ativo = False
    plano.save(update_fields=["ativo"])
    return plano


def retomar(plano, hoje=None):
    """Reativa o plano sem recuperar as ocorrencias do periodo pausado: a
    proxima execucao passa para a primeira data da serie a partir de hoje."""
    if plano.ativo:
        raise ValueError("O plano já está ativo.")

    hoje = hoje or timezone.localdate()
    plano.ativo = True
    if plano.proxima_execucao < hoje:
        (plano.proxima_execucao,) = proximas_datas(
            plano.proxima_execucao, plano.periodicidade_dias, hoje, 1
        )
    plano.save(update_fields=["ativo", "proxima_execucao"])
    return plano


def criar_os_preditiva(anomalia):
    """
    Cria uma OS preditiva baseada na anomalia IoT detectada.
    """
    ordem = OrdemServico.objects.create(
        titulo=f"Manutenção Preditiva - {anomalia.equipamento.nome}",
        descricao=(
            f"Anomalia detectada pelo sistema IoT\n\n"
            f"Tipo: {anomalia.tipo}\n"
            f"Valor detectado: {anomalia.valor}\n"
            f"Limite crítico: {anomalia.valor_limite}\n"
            f"Severidade: {anomalia.get_severidade_display()}"
        ),
        tipo_manutencao="preditiva",
        prioridade=anomalia.severidade,  # mesmos valores de Prioridade (baixa/media/alta)
        id_equipamento=anomalia.equipamento,
        solicitante=None,  # Sistema
    )

    # Vincula a anomalia à OS criada
    anomalia.os_gerada = ordem
    anomalia.save()

    logger.info("OS Preditiva criada: #%s", ordem.id_os)
    return ordem
