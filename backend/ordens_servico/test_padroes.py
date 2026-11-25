"""Garantias dos tres design patterns (GoF) do backend: Facade, Observer e
Strategy. Cada classe prova uma propriedade do padrao; o Gemini e mockado,
nenhum teste faz chamada externa."""

import json
from types import SimpleNamespace
from unittest.mock import patch

from django.test import override_settings

from config.testutils import BaseTestCase, Cenario, criar_equipamento, criar_usuario, vincular
from notificacoes.models import LogAuditoria
from notificacoes.services import NotificacaoService
from ordens_servico.models import OrdemServico
from ordens_servico.services import OrdemServicoService
from ordens_servico.triagem_ia import RespostaIAInvalida, consultar_gemini
from usuarios.models import Usuario, UsuarioSetor


class FacadeTransacaoTests(BaseTestCase):
    """Facade: cada acao da fachada de OS e uma transacao (tudo ou nada)."""

    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def nova_os(self, **kwargs):
        return OrdemServico.objects.create(
            titulo="Falha na esteira",
            tipo_manutencao=OrdemServico.TipoManutencao.CORRETIVA,
            id_equipamento=self.c.equipamento,
            solicitante=self.c.operador,
            **kwargs,
        )

    def test_aprovar_com_tecnico_de_outra_empresa_nao_altera_o_vinculo_dela(self):
        tecnico = criar_usuario(self.outra.empresa, Usuario.Perfil.TECNICO)
        vinculo = vincular(tecnico, self.outra.setor, UsuarioSetor.PerfilSetor.OPERADOR)

        with self.assertRaisesMessage(ValueError, "mesma empresa do admin"):
            OrdemServicoService.aprovar(self.nova_os(), self.c.admin, vinculo.pk)

        vinculo.refresh_from_db()
        self.assertEqual(vinculo.perfil_no_setor, UsuarioSetor.PerfilSetor.OPERADOR)

    def test_aprovar_desfaz_tudo_se_um_passo_falhar(self):
        ordem = self.nova_os()
        with patch.object(
            NotificacaoService, "notificar_aprovacao", side_effect=RuntimeError("falhou")
        ):
            with self.assertRaises(RuntimeError):
                OrdemServicoService.aprovar(ordem, self.c.admin, self.c.vinculo_tecnico.pk)

        ordem.refresh_from_db()
        self.c.equipamento.refresh_from_db()
        self.assertEqual(ordem.status, OrdemServico.Status.ABERTA)
        self.assertIsNone(ordem.tecnico_id)
        self.assertEqual(self.c.equipamento.status, "ativo")

    def test_concluir_desfaz_tudo_se_um_passo_falhar(self):
        ordem = self.nova_os(
            status=OrdemServico.Status.EM_ANDAMENTO, tecnico=self.c.vinculo_tecnico
        )
        self.c.equipamento.status = "em_manutencao"
        self.c.equipamento.save()

        with patch.object(
            NotificacaoService, "notificar_conclusao", side_effect=RuntimeError("falhou")
        ):
            with self.assertRaises(RuntimeError):
                OrdemServicoService.concluir(ordem, "Troca do rolamento", "2099-01-01")

        ordem.refresh_from_db()
        self.c.equipamento.refresh_from_db()
        self.assertEqual(ordem.status, OrdemServico.Status.EM_ANDAMENTO)
        self.assertIsNone(ordem.data_fim)
        self.assertEqual(self.c.equipamento.status, "em_manutencao")
        self.assertIsNone(self.c.equipamento.ultima_manutencao)


class ObserverAuditoriaTests(BaseTestCase):
    """Observer: toda mudanca de estado da OS chega ao log de auditoria,
    inclusive o cancelamento em lote."""

    def setUp(self):
        self.c = Cenario()

    def test_cancelamento_em_lote_gera_um_log_por_os(self):
        eq_iot = criar_equipamento(self.c.setor, tem_iot=True)
        canceladas = [
            OrdemServico.objects.create(
                titulo=f"OS {n}", tipo_manutencao="corretiva",
                id_equipamento=self.c.equipamento, solicitante=self.c.operador,
            )
            for n in (1, 2)
        ]
        iot = OrdemServico.objects.create(
            titulo="OS IoT", tipo_manutencao="preditiva", id_equipamento=eq_iot
        )
        LogAuditoria.objects.all().delete()

        total = OrdemServicoService.desativar_abertas(OrdemServico.objects.all())

        self.assertEqual(total, 2)
        self.assertEqual(
            sorted(
                LogAuditoria.objects.filter(tabela_afetada="ordens_servico").values_list(
                    "id_registro_afetado", "acao"
                )
            ),
            sorted((os.pk, f"Atualização de OS: {os.titulo}") for os in canceladas),
        )
        self.assertFalse(LogAuditoria.objects.filter(id_registro_afetado=iot.pk).exists())


@override_settings(GEMINI_API_KEY="chave-de-teste", GEMINI_MAX_RETRIES=2)
class StrategyValidadorTests(BaseTestCase):
    """Strategy: consultar_gemini (Context) aceita qualquer validador que
    cumpra o contrato ValidadorResposta, sem mudar uma linha."""

    def setUp(self):
        cliente = patch("ordens_servico.triagem_ia.genai.Client")
        dormir = patch("ordens_servico.triagem_ia.time.sleep")
        self.Client = cliente.start()
        dormir.start()
        self.addCleanup(cliente.stop)
        self.addCleanup(dormir.stop)
        self.gerar = self.Client.return_value.models.generate_content
        self.gerar.return_value = SimpleNamespace(text=json.dumps({"nota": 7}))

    def consultar(self, estrategia):
        return consultar_gemini("instrucao", "conteudo", {}, estrategia, {})

    def test_qualquer_estrategia_que_cumpra_o_contrato_e_aceita(self):
        def dobrar_nota(dados):
            return {"nota": dados["nota"] * 2}

        self.assertEqual(self.consultar(dobrar_nota), {"nota": 14})

    def test_estrategia_que_recusa_a_resposta_faz_o_context_tentar_de_novo(self):
        chamadas = []

        def recusa_a_primeira(dados):
            chamadas.append(dados)
            if len(chamadas) == 1:
                raise RespostaIAInvalida("primeira resposta ruim")
            return dados

        self.assertEqual(self.consultar(recusa_a_primeira), {"nota": 7})
        self.assertEqual(self.gerar.call_count, 2)
