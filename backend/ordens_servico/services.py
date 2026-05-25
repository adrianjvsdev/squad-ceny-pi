from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from notificacoes.services import NotificacaoService
from usuarios.models import Usuario

from .models import OrdemServico
from .resolvers import resolver_tecnico


class OrdemServicoService:
    """Centraliza as regras de negocio de ordens de servico."""

    @staticmethod
    def listar_para_usuario(usuario):
        """Retorna as ordens de servico visiveis para o usuario."""
        queryset = OrdemServico.objects.select_related(
            "solicitante",
            "tecnico",
            "tecnico__id_usuario",
            "id_equipamento",
        )
        if usuario.perfil == Usuario.Perfil.ADMIN:
            return queryset.all()

        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        if usuario.perfil == Usuario.Perfil.TECNICO:
            return queryset.filter(
                Q(id_equipamento__id_setor__in=setores_ids)
                | Q(tecnico__id_usuario=usuario)
            ).distinct()

        return queryset.filter(id_equipamento__id_setor__in=setores_ids)

    @staticmethod
    def usuario_e_admin(usuario):
        """Informa se o usuario autenticado e administrador."""
        return usuario.is_authenticated and usuario.perfil == Usuario.Perfil.ADMIN

    @staticmethod
    def tecnico_atribuido(usuario, ordem):
        """Informa se o usuario e o tecnico atribuido a ordem."""
        return (
            usuario.is_authenticated
            and usuario.perfil == Usuario.Perfil.TECNICO
            and ordem.tecnico_id is not None
            and ordem.tecnico.id_usuario_id == usuario.pk
        )

    @staticmethod
    def aprovar(ordem, admin_user, tecnico_id=None):
        """Aprova uma OS aberta por operador e notifica os envolvidos."""
        if not OrdemServicoService._requer_aprovacao_admin(ordem):
            raise ValueError("Esta OS nao requer aprovacao do admin.")
        if ordem.status == OrdemServico.Status.CANCELADA:
            raise ValueError("Esta OS ja foi rejeitada/cancelada.")
        if ordem.status != OrdemServico.Status.ABERTA:
            raise ValueError("Apenas OS com status aberta podem ser aprovadas.")

        tecnico_vinculo = resolver_tecnico(tecnico_id, admin_user)
        ordem.status = OrdemServico.Status.EM_ANDAMENTO
        if tecnico_vinculo is not None:
            ordem.tecnico = tecnico_vinculo
            ordem.save(update_fields=["status", "tecnico"])
        else:
            ordem.save(update_fields=["status"])

        NotificacaoService.notificar_aprovacao(ordem, tecnico_vinculo)
        return ordem

    @staticmethod
    def iniciar(ordem):
        """Registra o inicio real do atendimento pelo tecnico atribuido."""
        if ordem.status != OrdemServico.Status.EM_ANDAMENTO:
            raise ValueError("Apenas OS em andamento podem ser iniciadas.")

        if ordem.data_inicio is None:
            ordem.data_inicio = timezone.now()
            ordem.save(update_fields=["data_inicio"])

        return ordem

    @staticmethod
    def rejeitar(ordem):
        """Rejeita uma OS aberta por operador e notifica o solicitante."""
        if not OrdemServicoService._requer_aprovacao_admin(ordem):
            raise ValueError("Esta OS nao requer aprovacao do admin.")
        if ordem.status == OrdemServico.Status.CANCELADA:
            raise ValueError("Esta OS ja foi rejeitada/cancelada.")
        if ordem.status != OrdemServico.Status.ABERTA:
            raise ValueError("Apenas OS com status aberta podem ser rejeitadas.")

        ordem.status = OrdemServico.Status.CANCELADA
        ordem.save(update_fields=["status"])
        NotificacaoService.notificar_rejeicao(ordem)
        return ordem

    @staticmethod
    def reabrir(ordem):
        """Reabre uma OS cancelada ou concluida e notifica o solicitante."""
        if ordem.status not in (
            OrdemServico.Status.CANCELADA,
            OrdemServico.Status.CONCLUIDA,
        ):
            raise ValueError("Apenas OS canceladas ou concluidas podem ser reabertas.")

        ordem.status = OrdemServico.Status.ABERTA
        ordem.data_inicio = None
        ordem.data_fim = None
        ordem.proxima_manutencao = None
        ordem.timestamp_retorno_operacao = None
        ordem.save(
            update_fields=[
                "status",
                "data_inicio",
                "data_fim",
                "proxima_manutencao",
                "timestamp_retorno_operacao",
            ]
        )
        NotificacaoService.notificar_reabertura(ordem)
        return ordem

    @staticmethod
    def concluir(ordem, relatorio=None, proxima_manutencao=None):
        """Conclui uma OS em andamento e registra o relatorio opcional."""
        if ordem.status != OrdemServico.Status.EM_ANDAMENTO:
            raise ValueError("Apenas OS em andamento podem ser concluidas.")

        proxima_manutencao = OrdemServicoService._normalizar_proxima_manutencao(
            proxima_manutencao
        )
        agora = timezone.now()
        ordem.status = OrdemServico.Status.CONCLUIDA
        if ordem.data_inicio is None:
            ordem.data_inicio = agora
        ordem.data_fim = agora
        ordem.proxima_manutencao = proxima_manutencao
        ordem.timestamp_retorno_operacao = agora
        campos_atualizados = [
            "status",
            "data_inicio",
            "data_fim",
            "proxima_manutencao",
            "timestamp_retorno_operacao",
        ]

        if relatorio is not None:
            ordem.relatorio_intervencao = str(relatorio).strip()
            campos_atualizados.append("relatorio_intervencao")

        ordem.save(update_fields=campos_atualizados)
        OrdemServicoService._atualizar_manutencao_equipamento(
            ordem, agora, proxima_manutencao
        )
        NotificacaoService.notificar_conclusao(ordem)
        return ordem

    @staticmethod
    def desativar_abertas(queryset):
        """Cancela ordens abertas, preservando ordens preditivas de IoT."""
        abertas = queryset.filter(status=OrdemServico.Status.ABERTA)
        cancelaveis = abertas.exclude(
            Q(solicitante__isnull=True)
            & Q(id_equipamento__tem_iot=True)
            & Q(tipo_manutencao=OrdemServico.TipoManutencao.PREDITIVA)
        )
        return cancelaveis.update(status=OrdemServico.Status.CANCELADA)

    @staticmethod
    def _requer_aprovacao_admin(ordem):
        return (
            ordem.solicitante is not None
            and ordem.solicitante.perfil == Usuario.Perfil.OPERADOR
        )

    @staticmethod
    def _normalizar_proxima_manutencao(valor):
        if not valor:
            raise ValueError("Informe a data da proxima manutencao.")

        if isinstance(valor, str):
            valor = parse_date(valor)

        if valor is None:
            raise ValueError("Data da proxima manutencao invalida.")

        if valor < timezone.localdate():
            raise ValueError("A proxima manutencao nao pode ser anterior a hoje.")

        return valor

    @staticmethod
    def _atualizar_manutencao_equipamento(ordem, data_fim, proxima_manutencao):
        if ordem.id_equipamento_id is None:
            return

        equipamento = ordem.id_equipamento
        equipamento.ultima_manutencao = data_fim
        equipamento.proxima_manutencao = proxima_manutencao
        equipamento.save(update_fields=["ultima_manutencao", "proxima_manutencao"])
