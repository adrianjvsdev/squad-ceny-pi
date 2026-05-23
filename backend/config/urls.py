from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from usuarios.token import CenyTokenObtainPairView
from usuarios.views import RegistroView

urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Auth JWT ──────────────────────────────────────────────────
    path("api/token/",         CenyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),        name="token_refresh"),
    path("api/token/verify/",  TokenVerifyView.as_view(),         name="token_verify"),

    # ── Registro público ──────────────────────────────────────────
    path("api/registro/",      RegistroView.as_view(),            name="registro"),

    # ── Apps ──────────────────────────────────────────────────────
    path("api/", include("api.urls")),
    path("api/", include("empresas.urls")),
    path("api/", include("usuarios.urls")),
    path("api/", include("equipamentos.urls")),
    path("api/", include("ordens_servico.urls")),
    path("api/", include("manutencao.urls")),
    path("api/", include("notificacoes.urls")),
]