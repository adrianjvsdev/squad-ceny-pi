# notificacoes/admin.py
from django.contrib import admin
from .models import Notificacao

@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ["id_notificacao", "id_usuario", "tipo", "lida", "timestamp_envio"]