from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CenyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Estende o payload padrão do JWT para incluir
    os campos que o frontend precisa ler sem fazer
    uma requisição extra ao backend.

    Também atualiza o last_login do usuário a cada
    autenticação bem-sucedida (o SimpleJWT não faz
    isso automaticamente quando UPDATE_LAST_LOGIN
    não está configurado no settings).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Campos extras embutidos no JWT
        token["perfil"] = user.perfil
        token["nome"] = user.nome
        token["email"] = user.email
        token["id_empresa"] = (
            user.id_empresa.id_empresa if user.id_empresa else None
        )

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Atualiza last_login no banco após autenticação bem-sucedida
        update_last_login(None, self.user)

        # Recarrega o campo atualizado
        self.user.refresh_from_db(fields=["last_login"])

        # Expõe o last_login no retorno da autenticação
        data["last_login"] = self.user.last_login

        return data


class CenyTokenObtainPairView(TokenObtainPairView):
    serializer_class = CenyTokenObtainPairSerializer