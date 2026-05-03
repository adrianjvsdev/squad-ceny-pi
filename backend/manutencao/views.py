from rest_framework import viewsets, permissions
from .models import PlanoManutencao
from .serializers import PlanoManutencaoSerializer


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