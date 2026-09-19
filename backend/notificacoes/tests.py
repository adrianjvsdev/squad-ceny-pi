from datetime import timedelta

from django.utils import timezone

from config.testutils import BaseTestCase, Cenario, criar_usuario
from manutencao.models import PlanoManutencao
from notificacoes.models import LogAuditoria, Notificacao
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario

URL = "/api/notificacoes/"


def criar_notificacao(usuario, **kwargs):
    kwargs.setdefault("tipo", Notificacao.Tipo.OS_ATUALIZADA)
    kwargs.setdefault("titulo", "Titulo")
    return Notificacao.objects.create(id_usuario=usuario, **kwargs)


class NotificacaoViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.n1 = criar_notificacao(self.c.operador)
        self.n2 = criar_notificacao(self.c.operador)
        self.de_outro = criar_notificacao(self.c.admin)

    def test_lista_so_as_proprias(self):
        resp = self.cliente(self.c.operador).get(URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            {n["id_notificacao"] for n in resp.data},
            {self.n1.pk, self.n2.pk},
        )

    def test_mais_recentes_primeiro(self):
        agora = timezone.now()
        Notificacao.objects.filter(pk=self.n1.pk).update(
            timestamp_envio=agora - timedelta(hours=1)
        )
        Notificacao.objects.filter(pk=self.n2.pk).update(timestamp_envio=agora)
        ids = [n["id_notificacao"] for n in self.cliente(self.c.operador).get(URL).data]
        self.assertEqual(ids, [self.n2.pk, self.n1.pk])

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.operador).get(f"{URL}{self.n1.pk}/")
        self.assertEqual(
            set(resp.data),
            {
                "id_notificacao", "id_usuario", "id_os", "os_codigo", "tipo",
                "canal", "titulo", "mensagem", "timestamp_envio", "lida",
            } - {"os_codigo"},  # omitido pelo DRF quando id_os e nulo
        )

    def test_os_codigo_quando_ha_os(self):
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, solicitante=self.c.operador,
        )
        n = criar_notificacao(self.c.operador, id_os=ordem)
        resp = self.cliente(self.c.operador).get(f"{URL}{n.pk}/")
        self.assertEqual(resp.data["os_codigo"], ordem.pk)

    def test_notificacao_de_outro_usuario_404(self):
        resp = self.cliente(self.c.operador).get(f"{URL}{self.de_outro.pk}/")
        self.assertEqual(resp.status_code, 404)

    def test_nao_ha_criacao_nem_edicao_via_api(self):
        client = self.cliente(self.c.operador)
        self.assertEqual(client.post(URL, {}, format="json").status_code, 405)
        self.assertEqual(
            client.patch(f"{URL}{self.n1.pk}/", {"lida": True}, format="json").status_code,
            405,
        )

    def test_marcar_lida(self):
        resp = self.cliente(self.c.operador).patch(f"{URL}{self.n1.pk}/marcar-lida/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, {"status": "notificação marcada como lida"})
        self.n1.refresh_from_db()
        self.n2.refresh_from_db()
        self.assertTrue(self.n1.lida)
        self.assertFalse(self.n2.lida)

    def test_marcar_lida_de_outro_usuario_404(self):
        resp = self.cliente(self.c.operador).patch(
            f"{URL}{self.de_outro.pk}/marcar-lida/"
        )
        self.assertEqual(resp.status_code, 404)

    def test_marcar_todas_lidas_afeta_so_as_do_usuario(self):
        resp = self.cliente(self.c.operador).patch(f"{URL}marcar-todas-lidas/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.data, {"status": "todas as notificações marcadas como lidas"}
        )
        self.assertFalse(
            Notificacao.objects.filter(id_usuario=self.c.operador, lida=False).exists()
        )
        self.de_outro.refresh_from_db()
        self.assertFalse(self.de_outro.lida)

    def test_apagar_propria(self):
        resp = self.cliente(self.c.operador).delete(f"{URL}{self.n1.pk}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Notificacao.objects.filter(pk=self.n1.pk).exists())

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get(URL).status_code, 401)


class LogAuditoriaViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.log = LogAuditoria.objects.create(
            acao="x", tabela_afetada="t", id_registro_afetado=1
        )
        self.staff = criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN, is_staff=True)

    def test_somente_staff(self):
        # admin de perfil sem is_staff tambem e barrado (IsAdminUser)
        self.assertEqual(self.cliente(self.c.admin).get("/api/logs-auditoria/").status_code, 403)
        self.assertEqual(self.cliente(self.c.operador).get("/api/logs-auditoria/").status_code, 403)

    def test_staff_lista_e_detalha(self):
        client = self.cliente(self.staff)
        self.assertEqual(client.get("/api/logs-auditoria/").status_code, 200)
        resp = client.get(f"/api/logs-auditoria/{self.log.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            set(resp.data),
            {"id_log", "id_usuario", "acao", "tabela_afetada",
             "id_registro_afetado", "timestamp"},
        )

    def test_somente_leitura(self):
        resp = self.cliente(self.staff).post("/api/logs-auditoria/", {}, format="json")
        self.assertEqual(resp.status_code, 405)


class SignalsAuditoriaTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        LogAuditoria.objects.all().delete()

    def logs(self, tabela):
        return list(
            LogAuditoria.objects.filter(tabela_afetada=tabela).values_list(
                "acao", "id_registro_afetado", "id_usuario"
            )
        )

    def test_ordem_servico_criacao_atualizacao_exclusao(self):
        ordem = OrdemServico.objects.create(
            titulo="Falha", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, solicitante=self.c.operador,
        )
        ordem.status = "cancelada"
        ordem.save()
        pk = ordem.pk
        ordem.delete()

        self.assertEqual(
            sorted(self.logs("ordens_servico")),
            sorted([
                ("Criação de OS: Falha", pk, None),
                ("Atualização de OS: Falha", pk, None),
                ("Exclusão de OS: Falha", pk, None),
            ]),
        )

    def test_plano_manutencao_criacao_atualizacao_exclusao(self):
        plano = PlanoManutencao.objects.create(
            descricao="d", tipo="preventiva", periodicidade_dias=30,
            proxima_execucao="2030-01-01", id_equipamento=self.c.equipamento,
        )
        plano.descricao = "d2"
        plano.save()
        texto = str(plano)
        pk = plano.pk
        plano.delete()

        acoes = [a for a, _, _ in self.logs("planos_manutencao")]
        self.assertEqual(
            sorted(acoes),
            sorted([
                f"Criação de plano: {texto}",
                f"Atualização de plano: {texto}",
                f"Exclusão de plano: {texto}",
            ]),
        )

    def test_fluxo_da_api_gera_log_de_atualizacao(self):
        ordem = OrdemServico.objects.create(
            titulo="Falha", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, solicitante=self.c.operador,
        )
        LogAuditoria.objects.all().delete()
        self.cliente(self.c.admin).patch(f"/api/ordens-servico/{ordem.pk}/rejeitar/")
        self.assertEqual(
            [a for a, _, _ in self.logs("ordens_servico")],
            ["Atualização de OS: Falha"],
        )
