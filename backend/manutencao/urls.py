from rest_framework.routers import DefaultRouter
from .views import PlanoManutencaoViewSet, IoTStatusViewSet

router = DefaultRouter()
router.register(r"planos-manutencao", PlanoManutencaoViewSet, basename="plano-manutencao")
router.register(r"iot-status", IoTStatusViewSet, basename="iot-status")

urlpatterns = router.urls