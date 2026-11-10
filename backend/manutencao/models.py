from django.db import models
from equipamentos.models import Equipamento
from empresas.models import Setor
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario, UsuarioSetor


class PlanoManutencaoQuerySet(models.QuerySet):
    def visiveis_para(self, usuario):
        """Admin ve os planos dos equipamentos da empresa; os demais, so os
        planos dos setores em que estao vinculados."""
        queryset = self.select_related("id_equipamento", "id_setor")
        if usuario.perfil == Usuario.Perfil.ADMIN:
            return queryset.filter(id_equipamento__id_setor__id_empresa=usuario.id_empresa)

        setores_ids = usuario.usuariosetor_set.values_list("id_setor_id", flat=True)
        return queryset.filter(id_setor__in=setores_ids)

    def com_situacao(self):
        """Anota a OS do plano ainda em aberto (a mais antiga) e a data
        prevista da ocorrencia dela, usadas para calcular a situacao do plano."""
        em_aberto = OrdemServico.objects.em_aberto().filter(
            plano_origem=models.OuterRef("pk")
        ).order_by("data_abertura")
        return self.annotate(
            id_os_em_aberto=models.Subquery(em_aberto.values("id_os")[:1]),
            data_os_em_aberto=models.Subquery(
                em_aberto.values("execucao_plano__data_prevista")[:1]
            ),
        )


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

    # Agendamento. proxima_execucao e a data prevista da proxima ocorrencia
    # ainda nao gerada; as ocorrencias seguem o calendario do plano.
    ativo = models.BooleanField(default=True)
    dias_antecedencia = models.PositiveSmallIntegerField(default=0)
    prioridade = models.CharField(
        max_length=10,
        choices=OrdemServico.Prioridade.choices,
        default=OrdemServico.Prioridade.MEDIA,
    )
    tecnico_sugerido = models.ForeignKey(
        UsuarioSetor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planos_sugeridos",
        limit_choices_to={"perfil_no_setor": UsuarioSetor.PerfilSetor.TECNICO},
        db_column="id_tecnico_sugerido",
    )
    duracao_estimada_horas = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True
    )
    instrucoes = models.TextField(blank=True, default="")
    # Data prevista para a qual o aviso PLANO_VENCENDO ja foi enviado
    # (garante um aviso por ocorrencia).
    aviso_enviado_para = models.DateField(blank=True, null=True)

    objects = PlanoManutencaoQuerySet.as_manager()

    class Meta:
        db_table = "planos_manutencao"
        ordering = ["proxima_execucao"]

    def __str__(self):
        return f"Plano #{self.id_plano} - {self.id_equipamento.tag} ({self.tipo})"


class ExecucaoPlano(models.Model):
    """Registro de cada ocorrencia de um plano: a OS gerada ou o motivo de
    ter sido pulada. Garante que uma ocorrencia nao gere duas OS e serve de
    base para medir o cumprimento das preventivas."""

    class Status(models.TextChoices):
        GERADA = "gerada", "Gerada"
        PULADA = "pulada", "Pulada"

    class Motivo(models.TextChoices):
        OS_EM_ABERTO = "os_em_aberto", "Já havia OS do plano em aberto"
        ATRASADA = "atrasada", "Ocorrência atrasada substituída pela mais recente"
        MANUAL = "manual", "Pulada manualmente"

    id_execucao = models.AutoField(primary_key=True)
    id_plano = models.ForeignKey(
        PlanoManutencao,
        on_delete=models.CASCADE,
        related_name="execucoes",
        db_column="id_plano",
    )
    id_equipamento = models.ForeignKey(
        Equipamento,
        on_delete=models.CASCADE,
        related_name="execucoes_plano",
        db_column="id_equipamento",
    )
    data_prevista = models.DateField()
    id_os = models.OneToOneField(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execucao_plano",
        db_column="id_os",
    )
    status = models.CharField(max_length=10, choices=Status.choices)
    motivo = models.CharField(max_length=20, choices=Motivo.choices, blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "execucoes_plano"
        ordering = ["-data_prevista"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_plano", "id_equipamento", "data_prevista"],
                name="execucao_unica_por_ocorrencia",
            ),
        ]

    def __str__(self):
        return f"Execução #{self.id_execucao} - plano {self.id_plano_id} em {self.data_prevista} ({self.status})"


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

        