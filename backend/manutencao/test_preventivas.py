"""Regras das manutencoes preventivas: calendario, geracao de OS, acoes do
plano, aviso de vencimento, agenda e indicadores."""

import io
from datetime import date, datetime, time, timedelta

from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from config.testutils import BaseTestCase, Cenario, criar_equipamento
from manutencao.indicadores import calcular_indicadores, montar_agenda
from manutencao.models import ExecucaoPlano, PlanoManutencao
from manutencao.services import (
    antecedencia_efetiva,
    avisar_planos_vencendo,
    datas_entre,
    executar_agora,
    gerar_preventivas_vencidas,
    pausar,
    proximas_datas,
    pular_proxima,
    retomar,
)
from notificacoes.models import Notificacao
from ordens_servico.models import OrdemServico

HOJE = date(2026, 6, 15)


def dias(n, base=HOJE):
    return base + timedelta(days=n)


def criar_plano(equipamento, **kwargs):
    kwargs.setdefault("descricao", "Lubrificar")
    kwargs.setdefault("tipo", PlanoManutencao.Tipo.PREVENTIVA)
    kwargs.setdefault("periodicidade_dias", 30)
    kwargs.setdefault("proxima_execucao", HOJE)
    return PlanoManutencao.objects.create(
        id_equipamento=equipamento, id_setor=equipamento.id_setor, **kwargs
    )


def criar_os_do_plano(plano, status=OrdemServico.Status.ABERTA, **kwargs):
    return OrdemServico.objects.create(
        titulo="Preventiva",
        tipo_manutencao=OrdemServico.TipoManutencao.PREVENTIVA,
        id_equipamento=plano.id_equipamento,
        plano_origem=plano,
        status=status,
        **kwargs,
    )


def concluir_em(ordem, dia):
    """Marca a OS como concluida ao meio-dia (hora local) do dia informado."""
    OrdemServico.objects.filter(pk=ordem.pk).update(
        status=OrdemServico.Status.CONCLUIDA,
        data_fim=timezone.make_aware(datetime.combine(dia, time(12))),
    )


def registrar(plano, data_prevista, ordem=None, status=ExecucaoPlano.Status.GERADA, motivo=""):
    return ExecucaoPlano.objects.create(
        id_plano=plano,
        id_equipamento=plano.id_equipamento,
        data_prevista=data_prevista,
        id_os=ordem,
        status=status,
        motivo=motivo,
    )


class CalendarioTests(SimpleTestCase):
    def test_datas_entre_segue_a_serie_do_plano(self):
        self.assertEqual(
            datas_entre(date(2026, 1, 1), 30, date(2026, 1, 1), date(2026, 3, 31)),
            [date(2026, 1, 1), date(2026, 1, 31), date(2026, 3, 2)],
        )

    def test_inicio_no_meio_do_ciclo_nao_desloca_a_serie(self):
        self.assertEqual(
            datas_entre(date(2026, 1, 1), 30, date(2026, 1, 15), date(2026, 3, 5)),
            [date(2026, 1, 31), date(2026, 3, 2)],
        )

    def test_nada_antes_da_primeira_data_nem_janela_invertida(self):
        self.assertEqual(
            datas_entre(date(2026, 1, 10), 7, date(2026, 1, 1), date(2026, 1, 12)),
            [date(2026, 1, 10)],
        )
        self.assertEqual(datas_entre(date(2026, 1, 1), 7, date(2026, 2, 1), date(2026, 1, 1)), [])

    def test_periodicidade_invalida(self):
        with self.assertRaisesMessage(ValueError, "A periodicidade deve ser maior que zero."):
            datas_entre(date(2026, 1, 1), 0, date(2026, 1, 1), date(2026, 2, 1))

    def test_proximas_datas(self):
        self.assertEqual(
            proximas_datas(date(2026, 1, 1), 7, date(2026, 1, 10), 3),
            [date(2026, 1, 15), date(2026, 1, 22), date(2026, 1, 29)],
        )
        # a partir de uma data anterior a primeira, comeca pela primeira
        self.assertEqual(
            proximas_datas(date(2026, 1, 1), 7, date(2025, 12, 1), 2),
            [date(2026, 1, 1), date(2026, 1, 8)],
        )
        self.assertEqual(proximas_datas(date(2026, 1, 1), 7, date(2026, 1, 1), 0), [])

    def test_antecedencia_limitada_a_periodicidade(self):
        plano = PlanoManutencao(periodicidade_dias=7, dias_antecedencia=10)
        self.assertEqual(antecedencia_efetiva(plano), 6)
        plano.dias_antecedencia = 2
        self.assertEqual(antecedencia_efetiva(plano), 2)


class GeracaoTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()

    def test_plano_que_ainda_nao_venceu_nao_gera(self):
        plano = criar_plano(self.c.equipamento, proxima_execucao=dias(1))
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 0, "puladas": 0, "erros": 0}
        )
        self.assertFalse(OrdemServico.objects.exists())
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, dias(1))

    def test_plano_vencido_gera_os_registra_execucao_e_avanca_calendario(self):
        plano = criar_plano(self.c.equipamento)
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 1, "puladas": 0, "erros": 0}
        )
        execucao = ExecucaoPlano.objects.get()
        self.assertEqual(execucao.status, ExecucaoPlano.Status.GERADA)
        self.assertEqual(execucao.data_prevista, HOJE)
        self.assertEqual(execucao.id_os.plano_origem, plano)
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, dias(30))

    def test_rodar_duas_vezes_no_mesmo_dia_nao_duplica(self):
        criar_plano(self.c.equipamento)
        gerar_preventivas_vencidas(HOJE)
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 0, "puladas": 0, "erros": 0}
        )
        self.assertEqual(OrdemServico.objects.count(), 1)
        self.assertEqual(ExecucaoPlano.objects.count(), 1)

    def test_worker_parado_gera_so_a_mais_recente_e_registra_as_atrasadas(self):
        plano = criar_plano(self.c.equipamento, proxima_execucao=dias(-90))
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 1, "puladas": 3, "erros": 0}
        )
        self.assertEqual(OrdemServico.objects.count(), 1)
        self.assertEqual(
            list(
                plano.execucoes.order_by("data_prevista").values_list(
                    "data_prevista", "status", "motivo"
                )
            ),
            [
                (dias(-90), "pulada", "atrasada"),
                (dias(-60), "pulada", "atrasada"),
                (dias(-30), "pulada", "atrasada"),
                (HOJE, "gerada", ""),
            ],
        )
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, dias(30))

    def test_antecedencia_gera_a_os_antes_da_data_prevista(self):
        plano = criar_plano(self.c.equipamento, proxima_execucao=dias(2), dias_antecedencia=2)
        gerar_preventivas_vencidas(HOJE)
        self.assertEqual(ExecucaoPlano.objects.get().data_prevista, dias(2))
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, dias(32))

    def test_antecedencia_menor_ainda_nao_gera(self):
        criar_plano(self.c.equipamento, proxima_execucao=dias(2), dias_antecedencia=1)
        gerar_preventivas_vencidas(HOJE)
        self.assertFalse(OrdemServico.objects.exists())

    def test_os_do_plano_em_aberto_pula_a_ocorrencia_sem_duplicar(self):
        plano = criar_plano(self.c.equipamento)
        anterior = criar_os_do_plano(plano, status=OrdemServico.Status.EM_ANDAMENTO)
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 0, "puladas": 1, "erros": 0}
        )
        self.assertEqual(list(OrdemServico.objects.all()), [anterior])
        execucao = ExecucaoPlano.objects.get()
        self.assertEqual(
            (execucao.status, execucao.motivo), ("pulada", "os_em_aberto")
        )
        plano.refresh_from_db()
        self.assertEqual(plano.proxima_execucao, dias(30))

    def test_os_concluida_ou_cancelada_do_plano_nao_bloqueia(self):
        plano = criar_plano(self.c.equipamento)
        criar_os_do_plano(plano, status=OrdemServico.Status.CONCLUIDA)
        criar_os_do_plano(plano, status=OrdemServico.Status.CANCELADA)
        self.assertEqual(gerar_preventivas_vencidas(HOJE)["geradas"], 1)

    def test_plano_pausado_preditivo_ou_de_equipamento_inativo_nao_gera(self):
        criar_plano(self.c.equipamento, ativo=False)
        criar_plano(self.c.equipamento, tipo=PlanoManutencao.Tipo.PREDITIVA)
        inativo = criar_equipamento(self.c.setor, status="inativo")
        criar_plano(inativo)
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 0, "puladas": 0, "erros": 0}
        )
        self.assertFalse(OrdemServico.objects.exists())

    def test_erro_em_um_plano_nao_impede_os_demais(self):
        criar_plano(self.c.equipamento, periodicidade_dias=0)  # legado invalido
        criar_plano(self.c.equipamento)
        with self.assertLogs("manutencao.services", level="ERROR"):
            resumo = gerar_preventivas_vencidas(HOJE)
        self.assertEqual(resumo, {"geradas": 1, "puladas": 0, "erros": 1})

    def test_os_gerada_avisa_os_admins(self):
        criar_plano(self.c.equipamento)
        gerar_preventivas_vencidas(HOJE)
        self.assertEqual(
            list(Notificacao.objects.values_list("id_usuario", "tipo")),
            [(self.c.admin.pk, Notificacao.Tipo.OS_ABERTA)],
        )


class AcoesPlanoTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.plano = criar_plano(self.c.equipamento, proxima_execucao=dias(10))

    def test_executar_agora_gera_a_proxima_ocorrencia_e_avanca(self):
        ordem = executar_agora(self.plano, HOJE)
        self.assertEqual(ordem.execucao_plano.data_prevista, dias(10))
        self.plano.refresh_from_db()
        self.assertEqual(self.plano.proxima_execucao, dias(40))

    def test_executar_agora_com_ocorrencias_vencidas_usa_a_mais_recente(self):
        self.plano.proxima_execucao = dias(-40)
        self.plano.save()
        ordem = executar_agora(self.plano, HOJE)
        self.assertEqual(ordem.execucao_plano.data_prevista, dias(-10))
        self.assertEqual(
            self.plano.execucoes.filter(status="pulada", motivo="atrasada").count(), 1
        )

    def test_executar_agora_com_os_em_aberto_e_recusado_sem_alterar_nada(self):
        aberta = criar_os_do_plano(self.plano)
        with self.assertRaisesMessage(
            ValueError, f"Já existe uma OS deste plano em aberto (OS #{aberta.id_os})."
        ):
            executar_agora(self.plano, HOJE)
        self.assertEqual(OrdemServico.objects.count(), 1)
        self.assertFalse(ExecucaoPlano.objects.exists())
        self.plano.refresh_from_db()
        self.assertEqual(self.plano.proxima_execucao, dias(10))

    def test_executar_agora_plano_pausado_ou_equipamento_inativo(self):
        pausar(self.plano)
        with self.assertRaisesMessage(ValueError, "Retome o plano antes de executá-lo."):
            executar_agora(self.plano, HOJE)

        self.plano.ativo = True
        self.c.equipamento.status = "inativo"
        self.c.equipamento.save()
        with self.assertRaisesMessage(ValueError, "Equipamento inativo não gera OS."):
            executar_agora(self.plano, HOJE)
        self.assertFalse(OrdemServico.objects.exists())

    def test_pular_proxima(self):
        pular_proxima(self.plano)
        execucao = ExecucaoPlano.objects.get()
        self.assertEqual(
            (execucao.data_prevista, execucao.status, execucao.motivo),
            (dias(10), "pulada", "manual"),
        )
        self.assertIsNone(execucao.id_os)
        self.plano.refresh_from_db()
        self.assertEqual(self.plano.proxima_execucao, dias(40))

    def test_pausar_e_retomar_validam_o_estado(self):
        pausar(self.plano)
        self.assertFalse(PlanoManutencao.objects.get().ativo)
        with self.assertRaisesMessage(ValueError, "O plano já está pausado."):
            pausar(self.plano)

        retomar(self.plano, HOJE)
        self.plano.refresh_from_db()
        self.assertTrue(self.plano.ativo)
        self.assertEqual(self.plano.proxima_execucao, dias(10))  # futura: mantida
        with self.assertRaisesMessage(ValueError, "O plano já está ativo."):
            retomar(self.plano, HOJE)

    def test_retomar_nao_recupera_ocorrencias_do_periodo_pausado(self):
        self.plano.proxima_execucao = dias(-45)
        self.plano.ativo = False
        self.plano.save()

        retomar(self.plano, HOJE)
        self.plano.refresh_from_db()
        self.assertEqual(self.plano.proxima_execucao, dias(15))  # serie: -45, -15, +15
        self.assertEqual(
            gerar_preventivas_vencidas(HOJE), {"geradas": 0, "puladas": 0, "erros": 0}
        )
        self.assertFalse(ExecucaoPlano.objects.exists())


