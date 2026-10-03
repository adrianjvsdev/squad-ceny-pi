import logging

from celery import shared_task
from django.utils import timezone
from .models import PlanoManutencao
from .services import criar_os_preventiva, criar_os_preditiva
from .iot_Mock import simular_dados_iot

logger = logging.getLogger(__name__)

@shared_task
def verificar_manutencoes_preventivas():
    """
    Task que roda a cada hora.
    Verifica quais manutenções preventivas estão vencidas.
    """
    # Equipamento inativo nao gera OS preventiva automatica.
    planos = PlanoManutencao.objects.filter(tipo="preventiva").exclude(
        id_equipamento__status="inativo"
    )

    for plano in planos:
        if plano.proxima_execucao <= timezone.now().date():
            logger.info("Gerando OS Preventiva para %s", plano.id_equipamento.tag)
            criar_os_preventiva(plano)
    
    return "Verificação de manutenções preventivas concluída"


@shared_task
def processar_anomalias_iot():
    """
    Task que roda a cada 5 minutos.
    Simula leitura de IoT e cria OS preditivas quando necessário.
    """
    anomalias = simular_dados_iot()
    
    os_criadas = 0
    for anomalia in anomalias: ##prevenção de os repetidas.
        if not anomalia.os_gerada and anomalia.severidade in ["media", "alta"]:
            logger.info(
                "Gerando OS Preditiva: %s - %s", anomalia.tipo, anomalia.equipamento.nome
            )
            criar_os_preditiva(anomalia)
            os_criadas += 1
    
    return f"Processadas {len(anomalias)} anomalias. {os_criadas} OS criadas"