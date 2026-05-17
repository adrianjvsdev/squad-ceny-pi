from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/", include("api.urls")),
    path("api/", include("empresas.urls")),
    path("api/", include("usuarios.urls")),
    path("api/", include("equipamentos.urls")),
    path("api/", include("ordens_servico.urls")),
    path("api/", include("manutencao.urls")),
    path("api/", include("notificacoes.urls")), 
]