from .models import Notificacao


class NotificacaoService:
    """Centraliza a emissao de notificacoes de ordens de servico."""

    @staticmethod
    def notificar_aprovacao(ordem, tecnico_vinculo=None):
        """Notifica solicitante e tecnico quando uma OS e aprovada."""
        mensagem = "Sua ordem de servico foi aprovada pelo administrador."
        if tecnico_vinculo is not None:
            mensagem = (
                "Sua ordem de servico foi aprovada e atribuida ao tecnico "
                f"{tecnico_vinculo.id_usuario.nome}."
            )

        Notificacao.objects.create(
            id_usuario=ordem.solicitante,
            id_os=ordem,
            tipo=Notificacao.Tipo.OS_ATUALIZADA,
            canal=Notificacao.Canal.PUSH,
            titulo=f"OS #{ordem.id_os} aprovada",
            mensagem=mensagem,
        )

        if tecnico_vinculo is not None:
            Notificacao.objects.create(
                id_usuario=tecnico_vinculo.id_usuario,
                id_os=ordem,
                tipo=Notificacao.Tipo.OS_ATUALIZADA,
                canal=Notificacao.Canal.PUSH,
                titulo=f"Nova OS #{ordem.id_os} atribuida",
                mensagem=f"Prioridade {ordem.prioridade}. {ordem.titulo}",
            )

    @staticmethod
    def notificar_rejeicao(ordem):
        """Notifica o solicitante quando uma OS e rejeitada."""
        Notificacao.objects.create(
            id_usuario=ordem.solicitante,
            id_os=ordem,
            tipo=Notificacao.Tipo.OS_ATUALIZADA,
            canal=Notificacao.Canal.PUSH,
            titulo=f"OS #{ordem.id_os} rejeitada",
            mensagem="Sua ordem de servico foi rejeitada pelo administrador.",
        )

    @staticmethod
    def notificar_reabertura(ordem):
        """Notifica o solicitante quando uma OS e reaberta."""
        if ordem.solicitante is not None:
            Notificacao.objects.create(
                id_usuario=ordem.solicitante,
                id_os=ordem,
                tipo=Notificacao.Tipo.OS_ATUALIZADA,
                canal=Notificacao.Canal.PUSH,
                titulo=f"OS #{ordem.id_os} reaberta",
                mensagem="Sua ordem de servico foi reaberta pelo administrador.",
            )

    @staticmethod
    def notificar_conclusao(ordem):
        """Notifica o solicitante quando uma OS e concluida."""
        if ordem.solicitante is not None:
            Notificacao.objects.create(
                id_usuario=ordem.solicitante,
                id_os=ordem,
                tipo=Notificacao.Tipo.OS_CONCLUIDA,
                canal=Notificacao.Canal.PUSH,
                titulo=f"OS #{ordem.id_os} concluida",
                mensagem="Sua ordem de servico foi concluida pelo tecnico.",
            )
