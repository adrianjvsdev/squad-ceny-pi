from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from notificacoes.services import NotificacaoService

from .models import OrdemServico
from .serializers import (
    EquipamentoTriagemSerializer,
    OrdemServicoSerializer,
    TriagemResultadoSerializer,
    TriagemTextoSerializer,
)
from .services import OrdemServicoService
from .triagem_ia import (
    EquipamentoAmbiguo,
    EquipamentoNaoIdentificado,
    RespostaIAInvalida,
    TriagemIAErro,
    interpretar_texto,
)


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
        return OrdemServico.objects.visiveis_para(self.request.user).select_related(
            "triagem_ia"
        )

    def perform_create(self, serializer):
        # Solicitante e sempre o usuario autenticado.
        ordem = serializer.save(solicitante=self.request.user)
        NotificacaoService.notificar_abertura(ordem)

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


class TriagemIAPreviewView(APIView):
    """Interpreta um relato livre e devolve a triagem para revisao.

    Nunca cria a OS: o usuario revisa e confirma pelo POST
    /api/ordens-servico/, reenviando a triagem no bloco opcional triagem_ia.
    Mesma permissao de quem abre OS hoje (qualquer usuario autenticado), com
    limite por usuario para respeitar a cota do Gemini.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "triagem_ia"

    def post(self, request):
        entrada = TriagemTextoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        try:
            resultado = interpretar_texto(entrada.validated_data["texto"], request.user)
        except TriagemIAErro as erro:
            return self._erro(erro)
        return Response(TriagemResultadoSerializer(resultado).data, status=status.HTTP_200_OK)

    def _erro(self, erro):
        corpo = {"detail": str(erro), "codigo": erro.codigo}
        if isinstance(erro, EquipamentoAmbiguo):
            corpo["candidatos"] = EquipamentoTriagemSerializer(erro.candidatos, many=True).data

        if isinstance(erro, (EquipamentoNaoIdentificado, EquipamentoAmbiguo)):
            codigo_http = status.HTTP_400_BAD_REQUEST
        elif isinstance(erro, RespostaIAInvalida):
            codigo_http = status.HTTP_502_BAD_GATEWAY
        else:  # IAIndisponivel / LimiteIAAtingido
            codigo_http = status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(corpo, status=codigo_http)
