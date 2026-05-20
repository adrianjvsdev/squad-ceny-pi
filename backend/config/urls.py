"""
Substitua o seu config/urls.py por este arquivo.
A única mudança é trocar TokenObtainPairView pelo CenyTokenObtainPairView,
que inclui perfil, nome e email no payload do JWT.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from usuarios.token import CenyTokenObtainPairView   # ← customizado

urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Auth JWT ──────────────────────────────────────────────────
    path("api/token/",         CenyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),        name="token_refresh"),
    path("api/token/verify/",  TokenVerifyView.as_view(),         name="token_verify"),

    # ── Apps ──────────────────────────────────────────────────────
    path("api/", include("api.urls")),
    path("api/", include("usuarios.urls")),
    path("api/", include("empresas.urls")),
    # path("api/", include("ordens_de_servico.urls")),
    # adicione os demais apps conforme forem criados
]