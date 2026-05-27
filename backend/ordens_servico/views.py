from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import OrdemServicoSerializer
from .services import OrdemServicoService


MSG_APROVAR_ADMIN = "Apenas administradores podem aprovar ordens de servico."
MSG_REJEITAR_ADMIN = "Apenas administradores podem rejeitar ordens de servico."
MSG_REABRIR_ADMIN = "Apenas administradores podem reabrir ordens de servico."
MSG_INICIAR_TECNICO = "Apenas o tecnico atribuido pode iniciar esta OS."
MSG_CONCLUIR_TECNICO = "Apenas o tecnico atribuido pode concluir esta OS."
MSG_DESATIVAR_ADMIN = "Apenas administradores podem desativar ordens de servico."


class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OrdemServicoService.listar_para_usuario(self.request.user)

    def _bad_request(self, erro):
        return Response({"detail": str(erro)}, status=status.HTTP_400_BAD_REQUEST)

    def _forbidden(self, mensagem):
        return Response({"detail": mensagem}, status=status.HTTP_403_FORBIDDEN)

    def _ok(self, ordem):
        return Response(self.get_serializer(ordem).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="aprovar")
    def aprovar(self, request, pk=None):
        if not OrdemServicoService.usuario_e_admin(request.user):
            return self._forbidden(MSG_APROVAR_ADMIN)
        try:
            ordem = OrdemServicoService.aprovar(
                self.get_object(), request.user, request.data.get("tecnico_id")
            )
        except ValueError as erro:
            return self._bad_request(erro)
        return self._ok(ordem)

    @action(detail=True, methods=["patch"], url_path="rejeitar")
    def rejeitar(self, request, pk=None):
        if not OrdemServicoService.usuario_e_admin(request.user):
            return self._forbidden(MSG_REJEITAR_ADMIN)
        try:
            ordem = OrdemServicoService.rejeitar(self.get_object())
        except ValueError as erro:
            return self._bad_request(erro)
        return self._ok(ordem)

    @action(detail=True, methods=["patch"], url_path="reabrir")
    def reabrir(self, request, pk=None):
        if not OrdemServicoService.usuario_e_admin(request.user):
            return self._forbidden(MSG_REABRIR_ADMIN)
        try:
            ordem = OrdemServicoService.reabrir(self.get_object())
        except ValueError as erro:
            return self._bad_request(erro)
        return self._ok(ordem)

    @action(detail=True, methods=["patch"], url_path="iniciar")
    def iniciar(self, request, pk=None):
        ordem = self.get_object()
        if not OrdemServicoService.tecnico_atribuido(request.user, ordem):
            return self._forbidden(MSG_INICIAR_TECNICO)
        try:
            ordem = OrdemServicoService.iniciar(ordem)
        except ValueError as erro:
            return self._bad_request(erro)
        return self._ok(ordem)

    @action(detail=True, methods=["patch"], url_path="concluir")
    def concluir(self, request, pk=None):
        ordem = self.get_object()
        if not OrdemServicoService.tecnico_atribuido(request.user, ordem):
            return self._forbidden(MSG_CONCLUIR_TECNICO)
        try:
            ordem = OrdemServicoService.concluir(
                ordem,
                request.data.get("relatorio_intervencao"),
                request.data.get("proxima_manutencao"),
            )
        except ValueError as erro:
            return self._bad_request(erro)
        return self._ok(ordem)

    @action(detail=False, methods=["patch"], url_path="desativar-abertas")
    def desativar_abertas(self, request):
        if not OrdemServicoService.usuario_e_admin(request.user):
            return self._forbidden(MSG_DESATIVAR_ADMIN)
        afetadas = OrdemServicoService.desativar_abertas(self.get_queryset())
        return Response(
            {"status": "ok", "ordens_desativadas": afetadas},
            status=status.HTTP_200_OK,
        )
