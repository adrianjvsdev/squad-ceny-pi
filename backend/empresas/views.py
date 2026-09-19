from rest_framework import viewsets, permissions
from usuarios.permissions import IsAdmin
from .models import Empresa, Setor
from .serializers import EmpresaSerializer, SetorSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    serializer_class = EmpresaSerializer

    def get_permissions(self):
        # Qualquer usuário lê a própria empresa; só o admin altera.
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        return Empresa.objects.filter(pk=self.request.user.id_empresa_id)


class SetorViewSet(viewsets.ModelViewSet):
    serializer_class = SetorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        # Todos os usuários veem apenas setores da sua empresa
        return Setor.objects.filter(id_empresa=usuario.id_empresa)

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)
