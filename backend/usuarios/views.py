from rest_framework import viewsets, permissions
from .models import Usuario, UsuarioSetor
from .serializers import UsuarioSerializer, UsuarioSetorSerializer


class IsAdminOrGestor(permissions.BasePermission):
    """Apenas admins ou gestores podem gerenciar associações usuário-setor."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.perfil in ("admin", "gestor")

class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminOrGestor]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.perfil == "admin":
            return Usuario.objects.all()
        # Gestores só veem usuários da própria empresa
        return Usuario.objects.filter(id_empresa=usuario.id_empresa)

class UsuarioSetorViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioSetorSerializer
    permission_classes = [IsAdminOrGestor]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.perfil == "admin":
            return UsuarioSetor.objects.select_related("id_usuario", "id_setor").all()
        # Gestores só veem associações dos setores da própria empresa
        return UsuarioSetor.objects.select_related("id_usuario", "id_setor").filter(
            id_setor__id_empresa=usuario.id_empresa
        )