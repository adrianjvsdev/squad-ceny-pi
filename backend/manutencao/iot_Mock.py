import random
from django.utils import timezone
from equipamentos.models import Equipamento
from .models import AnomaliaIoT

def simular_dados_iot():
    """
    Simula leitura de sensores IoT.
    Retorna lista de anomalias detectadas, somente se iot=true.
    """
    equipamentos = Equipamento.objects.filter(tem_iot=True)
    anomalias_detectadas = []
    
    for equip in equipamentos:
        # Simular temperatura (5% de chance de explodir)
        temperatura = random.uniform(20, 100)
        if temperatura > 80:  #Não passa disso
            anomalia = AnomaliaIoT.objects.create(
                equipamento=equip,
                tipo="temperatura_alta",
                valor=round(temperatura, 2),
                valor_limite=80,
                severidade="alta" if temperatura > 90 else "media"
            )
            anomalias_detectadas.append(anomalia)
        
        # Simular pressão (3% de chance de explodir)
        pressao = random.uniform(100, 200)
        if pressao < 110:
            anomalia = AnomaliaIoT.objects.create(
                equipamento=equip,
                tipo="pressao_baixa",
                valor=round(pressao, 2),
                valor_limite=110,
                severidade="media"
            )
            anomalias_detectadas.append(anomalia)
        
        # Simular vibração (7% de chance de explodir)
        vibracao = random.uniform(0, 15)
        if vibracao > 12:
            anomalia = AnomaliaIoT.objects.create(
                equipamento=equip,
                tipo="vibracao_excessiva",
                valor=round(vibracao, 2),
                valor_limite=12,
                severidade="alta"
            )
            anomalias_detectadas.append(anomalia)
    
    return anomalias_detectadas