from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet, SetorViewSet

router = DefaultRouter()
router.register(r"empresas", EmpresaViewSet, basename="empresa")
router.register(r"setores", SetorViewSet, basename="setor")

urlpatterns = router.urls