from django.db import models
from django.conf import settings
from ordens_servico.models import OrdemServico


class Notificacao(models.Model):
    class Tipo(models.TextChoices):
        OS_ABERTA = "os_aberta", "OS Aberta"
        OS_ATUALIZADA = "os_atualizada", "OS Atualizada"
        OS_CONCLUIDA = "os_concluida", "OS Concluída"
        PLANO_VENCENDO = "plano_vencendo", "Plano Vencendo"

    class Canal(models.TextChoices):
        PUSH = "push", "Push Notification"
        EMAIL = "email", "E-mail"

    id_notificacao = models.AutoField(primary_key=True)
    id_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificacoes",
        db_column="id_usuario",
    )
    id_os = models.ForeignKey(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notificacoes",
        db_column="id_os",
    )
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    canal = models.CharField(max_length=10, choices=Canal.choices, default=Canal.PUSH)
    timestamp_envio = models.DateTimeField(auto_now_add=True)
    lida = models.BooleanField(default=False)

    class Meta:
        db_table = "notificacoes"
        ordering = ["-timestamp_envio"]

    def __str__(self):
        return f"Notif #{self.id_notificacao} → {self.id_usuario} ({self.tipo})"


class LogAuditoria(models.Model):
    id_log = models.AutoField(primary_key=True)
    id_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="logs_auditoria",
        db_column="id_usuario",
    )
    acao = models.TextField()
    tabela_afetada = models.CharField(max_length=100)
    id_registro_afetado = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "logs_auditoria"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Log #{self.id_log} - {self.tabela_afetada} ({self.timestamp:%Y-%m-%d %H:%M})"