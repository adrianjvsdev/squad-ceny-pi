from django.db import transaction
from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
from equipamentos.models import Equipamento
from .models import OrdemServico, TriagemIA
from .triagem_ia import (
    TAMANHO_MAX_JUSTIFICATIVA,
    TAMANHO_MAX_TEXTO,
    TAMANHO_MIN_TEXTO,
    limpar_texto,
)


class TriagemIASerializer(serializers.ModelSerializer):
    """Bloco opcional de auditoria da triagem por IA. Na criacao da OS e so
    metadado: a OS continua passando por todas as validacoes de sempre."""

    class Meta:
        model = TriagemIA
        fields = [
            "texto_original",
            "tipo_problema",
            "justificativa_prioridade",
            "confianca",
            "modelo_usado",
            "prioridade_sugerida",
        ]
        extra_kwargs = {
            "texto_original": {"max_length": TAMANHO_MAX_TEXTO},
            "justificativa_prioridade": {"max_length": TAMANHO_MAX_JUSTIFICATIVA},
        }

    def validate_texto_original(self, value):
        return limpar_texto(value, TAMANHO_MAX_TEXTO, multilinha=True)

    def validate_justificativa_prioridade(self, value):
        return limpar_texto(value, TAMANHO_MAX_JUSTIFICATIVA)

    def validate_modelo_usado(self, value):
        return limpar_texto(value, 100)


class OrdemServicoSerializer(serializers.ModelSerializer):
    solicitante_nome = serializers.CharField(source="solicitante.nome", read_only=True)
    solicitante_perfil = serializers.CharField(source="solicitante.perfil", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico.id_usuario.nome", read_only=True)
    tecnico_usuario_id = serializers.SerializerMethodField()
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)
    origem = serializers.ReadOnlyField()
    requer_aprovacao_admin = serializers.ReadOnlyField()
    # Aceito so na criacao (ver update); na leitura e null quando nao houve triagem.
    triagem_ia = TriagemIASerializer(required=False, allow_null=True)

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
            "proxima_manutencao",
            "relatorio_intervencao",
            "timestamp_retorno_operacao",
            "solicitante",
            "solicitante_nome",
            "solicitante_perfil",
            "tecnico",
            "tecnico_nome",
            "tecnico_usuario_id",
            "id_equipamento",
            "equipamento_tag",
            "equipamento_nome",
            "origem",
            "requer_aprovacao_admin",
            "triagem_ia",
        ]
        read_only_fields = [
            "id_os",
            "data_abertura",
            "data_inicio",
            "data_fim",
            "proxima_manutencao",
            "timestamp_retorno_operacao",
            "solicitante",
        ]

    def validate_id_equipamento(self, value):
        if value is not None:
            validar_mesma_empresa(
                self.context["request"].user,
                value.empresa_id,
                "Você não pode usar um equipamento fora da sua empresa.",
            )
            if value.status == Equipamento.Status.INATIVO:
                raise serializers.ValidationError(
                    "Não é possível abrir uma ordem de serviço para um equipamento inativo."
                )
        return value

    def validate_tecnico(self, value):
        if value is not None:
            validar_mesma_empresa(
                self.context["request"].user,
                value.id_setor.id_empresa_id,
                "O técnico atribuído deve pertencer à sua empresa.",
            )
        return value

    def get_tecnico_usuario_id(self, obj):
        if obj.tecnico_id is None:
            return None
        return obj.tecnico.id_usuario_id

    def create(self, validated_data):
        triagem = validated_data.pop("triagem_ia", None)
        with transaction.atomic():
            ordem = super().create(validated_data)
            if triagem is not None:
                TriagemIA.objects.create(id_os=ordem, **triagem)
        return ordem

    def update(self, instance, validated_data):
        # A triagem e auditoria da abertura: ignorada depois, como os
        # demais campos somente leitura.
        validated_data.pop("triagem_ia", None)
        return super().update(instance, validated_data)


class TriagemTextoSerializer(serializers.Serializer):
    """Entrada do preview: o relato livre do usuario."""

    texto = serializers.CharField(min_length=TAMANHO_MIN_TEXTO, max_length=TAMANHO_MAX_TEXTO)


class EquipamentoTriagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipamento
        fields = ["id_equipamento", "tag", "nome", "status"]


class TriagemResultadoSerializer(serializers.Serializer):
    """Saida do preview (somente leitura): a triagem para o usuario revisar
    e, ao confirmar, reenviar no POST /api/ordens-servico/."""

    titulo = serializers.CharField()
    descricao = serializers.CharField()
    tipo_manutencao = serializers.CharField()
    prioridade_sugerida = serializers.CharField()
    justificativa_prioridade = serializers.CharField()
    tipo_problema = serializers.CharField()
    risco_seguranca = serializers.BooleanField()
    equipamento_parado = serializers.BooleanField()
    confianca = serializers.FloatField()
    campos_faltantes = serializers.ListField(child=serializers.CharField())
    equipamento_identificado = serializers.CharField()
    equipamento = EquipamentoTriagemSerializer()
    texto_original = serializers.CharField()
    modelo_usado = serializers.CharField()