@override_settings(PREVENTIVA_AVISO_DIAS=3)
class AvisoVencimentoTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()

    def avisos(self):
        return Notificacao.objects.filter(tipo=Notificacao.Tipo.PLANO_VENCENDO)

    def test_avisa_admins_e_tecnico_sugerido_uma_vez_por_ocorrencia(self):
        plano = criar_plano(
            self.c.equipamento,
            proxima_execucao=dias(3),
            tecnico_sugerido=self.c.vinculo_tecnico,
        )
        self.assertEqual(avisar_planos_vencendo(HOJE), 1)
        self.assertEqual(
            {n.id_usuario for n in self.avisos()}, {self.c.admin, self.c.tecnico}
        )
        aviso = self.avisos().first()
        self.assertEqual(aviso.titulo, "Preventiva vence em 3 dias")
        self.assertEqual(
            aviso.mensagem,
            f"{self.c.equipamento.tag} - Lubrificar (prevista para {dias(3):%d/%m/%Y}).",
        )
        self.assertIsNone(aviso.id_os)

        # rodar de novo nao repete o aviso da mesma ocorrencia
        self.assertEqual(avisar_planos_vencendo(dias(1)), 0)
        self.assertEqual(self.avisos().count(), 2)

        # a ocorrencia seguinte ganha um aviso novo
        PlanoManutencao.objects.filter(pk=plano.pk).update(proxima_execucao=dias(33))
        self.assertEqual(avisar_planos_vencendo(dias(31)), 1)
        self.assertEqual(self.avisos().count(), 4)

    def test_fora_da_janela_pausado_ou_inativo_nao_avisa(self):
        criar_plano(self.c.equipamento, proxima_execucao=dias(4))
        criar_plano(self.c.equipamento, proxima_execucao=dias(1), ativo=False)
        inativo = criar_equipamento(self.c.setor, status="inativo")
        criar_plano(inativo, proxima_execucao=dias(1))
        self.assertEqual(avisar_planos_vencendo(HOJE), 0)
        self.assertFalse(self.avisos().exists())

    def test_titulo_para_hoje_e_amanha(self):
        criar_plano(self.c.equipamento, proxima_execucao=HOJE)
        outro = criar_equipamento(self.c.setor)
        criar_plano(outro, proxima_execucao=dias(1))
        avisar_planos_vencendo(HOJE)
        self.assertEqual(
            set(self.avisos().values_list("titulo", flat=True)),
            {"Preventiva vence hoje", "Preventiva vence amanhã"},
        )


