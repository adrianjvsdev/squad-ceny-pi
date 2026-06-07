from rest_framework import viewsets, permissions
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.perfil == "admin":
            # Admin vê todos os equipamentos da sua empresa
            return Equipamento.objects.filter(
                id_setor__id_empresa=usuario.id_empresa
            ).select_related("id_setor", "id_tipo")
        # Filtra equipamentos dos setores que o usuário tem acesso
        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return Equipamento.objects.select_related("id_setor", "id_tipo").filter(
            id_setor__in=setores_ids
        )