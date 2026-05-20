from rest_framework import serializers
from .models import Notificacao, LogAuditoria


class NotificacaoSerializer(serializers.ModelSerializer):
    os_titulo = serializers.CharField(source="id_os.titulo", read_only=True)

    class Meta:
        model = Notificacao
        fields = [
            "id_notificacao",
            "id_usuario",
            "id_os",
            "os_titulo",
            "tipo",
            "canal",
            "timestamp_envio",
            "lida",
        ]
        read_only_fields = ["id_notificacao", "timestamp_envio", "id_usuario"]


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="id_usuario.nome", read_only=True)

    class Meta:
        model = LogAuditoria
        fields = [
            "id_log",
            "id_usuario",
            "usuario_nome",
            "acao",
            "tabela_afetada",
            "id_registro_afetado",
            "timestamp",
        ]
        read_only_fields = fields  # Log é sempre somente leitura via API