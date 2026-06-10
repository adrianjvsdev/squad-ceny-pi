from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import gerar_relatorio


class RelatorioConfiabilidadeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.id_empresa_id:
            return Response(
                {
                    "detail": (
                        "Seu usuario nao esta vinculado a uma empresa. "
                        "Relatorios so estao disponiveis para contas com empresa."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dados = gerar_relatorio(
                request.user,
                data_inicio=request.query_params.get("data_inicio"),
                data_fim=request.query_params.get("data_fim"),
                setor_id=request.query_params.get("setor_id"),
                equipamento_id=request.query_params.get("equipamento_id"),
            )
        except PermissionError as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(dados)
