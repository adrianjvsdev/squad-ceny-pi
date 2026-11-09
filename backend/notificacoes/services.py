from ordens_servico.models import OrdemServico
from usuarios.models import Usuario, UsuarioSetor

from .models import Notificacao


class NotificacaoService:
    """Centraliza a emissao de notificacoes de ordens de servico."""

    @staticmethod
    def _nova(
        usuario: Usuario,
        ordem: OrdemServico,
        tipo: str,
        titulo: str,
        mensagem: str,
    ) -> Notificacao:
        """Monta (sem salvar) uma notificacao push ligada a uma OS."""
        return Notificacao(
            id_usuario=usuario,
            id_os=ordem,
            tipo=tipo,
            canal=Notificacao.Canal.PUSH,
            titulo=titulo,
            mensagem=mensagem,
        )

    @staticmethod
    def _criar(
        usuario: Usuario,
        ordem: OrdemServico,
        tipo: str,
        titulo: str,
        mensagem: str,
    ) -> Notificacao:
        notificacao = NotificacaoService._nova(usuario, ordem, tipo, titulo, mensagem)
        notificacao.save()
        return notificacao

    @staticmethod
    def notificar_abertura(ordem: OrdemServico) -> None:
        """Avisa os demais admins da empresa que uma OS esta aguardando decisao.

        So e chamado ao criar uma OS pela API (sempre com solicitante: o
        usuario autenticado); OS geradas pelo sistema usam notificar_os_sistema.
        """
        if not ordem.requer_aprovacao_admin:
            return

        solicitante = ordem.solicitante
        admins = Usuario.objects.filter(
            perfil=Usuario.Perfil.ADMIN,
            id_empresa=solicitante.id_empresa,
            is_active=True,
        ).exclude(pk=solicitante.pk)

        Notificacao.objects.bulk_create(
            NotificacaoService._nova(
                admin,
                ordem,
                Notificacao.Tipo.OS_ABERTA,
                f"OS #{ordem.id_os} aguardando aprovação",
                f"{solicitante.nome} abriu uma OS: {ordem.titulo}",
            )
            for admin in admins
        )

    @staticmethod
    def notificar_os_sistema(ordem: OrdemServico) -> None:
        """Avisa os admins da empresa do equipamento que o sistema gerou uma
        OS (ex.: preventiva agendada) que aguarda decisao. Sem isso a OS fica
        parada na fila, porque nao ha solicitante para disparar o aviso."""
        if not ordem.requer_aprovacao_admin or ordem.id_equipamento is None:
            return

        empresa_id = ordem.id_equipamento.empresa_id
        if empresa_id is None:
            return

        admins = Usuario.objects.filter(
            perfil=Usuario.Perfil.ADMIN,
            id_empresa_id=empresa_id,
            is_active=True,
        )

        Notificacao.objects.bulk_create(
            NotificacaoService._nova(
                admin,
                ordem,
                Notificacao.Tipo.OS_ABERTA,
                f"OS #{ordem.id_os} aguardando aprovação",
                f"Gerada automaticamente pelo sistema: {ordem.titulo}",
            )
            for admin in admins
        )

    @staticmethod
    def notificar_aprovacao(
        ordem: OrdemServico, tecnico_vinculo: UsuarioSetor | None = None
    ) -> None:
        """Notifica solicitante e tecnico quando uma OS e aprovada.

        OS geradas pelo sistema (preventiva/IoT) nao tem solicitante.
        """
        if ordem.solicitante is not None:
            mensagem = "Sua ordem de servico foi aprovada pelo administrador."
            if tecnico_vinculo is not None:
                mensagem = (
                    "Sua ordem de servico foi aprovada e atribuida ao tecnico "
                    f"{tecnico_vinculo.id_usuario.nome}."
                )

            NotificacaoService._criar(
                ordem.solicitante,
                ordem,
                Notificacao.Tipo.OS_ATUALIZADA,
                f"OS #{ordem.id_os} aprovada",
                mensagem,
            )

        if tecnico_vinculo is not None:
            NotificacaoService._criar(
                tecnico_vinculo.id_usuario,
                ordem,
                Notificacao.Tipo.OS_ATUALIZADA,
                f"Nova OS #{ordem.id_os} atribuida",
                f"Prioridade {ordem.prioridade}. {ordem.titulo}",
            )

    @staticmethod
    def notificar_rejeicao(ordem: OrdemServico) -> None:
        """Notifica o solicitante quando uma OS e rejeitada."""
        if ordem.solicitante is not None:
            NotificacaoService._criar(
                ordem.solicitante,
                ordem,
                Notificacao.Tipo.OS_ATUALIZADA,
                f"OS #{ordem.id_os} rejeitada",
                "Sua ordem de servico foi rejeitada pelo administrador.",
            )

    @staticmethod
    def notificar_reabertura(ordem: OrdemServico) -> None:
        """Notifica o solicitante quando uma OS e reaberta."""
        if ordem.solicitante is not None:
            NotificacaoService._criar(
                ordem.solicitante,
                ordem,
                Notificacao.Tipo.OS_ATUALIZADA,
                f"OS #{ordem.id_os} reaberta",
                "Sua ordem de servico foi reaberta pelo administrador.",
            )

    @staticmethod
    def notificar_conclusao(ordem: OrdemServico) -> None:
        """Notifica o solicitante quando uma OS e concluida."""
        if ordem.solicitante is not None:
            NotificacaoService._criar(
                ordem.solicitante,
                ordem,
                Notificacao.Tipo.OS_CONCLUIDA,
                f"OS #{ordem.id_os} concluida",
                "Sua ordem de servico foi concluida pelo tecnico.",
            )
