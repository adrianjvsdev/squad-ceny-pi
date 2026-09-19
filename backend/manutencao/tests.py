import io
from contextlib import redirect_stdout
from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    vincular,
)
from manutencao.iot_Mock import simular_dados_iot
from manutencao.models import AnomaliaIoT, PlanoManutencao
from manutencao.services import criar_os_preditiva
from manutencao.tasks import processar_anomalias_iot, verificar_manutencoes_preventivas
from ordens_servico.models import OrdemServico
from usuarios.models import UsuarioSetor


def criar_plano(equipamento, setor=None, **kwargs):
    kwargs.setdefault("descricao", "Lubrificar")
    kwargs.setdefault("tipo", PlanoManutencao.Tipo.PREVENTIVA)
    kwargs.setdefault("periodicidade_dias", 30)
    kwargs.setdefault("proxima_execucao", timezone.localdate() + timedelta(days=10))
    return PlanoManutencao.objects.create(
        id_equipamento=equipamento, id_setor=setor, **kwargs
    )


def criar_anomalia(equipamento, severidade="media", **kwargs):
    kwargs.setdefault("tipo", "temperatura_alta")
    kwargs.setdefault("valor", 95.5)
    kwargs.setdefault("valor_limite", 80.0)
    return AnomaliaIoT.objects.create(
        equipamento=equipamento, severidade=severidade, **kwargs
    )


def sem_stdout(func, *args, **kwargs):
    """Executa func silenciando os print() dos services/tasks."""
    with redirect_stdout(io.StringIO()):
        return func(*args, **kwargs)


