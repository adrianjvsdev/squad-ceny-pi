from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrdemServicoViewSet, TriagemIAPreviewView

router = DefaultRouter()
router.register(r"ordens-servico", OrdemServicoViewSet, basename="ordem-servico")

# Antes do router: senao "triagem-ia" casaria com a rota de detalhe {pk}.
urlpatterns = [
    path(
        "ordens-servico/triagem-ia/",
        TriagemIAPreviewView.as_view(),
        name="ordem-servico-triagem-ia",
    ),
    *router.urls,
]
