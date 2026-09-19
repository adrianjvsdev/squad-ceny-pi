from django.contrib.auth.models import update_last_login
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action

from .models import Usuario, UsuarioSetor
from .permissions import IsAdmin
from .serializers import UsuarioSerializer, UsuarioSetorSerializer, RegistroSerializer
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

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)  # ← linha adicionada

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(self.get_serializer(request.user).data)

    @action(detail=False, methods=["put", "patch"], permission_classes=[permissions.IsAuthenticated])
    def update_profile(self, request):
        """Ação para o usuário atualizar seu próprio perfil"""
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