class PlanoManutencaoViewSetTests(BaseTestCase):
    URL = "/api/planos-manutencao/"

    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()
        self.setor_b = criar_setor(self.c.empresa, "Setor B")
        self.eq_b = criar_equipamento(self.setor_b)
        self.p_a = criar_plano(self.c.equipamento, self.c.setor)
        self.p_b = criar_plano(self.eq_b, self.setor_b)
        self.p_outra = criar_plano(self.outra.equipamento, self.outra.setor)

    def ids(self, usuario):
        resp = self.cliente(usuario).get(self.URL)
        self.assertEqual(resp.status_code, 200)
        return {p["id_plano"] for p in resp.data}

    def test_nao_admin_ve_so_planos_dos_seus_setores(self):
        self.assertEqual(self.ids(self.c.operador), {self.p_a.pk})
        self.assertEqual(self.ids(self.c.tecnico), {self.p_a.pk})

    def test_vinculo_adicional_amplia_a_visibilidade(self):
        vincular(self.c.operador, self.setor_b, UsuarioSetor.PerfilSetor.VISUALIZADOR)
        self.assertEqual(self.ids(self.c.operador), {self.p_a.pk, self.p_b.pk})

    # Comportamento atual (S3, ainda nao corrigido): admin recebe qs.all(),
    # inclusive os planos de outras empresas.
    def test_admin_ve_planos_de_todas_as_empresas(self):
        self.assertEqual(
            self.ids(self.c.admin), {self.p_a.pk, self.p_b.pk, self.p_outra.pk}
        )

    def test_ordenacao_por_proxima_execucao(self):
        self.p_b.proxima_execucao = timezone.localdate() - timedelta(days=1)
        self.p_b.save()
        ids = [p["id_plano"] for p in self.cliente(self.c.admin).get(self.URL).data]
        self.assertEqual(ids[0], self.p_b.pk)

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get(f"{self.URL}{self.p_a.pk}/")
        self.assertEqual(
            set(resp.data),
            {
                "id_plano", "descricao", "tipo", "periodicidade_dias",
                "proxima_execucao", "id_equipamento", "equipamento_tag",
                "equipamento_nome", "id_setor", "setor_nome",
            },
        )
        self.assertEqual(resp.data["equipamento_tag"], self.c.equipamento.tag)

    def test_criar_plano(self):
        resp = self.cliente(self.c.admin).post(
            self.URL,
            {
                "descricao": "Trocar filtro",
                "tipo": "preditiva",
                "periodicidade_dias": 15,
                "proxima_execucao": "2030-01-01",
                "id_equipamento": self.c.equipamento.pk,
                "id_setor": self.c.setor.pk,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    def test_periodicidade_zero_400(self):
        resp = self.cliente(self.c.admin).post(
            self.URL,
            {
                "descricao": "x", "tipo": "preventiva", "periodicidade_dias": 0,
                "proxima_execucao": "2030-01-01",
                "id_equipamento": self.c.equipamento.pk,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["periodicidade_dias"]],
            ["A periodicidade deve ser maior que zero."],
        )

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get(self.URL).status_code, 401)


class IoTStatusViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()
        self.eq_iot = criar_equipamento(self.c.setor, tem_iot=True)

    def get(self, equipamento_pk, usuario=None, leituras=(55.44, 2000.4, 7.26)):
        with patch("random.uniform", side_effect=list(leituras)):
            return self.cliente(usuario or self.c.operador).get(
                f"/api/iot-status/{equipamento_pk}/"
            )

    def test_equipamento_inexistente_404(self):
        resp = self.get(999999)
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.data, {"detail": "Equipamento não encontrado."})

    def test_equipamento_sem_iot(self):
        resp = self.get(self.c.equipamento.pk)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.data,
            {
                "id_equipamento": self.c.equipamento.pk,
                "tag": self.c.equipamento.tag,
                "nome": self.c.equipamento.nome,
                "tem_iot": False,
                "temperatura": None,
                "rpm": None,
                "pressao": None,
                "anomalias_recentes": [],
                "status_geral": "desabilitado",
            },
        )

    def test_equipamento_com_iot_sem_anomalias(self):
        resp = self.get(self.eq_iot.pk)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            list(resp.data),
            [
                "id_equipamento", "tag", "nome", "tem_iot", "temperatura",
                "rpm", "pressao", "anomalias_recentes", "status_geral",
            ],
        )
        self.assertTrue(resp.data["tem_iot"])
        # ordem das leituras: temperatura, rpm, pressao (arredondadas)
        self.assertEqual(resp.data["temperatura"], 55.4)
        self.assertEqual(resp.data["rpm"], 2000.0)
        self.assertEqual(resp.data["pressao"], 7.3)
        self.assertEqual(resp.data["anomalias_recentes"], [])
        self.assertEqual(resp.data["status_geral"], "normal")

    def test_status_geral_conforme_severidades_recentes(self):
        casos = (
            (["baixa"], "normal"),
            (["baixa", "media"], "alerta"),
            (["media", "alta", "baixa"], "critico"),
        )
        for severidades, esperado in casos:
            AnomaliaIoT.objects.all().delete()
            for sev in severidades:
                criar_anomalia(self.eq_iot, sev)
            self.assertEqual(self.get(self.eq_iot.pk).data["status_geral"], esperado)

    def test_considera_apenas_as_10_anomalias_mais_recentes(self):
        agora = timezone.now()
        antiga = criar_anomalia(self.eq_iot, "alta")
        AnomaliaIoT.objects.filter(pk=antiga.pk).update(
            detectada_em=agora - timedelta(days=1)
        )
        for i in range(10):
            a = criar_anomalia(self.eq_iot, "baixa")
            AnomaliaIoT.objects.filter(pk=a.pk).update(
                detectada_em=agora - timedelta(minutes=i)
            )
        resp = self.get(self.eq_iot.pk)
        self.assertEqual(len(resp.data["anomalias_recentes"]), 10)
        self.assertNotIn(antiga.pk, [a["id"] for a in resp.data["anomalias_recentes"]])
        self.assertEqual(resp.data["status_geral"], "normal")

    def test_anomalias_recentes_ordenadas_e_com_campos(self):
        agora = timezone.now()
        velha = criar_anomalia(self.eq_iot, "baixa")
        nova = criar_anomalia(self.eq_iot, "media")
        AnomaliaIoT.objects.filter(pk=velha.pk).update(detectada_em=agora - timedelta(hours=1))
        AnomaliaIoT.objects.filter(pk=nova.pk).update(detectada_em=agora)
        # anomalia de outro equipamento nao entra
        criar_anomalia(self.c.equipamento, "alta")

        anomalias = self.get(self.eq_iot.pk).data["anomalias_recentes"]
        self.assertEqual([a["id"] for a in anomalias], [nova.pk, velha.pk])
        self.assertEqual(
            set(anomalias[0]),
            {
                "id", "equipamento", "equipamento_tag", "equipamento_nome", "tipo",
                "valor", "valor_limite", "severidade", "detectada_em",
            },
        )
        self.assertEqual(anomalias[0]["equipamento_tag"], self.eq_iot.tag)

    # Comportamento atual (S2, ainda nao corrigido): nao ha filtro por empresa.
    def test_usuario_de_outra_empresa_consegue_consultar(self):
        resp = self.get(self.eq_iot.pk, usuario=self.outra.operador)
        self.assertEqual(resp.status_code, 200)

    def test_sem_autenticacao_401(self):
        self.assertEqual(
            self.cliente().get(f"/api/iot-status/{self.eq_iot.pk}/").status_code, 401
        )


class SimularDadosIoTTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.eq = criar_equipamento(self.c.setor, tem_iot=True)

    def simular(self, temperatura, pressao, vibracao):
        leituras = {(20, 100): temperatura, (100, 200): pressao, (0, 15): vibracao}
        with patch("random.uniform", side_effect=lambda a, b: leituras[(a, b)]):
            return simular_dados_iot()

    def test_leituras_normais_nao_geram_anomalia(self):
        self.assertEqual(self.simular(50, 150, 5), [])
        self.assertFalse(AnomaliaIoT.objects.exists())

    def test_limites_exatos_nao_geram_anomalia(self):
        self.assertEqual(self.simular(80, 110, 12), [])

    def test_gera_as_tres_anomalias(self):
        anomalias = self.simular(95.123, 105.0, 13.0)
        self.assertEqual(
            [(a.tipo, a.valor, a.valor_limite, a.severidade) for a in anomalias],
            [
                ("temperatura_alta", 95.12, 80, "alta"),
                ("pressao_baixa", 105.0, 110, "media"),
                ("vibracao_excessiva", 13.0, 12, "alta"),
            ],
        )
        self.assertEqual(AnomaliaIoT.objects.count(), 3)
        self.assertTrue(all(a.equipamento == self.eq for a in anomalias))

    def test_temperatura_entre_80_e_90_e_media(self):
        (anomalia,) = self.simular(85, 150, 5)
        self.assertEqual(anomalia.severidade, "media")

    def test_temperatura_acima_de_90_e_alta(self):
        (anomalia,) = self.simular(90.5, 150, 5)
        self.assertEqual(anomalia.severidade, "alta")

    def test_ignora_equipamento_sem_iot(self):
        self.eq.tem_iot = False
        self.eq.save()
        self.assertEqual(self.simular(99, 100, 15), [])


class ServicosOSTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()

    def test_criar_os_preditiva(self):
        anomalia = criar_anomalia(self.c.equipamento, "alta")
        ordem = sem_stdout(criar_os_preditiva, anomalia)

        self.assertEqual(ordem.titulo, f"Manutenção Preditiva - {self.c.equipamento.nome}")
        self.assertEqual(
            ordem.descricao,
            "Anomalia detectada pelo sistema IoT\n\n"
            "Tipo: temperatura_alta\n"
            "Valor detectado: 95.5\n"
            "Limite crítico: 80.0\n"
            "Severidade: Alta",
        )
        self.assertEqual(ordem.tipo_manutencao, "preditiva")
        self.assertEqual(ordem.prioridade, "alta")
        self.assertEqual(ordem.id_equipamento, self.c.equipamento)
        self.assertIsNone(ordem.solicitante)
        self.assertEqual(ordem.status, "aberta")
        anomalia.refresh_from_db()
        self.assertEqual(anomalia.os_gerada, ordem)

    def test_prioridade_acompanha_a_severidade(self):
        for severidade in ("baixa", "media", "alta"):
            anomalia = criar_anomalia(self.c.equipamento, severidade)
            ordem = sem_stdout(criar_os_preditiva, anomalia)
            self.assertEqual(ordem.prioridade, severidade)


class TasksTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()

    def test_preventivas_sem_planos_vencidos_nao_cria_os(self):
        criar_plano(self.c.equipamento)  # vence em 10 dias
        criar_plano(
            self.c.equipamento,
            tipo=PlanoManutencao.Tipo.PREDITIVA,
            proxima_execucao=timezone.localdate() - timedelta(days=5),
        )  # vencido, mas nao e preventivo
        resultado = sem_stdout(verificar_manutencoes_preventivas)
        self.assertEqual(resultado, "Verificação de manutenções preventivas concluída")
        self.assertFalse(OrdemServico.objects.exists())

    # Comportamento atual (bug B1, ainda nao corrigido): criar_os_preventiva usa
    # `plano.equipamento`, atributo inexistente (o campo e `id_equipamento`).
    def test_preventiva_vencida_falha_com_attribute_error(self):
        criar_plano(
            self.c.equipamento,
            proxima_execucao=timezone.localdate() - timedelta(days=1),
        )
        with self.assertRaises(AttributeError):
            sem_stdout(verificar_manutencoes_preventivas)
        self.assertFalse(OrdemServico.objects.exists())

    def test_processar_anomalias_cria_os_so_para_media_e_alta_sem_os(self):
        baixa = criar_anomalia(self.c.equipamento, "baixa")
        media = criar_anomalia(self.c.equipamento, "media")
        alta = criar_anomalia(self.c.equipamento, "alta")
        ja_tem_os = criar_anomalia(self.c.equipamento, "alta")
        ja_tem_os.os_gerada = OrdemServico.objects.create(
            titulo="existente", tipo_manutencao="preditiva",
            id_equipamento=self.c.equipamento,
        )
        ja_tem_os.save()

        with patch(
            "manutencao.tasks.simular_dados_iot",
            return_value=[baixa, media, alta, ja_tem_os],
        ):
            resultado = sem_stdout(processar_anomalias_iot)

        self.assertEqual(resultado, "Processadas 4 anomalias. 2 OS criadas")
        for anomalia, esperado in ((baixa, False), (media, True), (alta, True)):
            anomalia.refresh_from_db()
            self.assertEqual(anomalia.os_gerada is not None, esperado)
        # 1 existente + 2 novas
        self.assertEqual(OrdemServico.objects.count(), 3)

    def test_processar_anomalias_sem_anomalias(self):
        with patch("manutencao.tasks.simular_dados_iot", return_value=[]):
            resultado = sem_stdout(processar_anomalias_iot)
        self.assertEqual(resultado, "Processadas 0 anomalias. 0 OS criadas")
