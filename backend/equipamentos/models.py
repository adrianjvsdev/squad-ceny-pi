from django.db import models
from empresas.models import Setor

class TipoEquipamento(models.Model):
    id_tipo = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "tipos_equipamento"

    def __str__(self):
        return self.nome


class Equipamento(models.Model):
    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"
        EM_MANUTENCAO = "em_manutencao", "Em Manutenção"

    id_equipamento = models.AutoField(primary_key=True)
    tag = models.CharField(max_length=100, unique=True)
    nome = models.CharField(max_length=200)
    fabricante = models.CharField(max_length=200, blank=True, null=True)
    modelo = models.CharField(max_length=200, blank=True, null=True)
    data_instalacao = models.DateField(blank=True, null=True)
    data_entrada_operacao = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVO,
    )
    id_setor = models.ForeignKey(
        Setor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipamentos",
        db_column="id_setor",
    )
    id_tipo = models.ForeignKey(
        TipoEquipamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipamentos",
        db_column="id_tipo",
    )

    class Meta:
        db_table = "equipamentos"

    def __str__(self):
        return f"{self.tag} - {self.nome}"