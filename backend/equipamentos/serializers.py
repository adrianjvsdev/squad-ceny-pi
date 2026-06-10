from django.utils import timezone
from rest_framework import serializers

from .models import Equipamento, TipoEquipamento


class TipoEquipamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEquipamento
        fields = "__all__"
        read_only_fields = ["id_tipo", "id_empresa"]


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
            "ultima_manutencao",
            "proxima_manutencao",
            "status",
            "id_setor",
            "setor_nome",
            "id_tipo",
            "tipo_nome",
            "tem_iot",
        ]
        read_only_fields = ["id_equipamento", "ultima_manutencao", "proxima_manutencao"]

    def validate_id_setor(self, value):
        user = self.context['request'].user
        if value.id_empresa != user.id_empresa:
            raise serializers.ValidationError(
                "Você não pode adicionar um equipamento a um setor fora da sua empresa."
            )
        return value

    def create(self, validated_data):
        if not validated_data.get("data_entrada_operacao"):
            validated_data["data_entrada_operacao"] = timezone.now()
        if not validated_data.get("status"):
            validated_data["status"] = Equipamento.Status.ATIVO
        return super().create(validated_data)
