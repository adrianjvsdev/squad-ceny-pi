from rest_framework import serializers
from .models import Equipamento, TipoEquipamento


class TipoEquipamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEquipamento
        fields = "__all__"
        read_only_fields = ["id_tipo"]


class EquipamentoSerializer(serializers.ModelSerializer):
    setor_nome = serializers.CharField(source="id_setor.nome", read_only=True)
    tipo_nome = serializers.CharField(source="id_tipo.nome", read_only=True)

    class Meta:
        model = Equipamento
        fields = [
            "id_equipamento",
            "tag",
            "nome",
            "fabricante",
            "modelo",
            "data_instalacao",
            "data_entrada_operacao",
            "status",
            "id_setor",
            "setor_nome",
            "id_tipo",
            "tipo_nome",
        ]
        read_only_fields = ["id_equipamento"]