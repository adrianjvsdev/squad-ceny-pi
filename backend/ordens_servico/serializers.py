from rest_framework import serializers
from empresas.validators import validar_mesma_empresa
from equipamentos.models import Equipamento
from .models import OrdemServico


class OrdemServicoSerializer(serializers.ModelSerializer):
    solicitante_nome = serializers.CharField(source="solicitante.nome", read_only=True)
    solicitante_perfil = serializers.CharField(source="solicitante.perfil", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico.id_usuario.nome", read_only=True)
    tecnico_usuario_id = serializers.SerializerMethodField()
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)
    origem = serializers.ReadOnlyField()
    requer_aprovacao_admin = serializers.ReadOnlyField()

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
