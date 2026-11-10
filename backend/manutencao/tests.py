import io
from contextlib import redirect_stdout
from datetime import date, timedelta
from unittest.mock import patch

from django.db import IntegrityError, transaction
from django.utils import timezone

from config.celery import app as celery_app
from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    criar_usuario,
    vincular,
)
from manutencao.iot_Mock import simular_dados_iot
from manutencao.models import AnomaliaIoT, ExecucaoPlano, PlanoManutencao
from manutencao.services import criar_os_preditiva, criar_os_preventiva
from manutencao.tasks import processar_anomalias_iot, verificar_manutencoes_preventivas
from notificacoes.models import Notificacao
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario, UsuarioSetor


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

    def test_admin_ve_so_planos_da_propria_empresa(self):
        self.assertEqual(self.ids(self.c.admin), {self.p_a.pk, self.p_b.pk})
        self.assertEqual(self.ids(self.outra.admin), {self.p_outra.pk})

    def test_admin_nao_acessa_plano_de_outra_empresa(self):
        client = self.cliente(self.c.admin)
        url = f"{self.URL}{self.p_outra.pk}/"
        self.assertEqual(client.get(url).status_code, 404)
        self.assertEqual(client.patch(url, {"descricao": "x"}, format="json").status_code, 404)
        self.assertEqual(client.delete(url).status_code, 404)

    def test_admin_ve_plano_sem_setor_desde_que_o_equipamento_seja_da_empresa(self):
        sem_setor = criar_plano(self.c.equipamento, setor=None)
        self.assertIn(sem_setor.pk, self.ids(self.c.admin))
        self.assertNotIn(sem_setor.pk, self.ids(self.c.operador))

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
                "proxima_execucao", "ultima_manutencao", "id_equipamento",
                "equipamento_tag", "equipamento_nome", "id_setor", "setor_nome",
                # agendamento (aba Preventivas)
                "ativo", "dias_antecedencia", "prioridade", "tecnico_sugerido",
                "tecnico_nome", "duracao_estimada_horas", "instrucoes",
                "id_os_em_aberto", "situacao",
            },
        )
        self.assertEqual(resp.data["equipamento_tag"], self.c.equipamento.tag)
        self.assertIsNone(resp.data["ultima_manutencao"])

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

    def _payload(self, **extra):
        return {
            "descricao": "Trocar filtro", "tipo": "preventiva", "periodicidade_dias": 15,
            "proxima_execucao": "2030-01-01", "id_equipamento": self.c.equipamento.pk,
            "id_setor": self.c.setor.pk, **extra,
        }

    def test_criar_com_equipamento_de_outra_empresa_400(self):
        resp = self.cliente(self.c.admin).post(
            self.URL,
            self._payload(id_equipamento=self.outra.equipamento.pk, id_setor=self.outra.setor.pk),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_equipamento"]],
            ["Você não pode usar um equipamento fora da sua empresa."],
        )

    def test_criar_com_setor_de_outra_empresa_400(self):
        resp = self.cliente(self.c.admin).post(
            self.URL, self._payload(id_setor=self.outra.setor.pk), format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_setor"]],
            ["Você não pode usar um setor fora da sua empresa."],
        )

    def test_setor_do_plano_deve_ser_o_do_equipamento(self):
        msg = ["O setor do plano deve ser o mesmo setor do equipamento."]
        client = self.cliente(self.c.admin)
        # setor da mesma empresa, mas diferente do setor do equipamento
        outro_setor = client.post(
            self.URL, self._payload(id_setor=self.setor_b.pk), format="json"
        )
        self.assertEqual(outro_setor.status_code, 400)
        self.assertEqual([str(e) for e in outro_setor.data["id_setor"]], msg)
        # sem setor
        sem_setor = client.post(self.URL, self._payload(id_setor=None), format="json")
        self.assertEqual(sem_setor.status_code, 400)
        self.assertEqual([str(e) for e in sem_setor.data["id_setor"]], msg)

    def test_editar_setor_ou_equipamento_revalida_a_consistencia(self):
        client = self.cliente(self.c.admin)
        url = f"{self.URL}{self.p_a.pk}/"
        self.assertEqual(client.patch(url, {"id_setor": self.setor_b.pk}, format="json").status_code, 400)
        self.assertEqual(client.patch(url, {"id_equipamento": self.eq_b.pk}, format="json").status_code, 400)
        # trocar os dois juntos, de forma consistente, funciona
        ok = client.patch(
            url, {"id_equipamento": self.eq_b.pk, "id_setor": self.setor_b.pk}, format="json"
        )
        self.assertEqual(ok.status_code, 200)

    def test_editar_outros_campos_de_plano_antigo_inconsistente_continua_funcionando(self):
        antigo = criar_plano(self.c.equipamento, setor=None)  # legado: sem setor
        resp = self.cliente(self.c.admin).patch(
            f"{self.URL}{antigo.pk}/", {"descricao": "Ajustada"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

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

    def test_nao_admin_nao_cria_edita_nem_exclui_plano(self):
        url = f"{self.URL}{self.p_a.pk}/"
        for usuario in (self.c.operador, self.c.tecnico):
            client = self.cliente(usuario)
            self.assertEqual(client.post(self.URL, self._payload(), format="json").status_code, 403)
            self.assertEqual(client.patch(url, {"descricao": "x"}, format="json").status_code, 403)
            self.assertEqual(client.delete(url).status_code, 403)
            # leitura continua liberada dentro da visibilidade
            self.assertEqual(client.get(url).status_code, 200)

        self.p_a.refresh_from_db()
        self.assertEqual(self.p_a.descricao, "Lubrificar")
        self.assertEqual(PlanoManutencao.objects.count(), 3)


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

    def test_usuario_de_outra_empresa_recebe_404(self):
        for usuario in (self.outra.admin, self.outra.operador):
            resp = self.get(self.eq_iot.pk, usuario=usuario)
            self.assertEqual(resp.status_code, 404)
            self.assertEqual(resp.data, {"detail": "Equipamento não encontrado."})

    def test_nao_admin_sem_vinculo_no_setor_recebe_404(self):
        outro_setor = criar_setor(self.c.empresa, "Outro")
        eq = criar_equipamento(outro_setor, tem_iot=True)
        self.assertEqual(self.get(eq.pk).status_code, 404)  # operador
        self.assertEqual(self.get(eq.pk, usuario=self.c.admin).status_code, 200)

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

    def test_ignora_equipamento_inativo(self):
        self.eq.status = "inativo"
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

    def test_criar_os_preventiva(self):
        plano = criar_plano(self.c.equipamento, periodicidade_dias=30)
        proxima_original = plano.proxima_execucao
        ordem = sem_stdout(criar_os_preventiva, plano, date(2030, 1, 15))

        self.assertEqual(ordem.titulo, f"Manutenção Preventiva - {self.c.equipamento.nome}")
        self.assertEqual(
            ordem.descricao,
            "Manutenção preventiva automática\n\nLubrificar\n\nData prevista: 15/01/2030",
        )
        self.assertEqual(ordem.tipo_manutencao, "preventiva")
        self.assertEqual(ordem.prioridade, "media")
        self.assertEqual(ordem.id_equipamento, self.c.equipamento)
        self.assertEqual(ordem.plano_origem, plano)
        self.assertIsNone(ordem.solicitante)
        self.assertEqual(ordem.status, "aberta")

        execucao = ExecucaoPlano.objects.get()
        self.assertEqual(execucao.id_os, ordem)
        self.assertEqual(execucao.data_prevista, date(2030, 1, 15))
        self.assertEqual(execucao.status, ExecucaoPlano.Status.GERADA)

        # O calendario e avancado por quem chama (ver GeracaoTests).
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, proxima_original)
        self.assertIsNone(plano.ultima_manutencao)

    def test_os_preventiva_usa_prioridade_e_instrucoes_do_plano(self):
        plano = criar_plano(
            self.c.equipamento, prioridade="alta", instrucoes="1. Desligar\n2. Lubrificar"
        )
        ordem = sem_stdout(criar_os_preventiva, plano, date(2030, 1, 15))
        self.assertEqual(ordem.prioridade, "alta")
        self.assertEqual(
            ordem.descricao,
            "Manutenção preventiva automática\n\nLubrificar\n\n"
            "Instruções:\n1. Desligar\n2. Lubrificar\n\nData prevista: 15/01/2030",
        )

    def test_os_preventiva_notifica_os_admins_ativos_da_empresa(self):
        outro_admin = criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN)
        criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN, is_active=False)
        Cenario()  # admin de outra empresa nao recebe

        ordem = sem_stdout(
            criar_os_preventiva, criar_plano(self.c.equipamento), timezone.localdate()
        )

        notificacoes = Notificacao.objects.filter(id_os=ordem)
        self.assertEqual(
            {n.id_usuario for n in notificacoes}, {self.c.admin, outro_admin}
        )
        n = notificacoes.first()
        self.assertEqual(n.tipo, Notificacao.Tipo.OS_ABERTA)
        self.assertEqual(n.titulo, f"OS #{ordem.id_os} aguardando aprovação")
        self.assertEqual(
            n.mensagem, f"Gerada automaticamente pelo sistema: {ordem.titulo}"
        )

    def test_os_preditiva_nao_notifica(self):
        sem_stdout(criar_os_preditiva, criar_anomalia(self.c.equipamento, "alta"))
        self.assertFalse(Notificacao.objects.exists())


class ModeloAgendamentoTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.plano = criar_plano(self.c.equipamento, self.c.setor)
        self.data = timezone.localdate()

    def criar_execucao(self, **kwargs):
        kwargs.setdefault("id_plano", self.plano)
        kwargs.setdefault("id_equipamento", self.c.equipamento)
        kwargs.setdefault("data_prevista", self.data)
        kwargs.setdefault("status", ExecucaoPlano.Status.GERADA)
        return ExecucaoPlano.objects.create(**kwargs)

    def test_plano_sem_os_campos_novos_recebe_os_padroes(self):
        self.plano.refresh_from_db()
        self.assertTrue(self.plano.ativo)
        self.assertEqual(self.plano.dias_antecedencia, 0)
        self.assertEqual(self.plano.prioridade, OrdemServico.Prioridade.MEDIA)
        self.assertEqual(self.plano.instrucoes, "")
        self.assertIsNone(self.plano.tecnico_sugerido)
        self.assertIsNone(self.plano.duracao_estimada_horas)
        self.assertIsNone(self.plano.aviso_enviado_para)

    def test_ocorrencia_nao_pode_ser_registrada_duas_vezes(self):
        self.criar_execucao()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.criar_execucao(status=ExecucaoPlano.Status.PULADA)
        # outra data do mesmo plano e permitida
        self.criar_execucao(data_prevista=self.data + timedelta(days=30))
        self.assertEqual(self.plano.execucoes.count(), 2)

    def test_excluir_a_os_preserva_o_registro_da_execucao(self):
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="preventiva", id_equipamento=self.c.equipamento
        )
        execucao = self.criar_execucao(id_os=ordem)
        ordem.delete()
        execucao.refresh_from_db()
        self.assertIsNone(execucao.id_os)

    def test_excluir_o_plano_exclui_as_execucoes(self):
        self.criar_execucao()
        self.plano.delete()
        self.assertFalse(ExecucaoPlano.objects.exists())

    def test_remover_o_vinculo_do_tecnico_limpa_a_sugestao(self):
        self.plano.tecnico_sugerido = self.c.vinculo_tecnico
        self.plano.save()
        self.c.vinculo_tecnico.delete()
        self.plano.refresh_from_db()
        self.assertIsNone(self.plano.tecnico_sugerido)


