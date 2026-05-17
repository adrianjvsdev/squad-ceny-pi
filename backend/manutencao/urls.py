from rest_framework.routers import DefaultRouter
from .views import PlanoManutencaoViewSet

router = DefaultRouter()
router.register(r"planos-manutencao", PlanoManutencaoViewSet, basename="plano-manutencao")

urlpatterns = router.urls