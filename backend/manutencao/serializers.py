from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
from equipamentos.models import Equipamento
from usuarios.models import UsuarioSetor
from .indicadores import concluida_no_prazo
from .models import AnomaliaIoT, ExecucaoPlano, PlanoManutencao

# Janela em que um plano aparece como "vence em breve" (mesma dos
# indicadores de "proximos 7 dias").
DIAS_VENCE_EM_BREVE = 7
TAMANHO_MAX_INSTRUCOES = 2000


class PlanoManutencaoSerializer(serializers.ModelSerializer):
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)
    setor_nome = serializers.CharField(source="id_setor.nome", read_only=True)
    # Declarado para validar com mensagem propria (o limit_choices_to do model
    # responderia so "Pk inválido" para um vinculo que nao e de tecnico).
    tecnico_sugerido = serializers.PrimaryKeyRelatedField(
        queryset=UsuarioSetor.objects.select_related("id_setor"),
        allow_null=True,
        required=False,
    )
    tecnico_nome = serializers.SerializerMethodField()
    id_os_em_aberto = serializers.SerializerMethodField()
    situacao = serializers.SerializerMethodField()

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
            "ativo",
            "dias_antecedencia",
            "prioridade",
            "tecnico_sugerido",
            "tecnico_nome",
            "duracao_estimada_horas",
            "instrucoes",
            "id_os_em_aberto",
            "situacao",
        ]
        # ativo muda pelas acoes pausar/retomar, que tambem ajustam o calendario.
        read_only_fields = ["id_plano", "ultima_manutencao", "ativo"]
        extra_kwargs = {"instrucoes": {"max_length": TAMANHO_MAX_INSTRUCOES}}

    def get_tecnico_nome(self, obj):
        if obj.tecnico_sugerido_id is None:
            return None
        return obj.tecnico_sugerido.id_usuario.nome

    def _os_em_aberto(self, obj):
        """(id, data prevista) da OS do plano em aberto. Vem anotado pelo
        queryset da view (com_situacao); depois de criar/editar, busca."""
        if not hasattr(obj, "id_os_em_aberto"):
            anotado = (
                PlanoManutencao.objects.com_situacao()
                .values("id_os_em_aberto", "data_os_em_aberto")
                .get(pk=obj.pk)
            )
            obj.id_os_em_aberto = anotado["id_os_em_aberto"]
            obj.data_os_em_aberto = anotado["data_os_em_aberto"]
        return obj.id_os_em_aberto, obj.data_os_em_aberto

    def get_id_os_em_aberto(self, obj):
        return self._os_em_aberto(obj)[0]

    def get_situacao(self, obj):
        """pausado | equipamento_inativo | atrasado | os_em_aberto |
        vence_em_breve | em_dia"""
        if not obj.ativo:
            return "pausado"
        if obj.id_equipamento.status == Equipamento.Status.INATIVO:
            return "equipamento_inativo"

        hoje = timezone.localdate()
        id_os, data_os = self._os_em_aberto(obj)
        if obj.proxima_execucao < hoje or (data_os is not None and data_os < hoje):
            return "atrasado"
        if id_os is not None:
            return "os_em_aberto"
        if obj.proxima_execucao <= hoje + timedelta(days=DIAS_VENCE_EM_BREVE):
            return "vence_em_breve"
        return "em_dia"

    def validate_periodicidade_dias(self, value):
        if value <= 0:
            raise serializers.ValidationError("A periodicidade deve ser maior que zero.")
        return value

    def validate_proxima_execucao(self, value):
        if self.instance is not None and value == self.instance.proxima_execucao:
            return value
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "A data da próxima execução não pode ser anterior a hoje."
            )
        return value

    def validate_duracao_estimada_horas(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("A duração estimada deve ser maior que zero.")
        return value

    def validate_tecnico_sugerido(self, value):
        if value is not None:
            validar_mesma_empresa(
                self.context["request"].user,
                value.id_setor.id_empresa_id,
                "O técnico sugerido deve pertencer à sua empresa.",
            )
            if value.perfil_no_setor != UsuarioSetor.PerfilSetor.TECNICO:
                raise serializers.ValidationError("O vínculo selecionado não é de técnico.")
        return value

    def validate_id_equipamento(self, value):
        validar_mesma_empresa(
            self.context["request"].user,
            value.empresa_id,
            "Você não pode usar um equipamento fora da sua empresa.",
        )
        trocou = self.instance is None or self.instance.id_equipamento_id != value.pk
        if trocou and value.status == Equipamento.Status.INATIVO:
            raise serializers.ValidationError(
                "Equipamento inativo não pode receber agendamento."
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

        # Antecedencia igual ou maior que a periodicidade faria duas
        # ocorrencias vencerem ao mesmo tempo.
        periodicidade = attrs.get(
            "periodicidade_dias", getattr(self.instance, "periodicidade_dias", None)
        )
        antecedencia = attrs.get(
            "dias_antecedencia", getattr(self.instance, "dias_antecedencia", 0)
        )
        if periodicidade and antecedencia >= periodicidade:
            raise serializers.ValidationError(
                {"dias_antecedencia": "A antecedência deve ser menor que a periodicidade."}
            )
        return attrs


class ExecucaoPlanoSerializer(serializers.ModelSerializer):
    motivo_display = serializers.CharField(source="get_motivo_display", read_only=True)
    os_status = serializers.SerializerMethodField()
    os_concluida_em = serializers.SerializerMethodField()
    no_prazo = serializers.SerializerMethodField()

    class Meta:
        model = ExecucaoPlano
        fields = [
            "id_execucao",
            "id_plano",
            "id_equipamento",
            "data_prevista",
            "status",
            "motivo",
            "motivo_display",
            "id_os",
            "os_status",
            "os_concluida_em",
            "no_prazo",
            "criado_em",
        ]

    def get_os_status(self, obj):
        return obj.id_os.status if obj.id_os_id is not None else None

    def get_os_concluida_em(self, obj):
        if obj.id_os_id is None or obj.id_os.data_fim is None:
            return None
        return timezone.localtime(obj.id_os.data_fim).date().isoformat()

    def get_no_prazo(self, obj):
        """True/False quando a OS foi concluida; None enquanto nao foi."""
        if obj.id_os_id is None or obj.id_os.data_fim is None:
            return None
        return concluida_no_prazo(obj)


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
    