"""API da aba Preventivas: campos e validacoes do plano, situacao, filtros,
acoes (pausar/retomar/executar agora/pular), execucoes, agenda e indicadores."""

from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from config.testutils import BaseTestCase, Cenario, criar_equipamento, criar_setor
from manutencao.models import ExecucaoPlano, PlanoManutencao
from ordens_servico.models import OrdemServico

URL = "/api/planos-manutencao/"


def hoje(n=0):
    return timezone.localdate() + timedelta(days=n)


def criar_plano(equipamento, **kwargs):
    kwargs.setdefault("descricao", "Lubrificar")
    kwargs.setdefault("tipo", PlanoManutencao.Tipo.PREVENTIVA)
    kwargs.setdefault("periodicidade_dias", 30)
    kwargs.setdefault("proxima_execucao", hoje(20))
    return PlanoManutencao.objects.create(
        id_equipamento=equipamento, id_setor=equipamento.id_setor, **kwargs
    )


class PlanoApiBase(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def payload(self, **extra):
        return {
            "descricao": "Trocar filtro",
            "tipo": "preventiva",
            "periodicidade_dias": 30,
            "proxima_execucao": hoje(5).isoformat(),
            "id_equipamento": self.c.equipamento.pk,
            "id_setor": self.c.setor.pk,
            **extra,
        }

    def post(self, usuario=None, **extra):
        return self.cliente(usuario or self.c.admin).post(URL, self.payload(**extra), format="json")

    def acao(self, plano, nome, usuario=None):
        return self.cliente(usuario or self.c.admin).patch(f"{URL}{plano.pk}/{nome}/")


class CriacaoEValidacaoTests(PlanoApiBase):
    def test_cria_com_os_campos_de_agendamento(self):
        resp = self.post(
            dias_antecedencia=2,
            prioridade="alta",
            tecnico_sugerido=self.c.vinculo_tecnico.pk,
            duracao_estimada_horas="1.5",
            instrucoes="Desligar antes",
            ativo=False,  # somente leitura: muda por pausar/retomar
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data["ativo"])
        self.assertEqual(resp.data["dias_antecedencia"], 2)
        self.assertEqual(resp.data["prioridade"], "alta")
        self.assertEqual(resp.data["tecnico_nome"], self.c.tecnico.nome)
        self.assertEqual(resp.data["duracao_estimada_horas"], "1.5")
        self.assertEqual(resp.data["situacao"], "vence_em_breve")
        self.assertIsNone(resp.data["id_os_em_aberto"])

    def assert_400(self, resp, campo, mensagem):
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertEqual([str(e) for e in resp.data[campo]], [mensagem])

    def test_proxima_execucao_no_passado(self):
        self.assert_400(
            self.post(proxima_execucao=hoje(-1).isoformat()),
            "proxima_execucao",
            "A data da próxima execução não pode ser anterior a hoje.",
        )

    def test_editar_plano_atrasado_sem_mudar_a_data_continua_permitido(self):
        plano = criar_plano(self.c.equipamento, proxima_execucao=hoje(-3))
        url = f"{URL}{plano.pk}/"
        client = self.cliente(self.c.admin)
        resp = client.patch(
            url, {"descricao": "Nova", "proxima_execucao": hoje(-3).isoformat()}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        resp = client.patch(url, {"proxima_execucao": hoje(-2).isoformat()}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_antecedencia_deve_ser_menor_que_a_periodicidade(self):
        msg = "A antecedência deve ser menor que a periodicidade."
        self.assert_400(self.post(periodicidade_dias=7, dias_antecedencia=7), "dias_antecedencia", msg)
        plano = criar_plano(self.c.equipamento, periodicidade_dias=7)
        resp = self.cliente(self.c.admin).patch(
            f"{URL}{plano.pk}/", {"dias_antecedencia": 10}, format="json"
        )
        self.assert_400(resp, "dias_antecedencia", msg)

    def test_duracao_deve_ser_positiva(self):
        self.assert_400(
            self.post(duracao_estimada_horas="0"),
            "duracao_estimada_horas",
            "A duração estimada deve ser maior que zero.",
        )

    def test_tecnico_sugerido_de_outra_empresa_ou_que_nao_e_tecnico(self):
        self.assert_400(
            self.post(tecnico_sugerido=self.outra.vinculo_tecnico.pk),
            "tecnico_sugerido",
            "O técnico sugerido deve pertencer à sua empresa.",
        )
        self.assert_400(
            self.post(tecnico_sugerido=self.c.vinculo_operador.pk),
            "tecnico_sugerido",
            "O vínculo selecionado não é de técnico.",
        )

    def test_equipamento_inativo_nao_recebe_agendamento(self):
        self.c.equipamento.status = "inativo"
        self.c.equipamento.save()
        self.assert_400(
            self.post(),
            "id_equipamento",
            "Equipamento inativo não pode receber agendamento.",
        )
        # plano que ja existia continua editavel
        plano = criar_plano(self.c.equipamento)
        resp = self.cliente(self.c.admin).patch(
            f"{URL}{plano.pk}/",
            {"descricao": "x", "id_equipamento": self.c.equipamento.pk, "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_instrucoes_tem_limite(self):
        resp = self.post(instrucoes="x" * 2001)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("instrucoes", resp.data)


class SituacaoEFiltrosTests(PlanoApiBase):
    def situacoes(self, usuario=None, query=""):
        resp = self.cliente(usuario or self.c.admin).get(f"{URL}{query}")
        self.assertEqual(resp.status_code, 200)
        return {p["id_plano"]: p["situacao"] for p in resp.data}

    def test_situacao_de_cada_plano(self):
        eq = self.c.equipamento
        em_dia = criar_plano(eq, proxima_execucao=hoje(20))
        em_breve = criar_plano(eq, proxima_execucao=hoje(7))
        atrasado = criar_plano(eq, proxima_execucao=hoje(-1))
        pausado = criar_plano(eq, proxima_execucao=hoje(-1), ativo=False)
        inativo = criar_equipamento(self.c.setor, status="inativo")
        de_inativo = criar_plano(inativo)

        com_os = criar_plano(eq, proxima_execucao=hoje(30))
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="preventiva", id_equipamento=eq, plano_origem=com_os
        )
        ExecucaoPlano.objects.create(
            id_plano=com_os, id_equipamento=eq, data_prevista=hoje(0), id_os=ordem, status="gerada"
        )
        os_vencida = criar_plano(eq, proxima_execucao=hoje(30))
        ordem2 = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="preventiva", id_equipamento=eq,
            plano_origem=os_vencida, status="em_andamento",
        )
        ExecucaoPlano.objects.create(
            id_plano=os_vencida, id_equipamento=eq, data_prevista=hoje(-2), id_os=ordem2, status="gerada"
        )

        self.assertEqual(
            self.situacoes(),
            {
                em_dia.pk: "em_dia",
                em_breve.pk: "vence_em_breve",
                atrasado.pk: "atrasado",
                pausado.pk: "pausado",
                de_inativo.pk: "equipamento_inativo",
                com_os.pk: "os_em_aberto",
                os_vencida.pk: "atrasado",
            },
        )
        resp = self.cliente(self.c.admin).get(f"{URL}{com_os.pk}/")
        self.assertEqual(resp.data["id_os_em_aberto"], ordem.id_os)

    def test_listagem_nao_faz_uma_consulta_por_plano(self):
        def contar():
            with CaptureQueriesContext(connection) as ctx:
                self.cliente(self.c.admin).get(URL)
            return len(ctx)

        criar_plano(self.c.equipamento, tecnico_sugerido=self.c.vinculo_tecnico)
        uma = contar()
        for _ in range(4):
            criar_plano(self.c.equipamento, tecnico_sugerido=self.c.vinculo_tecnico)
        self.assertEqual(contar(), uma)

    def test_filtros(self):
        setor_b = criar_setor(self.c.empresa)
        eq_b = criar_equipamento(setor_b)
        p_a = criar_plano(self.c.equipamento, tecnico_sugerido=self.c.vinculo_tecnico)
        p_b = criar_plano(eq_b)
        p_pausado = criar_plano(eq_b, ativo=False)

        def ids(query):
            return set(self.situacoes(query=query))

        self.assertEqual(ids(f"?id_equipamento={eq_b.pk}"), {p_b.pk, p_pausado.pk})
        self.assertEqual(ids(f"?id_setor={self.c.setor.pk}"), {p_a.pk})
        self.assertEqual(ids("?ativo=false"), {p_pausado.pk})
        self.assertEqual(ids("?ativo=true"), {p_a.pk, p_b.pk})
        self.assertEqual(set(self.situacoes(self.c.tecnico, "?tecnico=me")), {p_a.pk})
        self.assertEqual(ids("?tecnico=me"), set())  # admin nao e tecnico sugerido

    def test_filtro_numerico_invalido_400(self):
        resp = self.cliente(self.c.admin).get(f"{URL}?id_setor=abc")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual([str(e) for e in resp.data["id_setor"]], ["Informe um número inteiro."])


class AcoesTests(PlanoApiBase):
    def setUp(self):
        super().setUp()
        self.plano = criar_plano(self.c.equipamento, proxima_execucao=hoje(10))

    def test_so_admin_executa_acoes(self):
        for nome in ("pausar", "retomar", "executar-agora", "pular-proxima"):
            for usuario in (self.c.operador, self.c.tecnico):
                self.assertEqual(self.acao(self.plano, nome, usuario).status_code, 403, nome)
        self.assertFalse(OrdemServico.objects.exists())
        self.assertFalse(ExecucaoPlano.objects.exists())

    def test_plano_de_outra_empresa_404(self):
        for nome in ("pausar", "retomar", "executar-agora", "pular-proxima"):
            self.assertEqual(self.acao(self.plano, nome, self.outra.admin).status_code, 404)

    def test_pausar_e_retomar(self):
        resp = self.acao(self.plano, "pausar")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual((resp.data["ativo"], resp.data["situacao"]), (False, "pausado"))
        self.assertEqual(
            self.acao(self.plano, "pausar").data, {"detail": "O plano já está pausado."}
        )
        resp = self.acao(self.plano, "retomar")
        self.assertEqual((resp.data["ativo"], resp.data["situacao"]), (True, "em_dia"))
        self.assertEqual(self.acao(self.plano, "retomar").status_code, 400)

    def test_executar_agora(self):
        resp = self.acao(self.plano, "executar-agora")
        self.assertEqual(resp.status_code, 200)
        ordem = OrdemServico.objects.get()
        self.assertEqual(resp.data["id_os"], ordem.id_os)
        self.assertEqual(resp.data["detail"], f"OS #{ordem.id_os} gerada e aguardando aprovação.")
        self.assertEqual(resp.data["plano"]["proxima_execucao"], hoje(40).isoformat())
        self.assertEqual(resp.data["plano"]["situacao"], "os_em_aberto")

        # com a OS ainda em aberto, executar de novo e recusado
        resp = self.acao(self.plano, "executar-agora")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data, {"detail": f"Já existe uma OS deste plano em aberto (OS #{ordem.id_os})."}
        )

    def test_pular_proxima(self):
        resp = self.acao(self.plano, "pular-proxima")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["proxima_execucao"], hoje(40).isoformat())
        self.assertEqual(ExecucaoPlano.objects.get().motivo, "manual")


class ExecucoesTests(PlanoApiBase):
    def test_historico_do_plano(self):
        plano = criar_plano(self.c.equipamento)
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="preventiva", id_equipamento=self.c.equipamento,
            plano_origem=plano, status="concluida", data_fim=timezone.now(),
        )
        ExecucaoPlano.objects.create(
            id_plano=plano, id_equipamento=self.c.equipamento, data_prevista=hoje(-1),
            id_os=ordem, status="gerada",
        )
        ExecucaoPlano.objects.create(
            id_plano=plano, id_equipamento=self.c.equipamento, data_prevista=hoje(-31),
            status="pulada", motivo="atrasada",
        )

        resp = self.cliente(self.c.operador).get(f"{URL}{plano.pk}/execucoes/")
        self.assertEqual(resp.status_code, 200)
        recente, antiga = resp.data
        self.assertEqual(recente["id_os"], ordem.id_os)
        self.assertEqual(recente["os_status"], "concluida")
        self.assertEqual(recente["os_concluida_em"], hoje(0).isoformat())
        self.assertTrue(recente["no_prazo"])
        self.assertEqual(antiga["motivo"], "atrasada")
        self.assertEqual(antiga["motivo_display"], "Ocorrência atrasada substituída pela mais recente")
        self.assertIsNone(antiga["no_prazo"])

        outra = self.cliente(self.outra.admin).get(f"{URL}{plano.pk}/execucoes/")
        self.assertEqual(outra.status_code, 404)


