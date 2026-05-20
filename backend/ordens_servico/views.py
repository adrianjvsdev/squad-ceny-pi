from rest_framework import viewsets, permissions
from .models import OrdemServico
from .serializers import OrdemServicoSerializer


class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        qs = OrdemServico.objects.select_related(
            "solicitante", "tecnico", "id_equipamento"
        )
        if usuario.perfil == "admin":
            return qs.all()

        # Filtra OSs dos equipamentos nos setores que o usuário tem acesso
        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return qs.filter(id_equipamento__id_setor__in=setores_ids)