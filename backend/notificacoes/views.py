from rest_framework import viewsets, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notificacao, LogAuditoria
from .serializers import NotificacaoSerializer, LogAuditoriaSerializer


class NotificacaoViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Notificações não têm endpoint de criação via API —
    são criadas internamente pelo sistema (signals/services).
    Permite listar, detalhar, marcar como lida e deletar.
    """

    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Cada usuário vê apenas as próprias notificações
        return Notificacao.objects.filter(id_usuario=self.request.user).select_related(
            "id_os"
        )

    @action(detail=True, methods=["patch"], url_path="marcar-lida")
    def marcar_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save(update_fields=["lida"])
        return Response({"status": "notificação marcada como lida"})

    @action(detail=False, methods=["patch"], url_path="marcar-todas-lidas")
    def marcar_todas_lidas(self, request):
        self.get_queryset().filter(lida=False).update(lida=True)
        return Response({"status": "todas as notificações marcadas como lidas"})


class LogAuditoriaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Log de auditoria é somente leitura e restrito a administradores.
    A escrita ocorre internamente via signals do Django.
    """

    serializer_class = LogAuditoriaSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = LogAuditoria.objects.select_related("id_usuario").all()