@override_settings(PREVENTIVA_TOLERANCIA_DIAS=3)
class AgendaTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.planos = PlanoManutencao.objects.visiveis_para(self.c.admin)

    def agenda(self, inicio=dias(-30), fim=dias(14)):
        return [
            (i["data_prevista"], i["status"])
            for i in montar_agenda(self.planos, inicio, fim, HOJE)
        ]

    def test_projeta_as_ocorrencias_futuras_dos_planos_ativos(self):
        criar_plano(self.c.equipamento, periodicidade_dias=7, proxima_execucao=dias(1))
        criar_plano(self.c.equipamento, proxima_execucao=dias(2), ativo=False)  # pausado
        self.assertEqual(
            self.agenda(HOJE, dias(14)), [(dias(1), "prevista"), (dias(8), "prevista")]
        )

    def test_status_das_ocorrencias_registradas(self):
        plano = criar_plano(self.c.equipamento, periodicidade_dias=7, proxima_execucao=dias(30))
        no_prazo = criar_os_do_plano(plano)
        concluir_em(no_prazo, dias(-26))
        fora_do_prazo = criar_os_do_plano(plano)
        concluir_em(fora_do_prazo, dias(-14))
        registrar(plano, dias(-28), no_prazo)
        registrar(plano, dias(-21), fora_do_prazo)
        registrar(plano, dias(-14), status="pulada", motivo="manual")
        registrar(plano, dias(-7), criar_os_do_plano(plano))  # aberta e vencida
        registrar(plano, dias(-1), criar_os_do_plano(plano, status="cancelada"))
        registrar(plano, HOJE, criar_os_do_plano(plano))  # aberta, no dia

        itens = montar_agenda(self.planos, dias(-30), dias(14), HOJE)
        self.assertEqual(
            [(i["data_prevista"], i["status"], i["no_prazo"]) for i in itens],
            [
                (dias(-28), "concluida", True),
                (dias(-21), "concluida", False),
                (dias(-14), "pulada", None),
                (dias(-7), "atrasada", None),
                (dias(-1), "cancelada", None),
                (HOJE, "gerada", None),
            ],
        )
        self.assertEqual(itens[0]["concluida_em"], dias(-26))
        self.assertEqual(itens[0]["id_os"], no_prazo.id_os)
        self.assertEqual(itens[2]["motivo"], "manual")

    def test_ocorrencia_vencida_ainda_nao_gerada_aparece_atrasada(self):
        criar_plano(self.c.equipamento, periodicidade_dias=7, proxima_execucao=dias(-3))
        self.assertEqual(
            self.agenda(dias(-7), dias(7)), [(dias(-3), "atrasada"), (dias(4), "prevista")]
        )

    def test_so_inclui_os_planos_informados(self):
        criar_plano(self.c.equipamento, proxima_execucao=dias(1))
        outra = Cenario()
        criar_plano(outra.equipamento, proxima_execucao=dias(1))
        self.assertEqual(len(self.agenda()), 1)

    def test_campos_do_item(self):
        criar_plano(
            self.c.equipamento,
            proxima_execucao=dias(1),
            tecnico_sugerido=self.c.vinculo_tecnico,
            duracao_estimada_horas="2.5",
            prioridade="alta",
        )
        (item,) = montar_agenda(self.planos, HOJE, dias(7), HOJE)
        self.assertEqual(item["equipamento_tag"], self.c.equipamento.tag)
        self.assertEqual(item["setor_nome"], self.c.setor.nome)
        self.assertEqual(item["tecnico_nome"], self.c.tecnico.nome)
        self.assertEqual(item["duracao_estimada_horas"], 2.5)
        self.assertEqual(item["prioridade"], "alta")
        self.assertIsNone(item["id_os"])


