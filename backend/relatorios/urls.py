from django.urls import path

from .views import RelatorioConfiabilidadeView

urlpatterns = [
    path(
        "relatorios/confiabilidade/",
        RelatorioConfiabilidadeView.as_view(),
        name="relatorio-confiabilidade",
    ),
]