class AgendadorTests(BaseTestCase):
    def test_preventivas_verificadas_uma_vez_por_hora(self):
        agenda = celery_app.conf.beat_schedule["verificar-manutencoes-preventivas"]
        self.assertEqual(agenda["schedule"].minute, {0})
        self.assertEqual(agenda["schedule"].hour, set(range(24)))


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

    def test_preventiva_vencida_gera_os_e_agenda_proxima_execucao(self):
        plano = criar_plano(
            self.c.equipamento,
            periodicidade_dias=30,
            proxima_execucao=timezone.localdate() - timedelta(days=5),
        )
        resultado = sem_stdout(verificar_manutencoes_preventivas)
        self.assertEqual(resultado, "Verificação de manutenções preventivas concluída")

        ordem = OrdemServico.objects.get()
        self.assertEqual(ordem.tipo_manutencao, "preventiva")
        self.assertEqual(ordem.id_equipamento, self.c.equipamento)
        self.assertEqual(ordem.plano_origem, plano)
        self.assertIsNone(ordem.solicitante)

        plano.refresh_from_db()
        # Calendario ancorado no plano: vencido ha 5 dias, ciclo de 30 -> hoje + 25
        # (antes era hoje + 30, e o calendario escorregava a cada atraso).
        self.assertEqual(
            plano.proxima_execucao, timezone.localdate() + timedelta(days=25)
        )
        # A ultima manutencao so e registrada quando a OS for concluida.
        self.assertIsNone(plano.ultima_manutencao)

    def test_preventiva_de_equipamento_inativo_nao_gera_os(self):
        self.c.equipamento.status = "inativo"
        self.c.equipamento.save()
        criar_plano(
            self.c.equipamento,
            proxima_execucao=timezone.localdate() - timedelta(days=5),
        )
        sem_stdout(verificar_manutencoes_preventivas)
        self.assertFalse(OrdemServico.objects.exists())

    def test_preventiva_vencida_ha_muito_tempo_nao_gera_mais_de_uma_os(self):
        criar_plano(
            self.c.equipamento,
            periodicidade_dias=30,
            proxima_execucao=timezone.localdate() - timedelta(days=400),
        )
        sem_stdout(verificar_manutencoes_preventivas)
        sem_stdout(verificar_manutencoes_preventivas)
        self.assertEqual(OrdemServico.objects.count(), 1)

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
