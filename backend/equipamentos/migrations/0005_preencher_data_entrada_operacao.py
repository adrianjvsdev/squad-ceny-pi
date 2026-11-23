"""Preenche a data de entrada em operacao dos equipamentos que ficaram sem ela.

A data real de cadastro desses equipamentos nao foi registrada; a melhor
aproximacao e a abertura da OS mais antiga do equipamento (ele ja existia
nesse momento) e, sem nenhuma OS, o momento desta migration. Daqui em diante
o cadastro grava a data sozinho (equipamentos.services.criar_com_tag_automatica).
"""

from django.db import migrations
from django.db.models import Min
from django.utils import timezone


def preencher(apps, schema_editor):
    Equipamento = apps.get_model("equipamentos", "Equipamento")
    OrdemServico = apps.get_model("ordens_servico", "OrdemServico")

    primeira_os = dict(
        OrdemServico.objects.filter(id_equipamento__isnull=False)
        .values("id_equipamento")
        .annotate(primeira=Min("data_abertura"))
        .values_list("id_equipamento", "primeira")
    )
    agora = timezone.now()
    for equipamento in Equipamento.objects.filter(data_entrada_operacao__isnull=True):
        equipamento.data_entrada_operacao = primeira_os.get(equipamento.pk) or agora
        equipamento.save(update_fields=["data_entrada_operacao"])


class Migration(migrations.Migration):
    dependencies = [
        ("equipamentos", "0004_tipoequipamento_id_empresa"),
        ("ordens_servico", "0006_diagnosticocausa"),
    ]

    # Desfazer nao apaga as datas: nao da para saber quais foram preenchidas aqui.
    operations = [migrations.RunPython(preencher, migrations.RunPython.noop)]
