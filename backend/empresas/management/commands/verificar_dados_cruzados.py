"""
Auditoria somente leitura de registros que referenciam objetos de outra
empresa — o vazamento que as validacoes de escrita (S4) passaram a
impedir a partir de agora, mas que podem ja existir em dados antigos.

Nenhuma consulta aqui escreve no banco. Uso:

    python manage.py verificar_dados_cruzados
"""

from django.core.management.base import BaseCommand
from django.db.models import F, Q

from manutencao.models import PlanoManutencao
from ordens_servico.models import OrdemServico
from usuarios.models import UsuarioSetor


class Command(BaseCommand):
    help = "Lista (sem alterar nada) registros que referenciam objetos de outra empresa."

    def handle(self, *args, **options):
        total = 0
        total += self._checar(
            "Ordens de servico: equipamento e solicitante de empresas diferentes",
            OrdemServico.objects.filter(
                solicitante__isnull=False, id_equipamento__id_setor__isnull=False
            ).exclude(solicitante__id_empresa=F("id_equipamento__id_setor__id_empresa")),
            "id_os",
        )
        total += self._checar(
            "Ordens de servico: equipamento e tecnico de empresas diferentes",
            OrdemServico.objects.filter(
                tecnico__isnull=False, id_equipamento__id_setor__isnull=False
            ).exclude(
                tecnico__id_setor__id_empresa=F("id_equipamento__id_setor__id_empresa")
            ),
            "id_os",
        )
        total += self._checar(
            "Planos de manutencao: setor ausente ou diferente do setor do equipamento",
            PlanoManutencao.objects.filter(id_equipamento__id_setor__isnull=False).filter(
                Q(id_setor__isnull=True) | ~Q(id_setor=F("id_equipamento__id_setor"))
            ),
            "id_plano",
        )
        total += self._checar(
            "Vinculos usuario-setor: usuario e setor de empresas diferentes",
            UsuarioSetor.objects.exclude(id_usuario__id_empresa=F("id_setor__id_empresa")),
            "id",
        )
        total += self._checar_equipamentos_com_tipo_de_outra_empresa()

        if total == 0:
            self.stdout.write(self.style.SUCCESS("Nenhum registro cruzado entre empresas encontrado."))
        else:
            self.stdout.write(self.style.WARNING(f"\nTotal de registros cruzados: {total}"))

    def _checar(self, titulo, queryset, campo_id):
        ids = list(queryset.values_list(campo_id, flat=True)[:10])
        qtd = queryset.count()
        if qtd:
            self.stdout.write(self.style.WARNING(f"{titulo}: {qtd}"))
            self.stdout.write(f"  ids (ate 10): {ids}")
        else:
            self.stdout.write(f"{titulo}: 0")
        return qtd

    def _checar_equipamentos_com_tipo_de_outra_empresa(self):
        from equipamentos.models import Equipamento

        queryset = Equipamento.objects.filter(
            id_tipo__id_empresa__isnull=False, id_setor__isnull=False
        ).exclude(id_tipo__id_empresa=F("id_setor__id_empresa"))
        return self._checar(
            "Equipamentos: tipo de outra empresa (tipos legados sem empresa sao ignorados)",
            queryset,
            "id_equipamento",
        )
