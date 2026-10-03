"""
signals.py — notificacoes

Registra automaticamente ações no LogAuditoria via Django signals.
Para ativar, chame ready() no AppConfig (notificacoes/apps.py).

Modelos monitorados: OrdemServico, PlanoManutencao.
Adicione mais conforme necessário.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from ordens_servico.models import OrdemServico
from manutencao.models import PlanoManutencao
from .models import LogAuditoria


def _registrar_log(tabela, registro_id, acao, usuario=None):
    # Os receivers não sabem quem executou a ação, então id_usuario fica nulo.
    # Capturar o usuário exigiria um middleware de request (ex.: django-crum).
    LogAuditoria.objects.create(
        id_usuario=usuario,
        acao=acao,
        tabela_afetada=tabela,
        id_registro_afetado=registro_id,
    )


@receiver(post_save, sender=OrdemServico)
def log_ordem_servico(sender, instance, created, **kwargs):
    acao = "Criação" if created else "Atualização"
    _registrar_log("ordens_servico", instance.pk, f"{acao} de OS: {instance.titulo}")


@receiver(post_delete, sender=OrdemServico)
def log_ordem_servico_delete(sender, instance, **kwargs):
    _registrar_log("ordens_servico", instance.pk, f"Exclusão de OS: {instance.titulo}")


@receiver(post_save, sender=PlanoManutencao)
def log_plano_manutencao(sender, instance, created, **kwargs):
    acao = "Criação" if created else "Atualização"
    _registrar_log("planos_manutencao", instance.pk, f"{acao} de plano: {instance}")


@receiver(post_delete, sender=PlanoManutencao)
def log_plano_manutencao_delete(sender, instance, **kwargs):
    _registrar_log("planos_manutencao", instance.pk, f"Exclusão de plano: {instance}")