"""
signals.py — notificacoes

Registra automaticamente ações no LogAuditoria via Django signals.
Para ativar, chame ready() no AppConfig (notificacoes/apps.py).

Modelos monitorados: OrdemServico, PlanoManutencao.
Adicione mais conforme necessário.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from ordens_servico.models import OrdemServico
from manutencao.models import PlanoManutencao
from .models import LogAuditoria

Usuario = get_user_model()


def _get_usuario_from_instance(instance):
    """Tenta extrair o usuário que realizou a ação (requer middleware de request threading)."""
    # Implemente com django-crum ou similar para capturar o request atual
    # Por ora retorna None — você pode complementar com sua solução de contexto
    return None


def _registrar_log(tabela, registro_id, acao, usuario=None):
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