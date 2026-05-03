from rest_framework.routers import DefaultRouter
from .views import NotificacaoViewSet, LogAuditoriaViewSet

router = DefaultRouter()
router.register(r"notificacoes", NotificacaoViewSet, basename="notificacao")
router.register(r"logs-auditoria", LogAuditoriaViewSet, basename="log-auditoria")

urlpatterns = router.urls