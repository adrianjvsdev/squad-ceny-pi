from rest_framework import viewsets, permissions
from .models import Empresa, Setor
from .serializers import EmpresaSerializer, SetorSerializer
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]
class SetorViewSet(viewsets.ModelViewSet):
    serializer_class = SetorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.perfil == "admin":
            return Setor.objects.all()
        return Setor.objects.filter(id_empresa=usuario.id_empresa)