@override_settings(PREVENTIVA_TOLERANCIA_DIAS=3)
class IndicadoresTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.hoje = timezone.localdate()

    def indicadores(self):
        return calcular_indicadores(
            PlanoManutencao.objects.visiveis_para(self.c.admin),
            OrdemServico.objects.visiveis_para(self.c.admin),
            self.hoje,
        )

    def d(self, n):
        return dias(n, self.hoje)

    def test_sem_dados(self):
        resultado = self.indicadores()
        self.assertEqual(resultado["aderencia"], {"percentual": None, "no_prazo": 0, "avaliadas": 0})
        self.assertEqual(resultado["atrasadas"], 0)
        self.assertEqual(resultado["proximos_7_dias"], 0)
        self.assertEqual(
            resultado["manutencao_planejada"],
            {"preventivas": 0, "preditivas": 0, "corretivas": 0, "percentual_preventiva": None},
        )
        self.assertEqual(resultado["carga_tecnicos"], [])
        self.assertEqual(resultado["tolerancia_dias"], 3)

    def test_aderencia_considera_so_ocorrencias_com_prazo_encerrado(self):
        plano = criar_plano(self.c.equipamento, proxima_execucao=self.d(60), ativo=False)
        for prevista, concluida in ((-40, -37), (-30, -30), (-20, -10)):
            ordem = criar_os_do_plano(plano)
            concluir_em(ordem, self.d(concluida))
            registrar(plano, self.d(prevista), ordem)
        registrar(plano, self.d(-15), status="pulada", motivo="atrasada")  # conta
        registrar(plano, self.d(-12), status="pulada", motivo="manual")  # nao conta
        registrar(plano, self.d(-2), criar_os_do_plano(plano))  # prazo ainda aberto
        registrar(plano, self.d(-200), status="pulada", motivo="atrasada")  # fora da janela

        self.assertEqual(
            self.indicadores()["aderencia"],
            {"percentual": 0.5, "no_prazo": 2, "avaliadas": 4},
        )

    def test_atrasadas_e_proximos_7_dias(self):
        plano = criar_plano(self.c.equipamento, periodicidade_dias=7, proxima_execucao=self.d(-8))
        registrar(plano, self.d(-15), criar_os_do_plano(plano))  # gerada, em aberto, vencida
        # nao gerada: -8 e -1 vencidas; +6 dentro dos proximos 7 dias
        resultado = self.indicadores()
        self.assertEqual(resultado["atrasadas"], 3)
        self.assertEqual(resultado["proximos_7_dias"], 1)

    def test_manutencao_planejada(self):
        def criar(tipo, status="aberta", equipamento=self.c.equipamento):
            return OrdemServico.objects.create(
                titulo="x", tipo_manutencao=tipo, status=status, id_equipamento=equipamento
            )

        for _ in range(3):
            criar("preventiva")
        criar("corretiva")
        criar("corretiva", status="cancelada")
        criar("preditiva")
        antiga = criar("corretiva")
        OrdemServico.objects.filter(pk=antiga.pk).update(
            data_abertura=timezone.now() - timedelta(days=120)
        )
        criar("corretiva", equipamento=Cenario().equipamento)  # outra empresa

        self.assertEqual(
            self.indicadores()["manutencao_planejada"],
            {"preventivas": 3, "preditivas": 1, "corretivas": 1, "percentual_preventiva": 0.75},
        )

    def test_carga_por_tecnico_nas_proximas_4_semanas(self):
        criar_plano(
            self.c.equipamento,
            periodicidade_dias=7,
            proxima_execucao=self.hoje,
            tecnico_sugerido=self.c.vinculo_tecnico,
            duracao_estimada_horas="2.5",
        )
        criar_plano(self.c.equipamento, periodicidade_dias=30, proxima_execucao=self.d(5))
        self.assertEqual(
            self.indicadores()["carga_tecnicos"],
            [
                {
                    "id_tecnico": self.c.vinculo_tecnico.pk,
                    "nome": self.c.tecnico.nome,
                    "horas": 10.0,
                    "ocorrencias": 4,
                    "sem_estimativa": 0,
                },
                {
                    "id_tecnico": None,
                    "nome": "Sem técnico definido",
                    "horas": 0.0,
                    "ocorrencias": 1,
                    "sem_estimativa": 1,
                },
            ],
        )


class ComandoGerarPreventivasTests(BaseTestCase):
    def test_gera_e_resume(self):
        c = Cenario()
        criar_plano(c.equipamento, proxima_execucao=timezone.localdate())
        saida = io.StringIO()
        call_command("gerar_preventivas", stdout=saida)
        self.assertIn("OS geradas: 1", saida.getvalue())
        self.assertEqual(OrdemServico.objects.count(), 1)
