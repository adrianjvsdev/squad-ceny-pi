from rest_framework import viewsets, permissions
from usuarios.permissions import IsAdmin
from .models import Equipamento, TipoEquipamento
from .serializers import EquipamentoSerializer, TipoEquipamentoSerializer


class TipoEquipamentoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoEquipamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        # Todos os usuários veem apenas tipos de sua empresa
        return TipoEquipamento.objects.filter(id_empresa=usuario.id_empresa)

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)


class EquipamentoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipamentoSerializer

    def get_permissions(self):
        # Qualquer usuário lê os equipamentos que enxerga; só o admin cria,
        # edita (inclusive desativa) ou exclui.
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        return Equipamento.objects.visiveis_para(self.request.user)