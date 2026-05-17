from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import PlanoManutencao, AnomaliaIoT
from .services import criar_os_preventiva, criar_os_preditiva
from .iot_Mock import simular_dados_iot

@shared_task
def verificar_manutencoes_preventivas():
    """
    Task que roda a cada hora.
    Verifica quais manutenções preventivas estão vencidas.
    """
    planos = PlanoManutencao.objects.filter(tipo="preventiva")
    
    for plano in planos:
        if plano.proxima_execucao <= timezone.now().date():
            print(f"Gerando OS Preventiva para {plano.id_equipamento.tag}")
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
            print(f"Gerando OS Preditiva: {anomalia.tipo} - {anomalia.equipamento.nome}")
            criar_os_preditiva(anomalia)
            os_criadas += 1
    
    return f"Processadas {len(anomalias)} anomalias. {os_criadas} OS criadas"