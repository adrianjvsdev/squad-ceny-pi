from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CenyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Estende o payload padrão do JWT para incluir
    os campos que o frontend precisa ler sem fazer
    uma requisição extra ao backend.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Campos extras embutidos no JWT
        token["perfil"] = user.perfil          # "admin" | "gestor" | "operador"
        token["nome"] = user.nome
        token["email"] = user.email
        token["id_empresa"] = (
            user.id_empresa.id_empresa if user.id_empresa else None
        )

        return token


class CenyTokenObtainPairView(TokenObtainPairView):
    serializer_class = CenyTokenObtainPairSerializer