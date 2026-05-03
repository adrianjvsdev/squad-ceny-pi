from django.db import models

class Empresa(models.Model):
    id_empresa = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=200)
    cnpj = models.CharField(max_length=18, unique=True)
    email = models.EmailField(unique=True)
    telefone = models.CharField(max_length=20)
    data_cadastro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas"

    def __str__(self):
        return self.nome


class Setor(models.Model):
    id_setor = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=200)
    id_empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="setores",
        db_column="id_empresa",
    )

    class Meta:
        db_table = "setores"

    def __str__(self):
        return f"{self.nome} ({self.id_empresa.nome})"