from rest_framework import serializers
from .models import PlanoManutencao


class PlanoManutencaoSerializer(serializers.ModelSerializer):
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)
    setor_nome = serializers.CharField(source="id_setor.nome", read_only=True)

    class Meta:
        model = PlanoManutencao
        fields = [
            "id_plano",
            "descricao",
            "tipo",
            "periodicidade_dias",
            "proxima_execucao",
            "id_equipamento",
            "equipamento_tag",
            "equipamento_nome",
            "id_setor",
            "setor_nome",
        ]
        read_only_fields = ["id_plano"]

    def validate_periodicidade_dias(self, value):
        if value <= 0:
            raise serializers.ValidationError("A periodicidade deve ser maior que zero.")
        return value