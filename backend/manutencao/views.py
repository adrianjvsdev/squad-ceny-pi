from rest_framework import viewsets, permissions, status
from .models import PlanoManutencao, AnomaliaIoT
from .serializers import PlanoManutencaoSerializer, AnomaliaIoTSerializer,IoTStatusSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from equipamentos.models import Equipamento
import random
from django.utils import timezone

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
        if not equipamento.tem_iot:
            return Response({
                "id_equipamento": equipamento.id_equipamento,
                "tag": equipamento.tag,
                "nome": equipamento.nome,
                "tem_iot": False,
                "temperatura": None,
                "rpm": None,
                "pressao": None,
                "anomalias_recentes": [],
                "status_geral": "desabilitado"
            })

        temperatura = round(random.uniform(20, 100), 1)
        rpm = round(random.uniform(1000, 3600), 0)
        pressao = round(random.uniform(2.0, 15.0), 1)

        # Obtém anomalias recentes
        anomalias_recentes = AnomaliaIoT.objects.filter(
            equipamento=equipamento
        ).order_by("-detectada_em")[:10]

        if anomalias_recentes.exists():
            severidades = [a.severidade for a in anomalias_recentes]
            if "alta" in severidades:
                status_geral = "critico"
            elif "media" in severidades:
                status_geral = "alerta"
            else:
                status_geral = "normal"
        else:
            status_geral = "normal"

        data = {
            "id_equipamento": equipamento.id_equipamento,
            "tag": equipamento.tag,
            "nome": equipamento.nome,
            "tem_iot": True,
            "temperatura": temperatura,
            "rpm": rpm,
            "pressao": pressao,
            "anomalias_recentes": AnomaliaIoTSerializer(anomalias_recentes, many=True).data,
            "status_geral": status_geral
        }

        return Response(data)
