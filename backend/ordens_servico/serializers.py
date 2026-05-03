from rest_framework import serializers
from .models import OrdemServico


class OrdemServicoSerializer(serializers.ModelSerializer):
    solicitante_nome = serializers.CharField(source="solicitante.nome", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico.nome", read_only=True)
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            "id_os",
            "titulo",
            "descricao",
            "prioridade",
            "status",
            "tipo_manutencao",
            "custo",
            "data_abertura",
            "data_inicio",
            "data_fim",
            "relatorio_intervencao",
            "timestamp_retorno_operacao",
            "solicitante",
            "solicitante_nome",
            "tecnico",
            "tecnico_nome",
            "id_equipamento",
            "equipamento_tag",
            "equipamento_nome",
        ]
        read_only_fields = ["id_os", "data_abertura", "solicitante"]

    def create(self, validated_data):
        # Solicitante é sempre o usuário autenticado
        validated_data["solicitante"] = self.context["request"].user
        return super().create(validated_data)