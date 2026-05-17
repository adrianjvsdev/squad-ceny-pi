import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('squad_ceny')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


app.conf.beat_schedule = {
    'verificar-manutencoes-preventivas': {
        'task': 'manutencao.tasks.verificar_manutencoes_preventivas',
        'schedule': crontab(hour='*/1'),  #ta verificando a cada hora, pode ser mudado depois
    },
    'simular-anomalias-iot': {
        'task': 'manutencao.tasks.processar_anomalias_iot',
        'schedule': crontab(minute='*/5'),  #as anomalias serão a cada 5 minutos
    },
}