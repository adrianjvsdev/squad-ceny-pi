from rest_framework.routers import DefaultRouter
from .views import EquipamentoViewSet, TipoEquipamentoViewSet

router = DefaultRouter()
router.register(r"tipos-equipamento", TipoEquipamentoViewSet, basename="tipo-equipamento")
router.register(r"equipamentos", EquipamentoViewSet, basename="equipamento")

urlpatterns = router.urls