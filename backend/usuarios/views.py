from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario, UsuarioSetor
from .serializers import UsuarioSerializer, UsuarioSetorSerializer, RegistroSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.perfil == "admin"


class RegistroView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        usuario = serializer.save()

        refresh = RefreshToken.for_user(usuario)
        refresh["perfil"]     = usuario.perfil
        refresh["nome"]       = usuario.nome
        refresh["email"]      = usuario.email
        refresh["id_empresa"] = usuario.id_empresa.id_empresa if usuario.id_empresa else None

        access = refresh.access_token
        access["perfil"]     = usuario.perfil
        access["nome"]       = usuario.nome
        access["email"]      = usuario.email
        access["id_empresa"] = usuario.id_empresa.id_empresa if usuario.id_empresa else None

        return Response(
            {"access": str(access), "refresh": str(refresh)},
            status=status.HTTP_201_CREATED,
        )


class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class   = UsuarioSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Usuario.objects.filter(id_empresa=self.request.user.id_empresa)

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)  # ← linha adicionada


class UsuarioSetorViewSet(viewsets.ModelViewSet):
    serializer_class   = UsuarioSetorSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return UsuarioSetor.objects.select_related("id_usuario", "id_setor").filter(
            id_usuario__id_empresa=self.request.user.id_empresa  # ← filtra por empresa também
        )