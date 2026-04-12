from django.db import models

# class StatusChoices(models.TextChoices):
#     PENDENTE = 'P', 'Pendente'
#     PROCESSANDO = 'PR', 'Processando'
#     CONCLUIDO = 'C', 'Concluído'
#     CANCELADO = 'X', 'Cancelado'

# class Priorities(models.TextChoices):
#     NOW = '0', 'Agora'
#     HIGH = '1', 'Alta'
#     MEDIUM = '2', 'Média'
#     LOW = '3', 'Baixa'

# class OrdemServico(models.Model):
#     id_ordem_servico = models.BigAutoField(primary_key=True)
#     titulo = models.DecimalField(max_length=100)
#     descricao = models.IntegerField(max_length=200)
#     prioridade = models.CharField(
#         max_length=2,
#         choices=Priorities.choices,
#         default=Priorities.LOW,
#     )
#     status = models.CharField(
#         max_length=2,
#         choices=StatusChoices.choices,
#         default=StatusChoices.PENDENTE,
#     )
#     tipo_manutencao = models.CharField(max_length=200)
#     custo = models.CharField(max_length=200)
#     data_abertura = models.CharField(max_length=200)
#     data_inicio = models.CharField(max_length=200)
#     data_fim = models.CharField(max_length=200)
#     relatorio_intervencao = models.CharField(max_length=200)
#     timestamp_retorno_operacao = models.CharField(max_length=200)
#     id_solicitante = models.CharField(max_length=200)
#     id_tecnico = models.CharField(max_length=200)
#     id_equipamento = models.CharField(max_length=200)

#     def __str__(self):
#         return self.nome
