from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from equipamentos.models import Equipamento

from .iot_Mock import ler_sensores
from .models import PlanoManutencao, AnomaliaIoT
from .serializers import PlanoManutencaoSerializer, IoTStatusSerializer
from .services import calcular_status_geral


class PlanoManutencaoViewSet(viewsets.ModelViewSet):
    serializer_class = PlanoManutencaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        qs = PlanoManutencao.objects.select_related("id_equipamento", "id_setor")
        if usuario.perfil == "admin":
            return qs.all()

        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return qs.filter(id_setor__in=setores_ids)


class IoTStatusViewSet(viewsets.ViewSet):
    """
    Retorna:
    - temperatura, rpm, pressão (simulados)
    - anomalias recentes
    - status geral (normal, alerta, crítico)
    """
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """
        Retorna dados IoT simulados para um equipamento específico.
        Incluindo: temperatura, rpm, pressão e anomalias recentes.
        """
        try:
            equipamento = Equipamento.objects.get(id_equipamento=pk)
        except Equipamento.DoesNotExist:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        # se não tiver Iot retorna nulo
        dados = {
            "id_equipamento": equipamento.id_equipamento,
            "tag": equipamento.tag,
            "nome": equipamento.nome,
            "tem_iot": equipamento.tem_iot,
            "temperatura": None,
            "rpm": None,
            "pressao": None,
            "anomalias_recentes": [],
            "status_geral": "desabilitado",
        }

        if equipamento.tem_iot:
            anomalias_recentes = list(
                AnomaliaIoT.objects.filter(equipamento=equipamento).order_by(
                    "-detectada_em"
                )[:10]
            )
            dados.update(
                ler_sensores(),
                anomalias_recentes=anomalias_recentes,
                status_geral=calcular_status_geral(anomalias_recentes),
            )

        return Response(IoTStatusSerializer(dados).data)
