from rest_framework import serializers


def validar_mesma_empresa(usuario, empresa_id, mensagem):
    """Rejeita referências a objetos de outra empresa (ou sem empresa)."""
    if empresa_id is None or empresa_id != usuario.id_empresa_id:
        raise serializers.ValidationError(mensagem)
