from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordens_servico", "0003_ordemservico_proxima_manutencao"),
    ]

    operations = [
        migrations.AddField(
            model_name="ordemservico",
            name="data_indisponibilidade",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
