from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])  # Exige token JWT válido
def dashboard_view(request):
    return Response({
        "message": "Você está autenticado!",
        "user": request.user.username,
    })