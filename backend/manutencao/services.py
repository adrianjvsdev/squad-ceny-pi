import logging
from datetime import timedelta

from django.utils import timezone
from ordens_servico.models import OrdemServico

from .models import PlanoManutencao

logger = logging.getLogger(__name__)


def calcular_status_geral(anomalias):
    """Resume as anomalias recentes: "critico", "alerta" ou "normal"."""
    severidades = {anomalia.severidade for anomalia in anomalias}
    if "alta" in severidades:
        return "critico"
    if "media" in severidades:
        return "alerta"
    return "normal"


def criar_os_preventiva(plano: PlanoManutencao) -> OrdemServico:
    """
    Cria uma OS preventiva automática baseada no plano e agenda a próxima
    execução (hoje + periodicidade), para não gerar outra OS a cada hora
    enquanto esta estiver aberta.

    A última manutenção do plano só é registrada quando esta OS for de
    fato concluída (ver OrdemServicoService.concluir), não na abertura.
    """
    equipamento = plano.id_equipamento
    ordem = OrdemServico.objects.create(
        titulo=f"Manutenção Preventiva - {equipamento.nome}",
        descricao=f"Manutenção preventiva automática\n\n{plano.descricao}",
        tipo_manutencao="preventiva",
        prioridade="media",
        id_equipamento=equipamento,
        solicitante=None,  # Sistema não tem usuário
        plano_origem=plano,
    )

    plano.proxima_execucao = timezone.localdate() + timedelta(days=plano.periodicidade_dias)
    plano.save(update_fields=["proxima_execucao"])

    logger.info("OS Preventiva criada: #%s", ordem.id_os)
    return ordem


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