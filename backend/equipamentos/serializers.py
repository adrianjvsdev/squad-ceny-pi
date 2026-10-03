from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
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

    def validate_id_tipo(self, value):
        # Tipos antigos (anteriores à migration 0004) ficaram sem empresa; um
        # valor que não mudou na edição é aceito para não travar esses registros.
        inalterado = self.instance is not None and value == self.instance.id_tipo
        if value is not None and not inalterado:
            validar_mesma_empresa(
                self.context["request"].user,
                value.id_empresa_id,
                "O tipo de equipamento deve pertencer à sua empresa.",
            )
        return value
