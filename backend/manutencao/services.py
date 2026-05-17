from django.utils import timezone
from ordens_servico.models import OrdemServico
from .models import PlanoManutencao

def criar_os_preventiva(plano):
    """
    Cria uma OS preventiva automática baseada no plano.
    """
    os = OrdemServico.objects.create(
        titulo=f"Manutenção Preventiva - {plano.equipamento.nome}",
        descricao=f"Manutenção preventiva automática\n\n{plano.descricao}",
        tipo_manutencao="preventiva",
        prioridade="media",
        id_equipamento=plano.equipamento,
        solicitante=None,  # Sistema não tem usuário
    )
    
    # Atualiza data da última manutenção
    plano.ultima_manutencao = timezone.now()
    plano.save()
    
    print(f"OS Preventiva criada: #{os.id_os}")
    return os


def criar_os_preditiva(anomalia):
    """
    Cria uma OS preditiva baseada na anomalia IoT detectada.
    """
    # Define prioridade por severidade
    prioridade_map = {
        "baixa": "baixa",
        "media": "media",
        "alta": "alta",
        "critica": "critica",
    }
    
    os = OrdemServico.objects.create(
        titulo=f"Manutenção Preditiva - {anomalia.equipamento.nome}",
        descricao=(
            f"Anomalia detectada pelo sistema IoT\n\n"
            f"Tipo: {anomalia.tipo}\n"
            f"Valor detectado: {anomalia.valor}\n"
            f"Limite crítico: {anomalia.valor_limite}\n"
            f"Severidade: {anomalia.get_severidade_display()}"
        ),
        tipo_manutencao="preditiva",
        prioridade=prioridade_map.get(anomalia.severidade, "media"),
        id_equipamento=anomalia.equipamento,
        solicitante=None,  # Sistema
    )
    
    # Vincula a anomalia à OS criada
    anomalia.os_gerada = os
    anomalia.save()
    
    print(f"✅ OS Preditiva criada: #{os.id_os}")
    return os