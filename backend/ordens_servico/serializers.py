from rest_framework import serializers
from .models import OrdemServico
from usuarios.models import Usuario
from notificacoes.models import Notificacao


class OrdemServicoSerializer(serializers.ModelSerializer):
    solicitante_nome = serializers.CharField(source="solicitante.nome", read_only=True)
    solicitante_perfil = serializers.CharField(source="solicitante.perfil", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico.id_usuario.nome", read_only=True)
    tecnico_usuario_id = serializers.SerializerMethodField()
    equipamento_tag = serializers.CharField(source="id_equipamento.tag", read_only=True)
    equipamento_nome = serializers.CharField(source="id_equipamento.nome", read_only=True)
    origem = serializers.SerializerMethodField()
    requer_aprovacao_admin = serializers.SerializerMethodField()

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
        read_only_fields = ["id_os", "data_abertura", "solicitante"]

    def get_origem(self, obj):
        if obj.solicitante is not None:
            return obj.solicitante.perfil

        # IoT = OS sem usuário, em equipamento IoT e de manutenção preditiva.
        if (
            obj.id_equipamento is not None
            and obj.id_equipamento.tem_iot
            and obj.tipo_manutencao == OrdemServico.TipoManutencao.PREDITIVA
        ):
            return "iot"

        return "sistema"

    def get_requer_aprovacao_admin(self, obj):
        return obj.solicitante is not None and obj.solicitante.perfil == Usuario.Perfil.OPERADOR

    def get_tecnico_usuario_id(self, obj):
        if obj.tecnico_id is None:
            return None
        return obj.tecnico.id_usuario_id

    def create(self, validated_data):
        # Solicitante é sempre o usuário autenticado
        solicitante = self.context["request"].user
        validated_data["solicitante"] = solicitante
        ordem = super().create(validated_data)

        # Apenas OS aberta por operador precisa passar por aprovação do admin.
        if solicitante.perfil == Usuario.Perfil.OPERADOR:
            admins = Usuario.objects.filter(
                perfil=Usuario.Perfil.ADMIN,
                id_empresa=solicitante.id_empresa,
                is_active=True,
            ).exclude(pk=solicitante.pk)

            notificacoes = [
                Notificacao(
                    id_usuario=admin,
                    id_os=ordem,
                    tipo=Notificacao.Tipo.OS_ABERTA,
                    canal=Notificacao.Canal.PUSH,
                    titulo=f"OS #{ordem.id_os} aguardando aprovação",
                    mensagem=f"{solicitante.nome} abriu uma OS: {ordem.titulo}",
                )
                for admin in admins
            ]

            if notificacoes:
                Notificacao.objects.bulk_create(notificacoes)

        return ordem
