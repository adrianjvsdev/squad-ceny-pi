import logging

from celery import shared_task
from django.utils import timezone
from .services import avisar_planos_vencendo, criar_os_preditiva, gerar_preventivas_vencidas
from .iot_Mock import simular_dados_iot

logger = logging.getLogger(__name__)

@shared_task
def verificar_manutencoes_preventivas():
    """
    Task que roda a cada hora.
    Gera as OS das preventivas vencidas (equipamento inativo e plano pausado
    nao geram) e avisa os planos que estao para vencer.
    """
    hoje = timezone.localdate()
    gerar_preventivas_vencidas(hoje)
    avisar_planos_vencendo(hoje)
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