class AgendaEIndicadoresTests(PlanoApiBase):
    def setUp(self):
        super().setUp()
        self.setor_b = criar_setor(self.c.empresa)
        self.p_a = criar_plano(self.c.equipamento, periodicidade_dias=7, proxima_execucao=hoje(1))
        self.p_b = criar_plano(criar_equipamento(self.setor_b), proxima_execucao=hoje(2))
        criar_plano(self.outra.equipamento, proxima_execucao=hoje(1))

    def agenda(self, usuario, query=""):
        resp = self.cliente(usuario).get(f"{URL}agenda/{query}")
        self.assertEqual(resp.status_code, 200, resp.data)
        return resp.data

    def test_agenda_respeita_visibilidade_e_janela_padrao(self):
        admin = self.agenda(self.c.admin)
        # janela padrao: 7 dias atras ate 30 a frente
        self.assertEqual(
            [(i["id_plano"], i["data_prevista"]) for i in admin],
            [(self.p_a.pk, hoje(1)), (self.p_b.pk, hoje(2))]
            + [(self.p_a.pk, hoje(d)) for d in (8, 15, 22, 29)],
        )
        operador = self.agenda(self.c.operador)
        self.assertEqual({i["id_plano"] for i in operador}, {self.p_a.pk})

    def test_agenda_com_janela_e_filtro(self):
        itens = self.agenda(
            self.c.admin,
            f"?inicio={hoje(0).isoformat()}&fim={hoje(3).isoformat()}&id_setor={self.setor_b.pk}",
        )
        self.assertEqual([i["id_plano"] for i in itens], [self.p_b.pk])

    def test_agenda_janela_invalida_400(self):
        client = self.cliente(self.c.admin)
        casos = (
            (f"?inicio={hoje(5).isoformat()}&fim={hoje(0).isoformat()}",
             {"detail": "A data final deve ser igual ou posterior à inicial."}),
            (f"?inicio={hoje(0).isoformat()}&fim={hoje(367).isoformat()}",
             {"detail": "A agenda aceita no máximo 366 dias."}),
        )
        for query, esperado in casos:
            resp = client.get(f"{URL}agenda/{query}")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(resp.data, esperado)
        for invalida in ("ontem", "2026-13-45"):
            resp = client.get(f"{URL}agenda/?inicio={invalida}")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(
                [str(e) for e in resp.data["inicio"]], ["Informe a data no formato AAAA-MM-DD."]
            )

    def test_indicadores(self):
        resp = self.cliente(self.c.operador).get(f"{URL}indicadores/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            set(resp.data),
            {
                "hoje", "periodo_dias", "tolerancia_dias", "aderencia", "atrasadas",
                "proximos_7_dias", "manutencao_planejada", "carga_tecnicos",
            },
        )
        self.assertEqual(resp.data["periodo_dias"], 90)
        # operador so ve o setor do p_a: ocorrencias em +1 dia (dentro de 7 dias)
        self.assertEqual(resp.data["proximos_7_dias"], 1)

        admin = self.cliente(self.c.admin).get(f"{URL}indicadores/?dias=30").data
        self.assertEqual(admin["periodo_dias"], 30)
        self.assertEqual(admin["proximos_7_dias"], 2)

    def test_indicadores_periodo_invalido_400(self):
        for dias in ("0", "366"):
            resp = self.cliente(self.c.admin).get(f"{URL}indicadores/?dias={dias}")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(resp.data, {"detail": "O período deve ser de 1 a 365 dias."})

    def test_sem_autenticacao_401(self):
        for rota in ("agenda/", "indicadores/"):
            self.assertEqual(self.cliente().get(f"{URL}{rota}").status_code, 401)
