from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
from ordens_servico.models import OrdemServico
from .models import Equipamento, TipoEquipamento


class TipoEquipamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEquipamento
        fields = "__all__"
        read_only_fields = ["id_tipo", "id_empresa"]
        extra_kwargs = {"nome": {"max_length": 40}}


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
        extra_kwargs = {"nome": {"max_length": 40}}

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

    def validate(self, attrs):
        # Cobre criação, mudança de setor e reativação: em setor inativo o
        # equipamento só pode existir inativo.
        setor = attrs.get("id_setor", getattr(self.instance, "id_setor", None))
        status = attrs.get(
            "status", getattr(self.instance, "status", Equipamento.Status.ATIVO)
        )
        if setor is not None and not setor.ativo and status != Equipamento.Status.INATIVO:
            raise serializers.ValidationError(
                {"id_setor": "Este setor está inativo. Reative o setor antes de ter equipamentos ativos nele."}
            )

        desativando = (
            self.instance is not None
            and self.instance.status != Equipamento.Status.INATIVO
            and status == Equipamento.Status.INATIVO
        )
        if desativando:
            em_aberto = (
                OrdemServico.objects.em_aberto().filter(id_equipamento=self.instance).count()
            )
            if em_aberto:
                raise serializers.ValidationError(
                    {"status": f"Não é possível desativar: o equipamento tem {em_aberto} OS em aberto. Conclua ou cancele as OS antes."}
                )
        return attrs
