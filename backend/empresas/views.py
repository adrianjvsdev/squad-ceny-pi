from django.db import transaction
from rest_framework import mixins, viewsets, permissions
from equipamentos.models import Equipamento
from usuarios.permissions import IsAdmin
from .models import Empresa, Setor
from .serializers import EmpresaSerializer, SetorSerializer


class EmpresaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Empresas não têm criação nem exclusão via API: a empresa nasce junto
    com o admin no registro (/api/registro/) e não há caso de uso para
    apagá-la por aqui. POST e DELETE respondem 405.
    """

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

    def get_permissions(self):
        # Qualquer usuário lê os setores da empresa; só o admin cria, edita
        # (inclusive desativa) ou exclui.
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        usuario = self.request.user
        # Todos os usuários veem apenas setores da sua empresa
        return Setor.objects.filter(id_empresa=usuario.id_empresa)

    def perform_create(self, serializer):
        serializer.save(id_empresa=self.request.user.id_empresa)

    @transaction.atomic
    def perform_update(self, serializer):
        setor = serializer.save()
        # Setor inativo não mantém equipamentos operando (eles gerariam OS
        # preventivas e alertas IoT). Reativar o setor não reativa os equipamentos.
        if not setor.ativo:
            setor.equipamentos.exclude(status=Equipamento.Status.INATIVO).update(
                status=Equipamento.Status.INATIVO
            )
