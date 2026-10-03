from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
from .models import AnomaliaIoT, PlanoManutencao


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
            "ultima_manutencao",
            "id_equipamento",
            "equipamento_tag",
            "equipamento_nome",
            "id_setor",
            "setor_nome",
        ]
        read_only_fields = ["id_plano", "ultima_manutencao"]

    def validate_periodicidade_dias(self, value):
        if value <= 0:
            raise serializers.ValidationError("A periodicidade deve ser maior que zero.")
        return value

    def validate_id_equipamento(self, value):
        validar_mesma_empresa(
            self.context["request"].user,
            value.empresa_id,
            "Você não pode usar um equipamento fora da sua empresa.",
        )
        return value

    def validate_id_setor(self, value):
        if value is not None:
            validar_mesma_empresa(
                self.context["request"].user,
                value.id_empresa_id,
                "Você não pode usar um setor fora da sua empresa.",
            )
        return value

    def validate(self, attrs):
        # Só revalida quando equipamento ou setor são enviados, para não travar
        # a edição de outros campos em planos antigos.
        if "id_equipamento" in attrs or "id_setor" in attrs:
            equipamento = attrs.get("id_equipamento", getattr(self.instance, "id_equipamento", None))
            setor = attrs.get("id_setor", getattr(self.instance, "id_setor", None))
            if setor is None or equipamento.id_setor_id != setor.pk:
                raise serializers.ValidationError(
                    {"id_setor": "O setor do plano deve ser o mesmo setor do equipamento."}
                )
        return attrs


class AnomaliaIoTSerializer(serializers.ModelSerializer):
    equipamento_tag = serializers.CharField(source="equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="equipamento.nome", read_only=True)

    class Meta:
        model = AnomaliaIoT
        fields = [
            "id",
            "equipamento",
            "equipamento_tag",
            "equipamento_nome",
            "tipo",
            "valor",
            "valor_limite",
            "severidade",
            "detectada_em",
        ]
        read_only_fields = ["id", "detectada_em"]


class IoTStatusSerializer(serializers.Serializer):
    id_equipamento = serializers.IntegerField()
    tag = serializers.CharField()
    nome = serializers.CharField()
    tem_iot = serializers.BooleanField()
    temperatura = serializers.FloatField(allow_null=True)
    rpm = serializers.FloatField(allow_null=True)
    pressao = serializers.FloatField(allow_null=True)
    anomalias_recentes = AnomaliaIoTSerializer(many=True, read_only=True)
    status_geral = serializers.CharField()  # "normal", "alerta", "critico"
    