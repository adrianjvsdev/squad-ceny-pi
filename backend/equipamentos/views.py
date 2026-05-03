from rest_framework import viewsets, permissions
from .models import Equipamento, TipoEquipamento
from .serializers import EquipamentoSerializer, TipoEquipamentoSerializer


class TipoEquipamentoViewSet(viewsets.ModelViewSet):
    queryset = TipoEquipamento.objects.all()
    serializer_class = TipoEquipamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


class EquipamentoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.perfil == "admin":
            return Equipamento.objects.select_related("id_setor", "id_tipo").all()
        # Filtra equipamentos dos setores que o usuário tem acesso
        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return Equipamento.objects.select_related("id_setor", "id_tipo").filter(
            id_setor__in=setores_ids
        )