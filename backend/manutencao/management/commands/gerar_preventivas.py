from django.core.management.base import BaseCommand
from django.utils import timezone

from manutencao.services import avisar_planos_vencendo, gerar_preventivas_vencidas


class Command(BaseCommand):
    help = (
        "Gera as OS das manutencoes preventivas vencidas e avisa os planos "
        "que estao para vencer. Faz o mesmo que a task do Celery, para usar "
        "sem worker/beat rodando."
    )

    def handle(self, *args, **options):
        hoje = timezone.localdate()
        resumo = gerar_preventivas_vencidas(hoje)
        avisos = avisar_planos_vencendo(hoje)
        self.stdout.write(
            self.style.SUCCESS(
                f"OS geradas: {resumo['geradas']} | ocorrências puladas: "
                f"{resumo['puladas']} | erros: {resumo['erros']} | "
                f"avisos de vencimento: {avisos}"
            )
        )
