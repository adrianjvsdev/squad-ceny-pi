from django.contrib.auth.models import update_last_login
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action

from .models import Usuario, UsuarioSetor
from .permissions import IsAdmin
from .serializers import (
    RegistroSerializer,
    UsuarioAutoEdicaoSerializer,
    UsuarioSerializer,
    UsuarioSetorSerializer,
)
from .token import CenyTokenObtainPairSerializer


class RegistroView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.save()
        update_last_login(None, usuario)

        # Mesmas claims do login; o access herda as claims do refresh.
        refresh = CenyTokenObtainPairSerializer.get_token(usuario)

        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_201_CREATED,
        )


class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class   = UsuarioSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Usuario.objects.filter(id_empresa=self.request.user.id_empresa)

    def get_serializer_class(self):
        if self.action == "update_profile":
            return UsuarioAutoEdicaoSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)  # ← linha adicionada

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(self.get_serializer(request.user).data)

    @action(detail=False, methods=["put", "patch"], permission_classes=[permissions.IsAuthenticated])
    def update_profile(self, request):
        """Ação para o usuário atualizar o próprio perfil (cadastro) — o
        cargo (Usuario.perfil) não pode ser alterado por aqui."""
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsuarioSetorViewSet(viewsets.ModelViewSet):
    serializer_class   = UsuarioSetorSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return UsuarioSetor.objects.select_related("id_usuario", "id_setor").filter(
            id_usuario__id_empresa=self.request.user.id_empresa  # ← filtra por empresa também
        )
