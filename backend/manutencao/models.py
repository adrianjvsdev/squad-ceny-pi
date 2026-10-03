from django.db import models
from equipamentos.models import Equipamento
from empresas.models import Setor
from usuarios.models import Usuario


class PlanoManutencaoQuerySet(models.QuerySet):
    def visiveis_para(self, usuario):
        """Admin ve os planos dos equipamentos da empresa; os demais, so os
        planos dos setores em que estao vinculados."""
        queryset = self.select_related("id_equipamento", "id_setor")
        if usuario.perfil == Usuario.Perfil.ADMIN:
            return queryset.filter(id_equipamento__id_setor__id_empresa=usuario.id_empresa)

        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return queryset.filter(id_setor__in=setores_ids)


class PlanoManutencao(models.Model):
    class Tipo(models.TextChoices):
        PREVENTIVA = "preventiva", "Preventiva"
        PREDITIVA = "preditiva", "Preditiva"

    id_plano = models.AutoField(primary_key=True)
    descricao = models.CharField(max_length=500)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    periodicidade_dias = models.PositiveIntegerField()
    proxima_execucao = models.DateField()
    id_equipamento = models.ForeignKey(
        Equipamento,
        on_delete=models.CASCADE,
        related_name="planos_manutencao",
        db_column="id_equipamento",
    )
    id_setor = models.ForeignKey(
        Setor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planos_manutencao",
        db_column="id_setor",
    )
    ultima_manutencao = models.DateTimeField(blank=True, null=True)

    objects = PlanoManutencaoQuerySet.as_manager()

    class Meta:
        db_table = "planos_manutencao"
        ordering = ["proxima_execucao"]

    def __str__(self):
        return f"Plano #{self.id_plano} - {self.id_equipamento.tag} ({self.tipo})"
    
class AnomaliaIoT(models.Model):
    class Severidade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"

    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50)
    valor = models.FloatField()
    valor_limite = models.FloatField()
    severidade = models.CharField(max_length=10, choices=Severidade.choices)
    detectada_em = models.DateTimeField(auto_now_add=True)
    os_gerada = models.OneToOneField(
        'ordens_servico.OrdemServico',
        null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "anomalia_iot"
    
    def __str__(self):
        return f"{self.tipo} - {self.equipamento.tag} ({self.severidade})"

        