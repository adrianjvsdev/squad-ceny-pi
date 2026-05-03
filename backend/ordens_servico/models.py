from django.db import models
from django.conf import settings
from equipamentos.models import Equipamento


class OrdemServico(models.Model):
    class Prioridade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"
        CRITICA = "critica", "Crítica"

    class Status(models.TextChoices):
        ABERTA = "aberta", "Aberta"
        EM_ANDAMENTO = "em_andamento", "Em Andamento"
        CONCLUIDA = "concluida", "Concluída"
        CANCELADA = "cancelada", "Cancelada"

    class TipoManutencao(models.TextChoices):
        PREDITIVA = "preditiva", "Preditiva"
        PREVENTIVA = "preventiva", "Preventiva"
        CORRETIVA = "corretiva", "Corretiva"

    id_os = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=300)
    descricao = models.TextField(blank=True, null=True)
    prioridade = models.CharField(
        max_length=10,
        choices=Prioridade.choices,
        default=Prioridade.MEDIA,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ABERTA,
    )
    tipo_manutencao = models.CharField(
        max_length=20,
        choices=TipoManutencao.choices,
    )
    custo = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    data_abertura = models.DateTimeField(auto_now_add=True)
    data_inicio = models.DateTimeField(blank=True, null=True)
    data_fim = models.DateTimeField(blank=True, null=True)
    relatorio_intervencao = models.TextField(blank=True, null=True)
    timestamp_retorno_operacao = models.DateTimeField(blank=True, null=True)

    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ordens_solicitadas",
        db_column="id_solicitante",
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_atribuidas",
        db_column="id_tecnico",
    )
    id_equipamento = models.ForeignKey(
        Equipamento,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ordens_servico",
        db_column="id_equipamento",
    )

    class Meta:
        db_table = "ordens_servico"
        ordering = ["-data_abertura"]

    def __str__(self):
        return f"OS#{self.id_os} - {self.titulo}"