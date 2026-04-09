from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,   # POST /api/token/ → recebe login/senha, devolve access+refresh
    TokenRefreshView,      # POST /api/token/refresh/ → recebe refresh, devolve novo access
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Rotas JWT de autenticação
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Rotas do nosso app "api"
    path("api/", include("api.urls")),
]