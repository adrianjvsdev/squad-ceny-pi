from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, UsuarioSetorViewSet

router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuario")
router.register(r"usuario-setor", UsuarioSetorViewSet, basename="usuario-setor")

urlpatterns = router.urls