from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone

from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    criar_usuario,
    vincular,
)
from equipamentos.models import Equipamento
from manutencao.models import PlanoManutencao
from notificacoes.models import Notificacao
from ordens_servico.models import OrdemServico
from ordens_servico.services import OrdemServicoService
from usuarios.models import Usuario, UsuarioSetor

URL = "/api/ordens-servico/"

CAMPOS_OS = {
    "id_os", "titulo", "descricao", "prioridade", "status", "tipo_manutencao",
    "custo", "data_abertura", "data_inicio", "data_fim", "proxima_manutencao",
    "relatorio_intervencao", "timestamp_retorno_operacao", "solicitante",
    "solicitante_nome", "solicitante_perfil", "tecnico", "tecnico_usuario_id",
    "id_equipamento", "equipamento_tag", "equipamento_nome", "origem",
    "requer_aprovacao_admin", "triagem_ia",
}


# "tecnico_nome" (e "solicitante_nome"/"solicitante_perfil" sem solicitante) sao
# omitidos pelo DRF quando a relacao e nula (SkipField); ver CAMPOS_COM_TECNICO.
CAMPOS_COM_TECNICO = CAMPOS_OS | {"tecnico_nome"}


def futuro(dias=30):
    return (timezone.localdate() + timedelta(days=dias)).isoformat()


class OSBase(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def os(self, solicitante="operador", **kwargs):
        if solicitante == "operador":
            solicitante = self.c.operador
        kwargs.setdefault("titulo", "Falha na esteira")
        kwargs.setdefault("tipo_manutencao", OrdemServico.TipoManutencao.CORRETIVA)
        kwargs.setdefault("id_equipamento", self.c.equipamento)
        return OrdemServico.objects.create(solicitante=solicitante, **kwargs)

    def patch(self, usuario, ordem, acao, dados=None):
        return self.cliente(usuario).patch(
            f"{URL}{ordem.pk}/{acao}/", dados or {}, format="json"
        )

    def notificacoes(self, ordem):
        return Notificacao.objects.filter(id_os=ordem)


class VisibilidadeTests(OSBase):
    def setUp(self):
        super().setUp()
        self.setor_b = criar_setor(self.c.empresa, "Setor B")
        self.eq_b = criar_equipamento(self.setor_b)
        self.os_a = self.os()
        self.os_b = self.os(id_equipamento=self.eq_b)
        self.os_outra = OrdemServico.objects.create(
            titulo="Outra", tipo_manutencao="corretiva",
            id_equipamento=self.outra.equipamento, solicitante=self.outra.operador,
        )

    def ids(self, usuario):
        resp = self.cliente(usuario).get(URL)
        self.assertEqual(resp.status_code, 200)
        return {o["id_os"] for o in resp.data}

    def test_admin_ve_todas_da_empresa(self):
        self.assertEqual(self.ids(self.c.admin), {self.os_a.pk, self.os_b.pk})

    def test_operador_ve_so_dos_seus_setores(self):
        self.assertEqual(self.ids(self.c.operador), {self.os_a.pk})

    def test_tecnico_ve_dos_seus_setores(self):
        self.assertEqual(self.ids(self.c.tecnico), {self.os_a.pk})

    def test_tecnico_tambem_ve_ordem_atribuida_a_ele_fora_dos_seus_setores(self):
        self.os_b.tecnico = self.c.vinculo_tecnico
        self.os_b.save()
        self.assertEqual(self.ids(self.c.tecnico), {self.os_a.pk, self.os_b.pk})

    def test_operador_nao_ve_ordem_atribuida_fora_dos_seus_setores(self):
        self.os_b.tecnico = self.c.vinculo_tecnico
        self.os_b.save()
        self.assertEqual(self.ids(self.c.operador), {self.os_a.pk})

    def test_tecnico_com_dois_vinculos_nao_duplica_ordens(self):
        vincular(self.c.tecnico, self.setor_b, UsuarioSetor.PerfilSetor.TECNICO)
        ids = [o["id_os"] for o in self.cliente(self.c.tecnico).get(URL).data]
        self.assertEqual(sorted(ids), sorted({self.os_a.pk, self.os_b.pk}))

    def test_ordem_de_outra_empresa_404(self):
        resp = self.cliente(self.c.admin).get(f"{URL}{self.os_outra.pk}/")
        self.assertEqual(resp.status_code, 404)

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get(URL).status_code, 401)

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get(f"{URL}{self.os_a.pk}/")
        self.assertEqual(set(resp.data), CAMPOS_OS)

    def test_campos_da_resposta_com_tecnico(self):
        self.os_a.tecnico = self.c.vinculo_tecnico
        self.os_a.save()
        resp = self.cliente(self.c.admin).get(f"{URL}{self.os_a.pk}/")
        self.assertEqual(set(resp.data), CAMPOS_COM_TECNICO)


class OrigemTests(OSBase):
    def _origem(self, ordem):
        return self.cliente(self.c.admin).get(f"{URL}{ordem.pk}/").data

    def test_origem_e_o_perfil_do_solicitante(self):
        for solicitante, esperado in (
            (self.c.operador, "operador"),
            (self.c.admin, "admin"),
            (self.c.tecnico, "tecnico"),
        ):
            data = self._origem(self.os(solicitante=solicitante))
            self.assertEqual(data["origem"], esperado)

    def test_origem_iot(self):
        eq_iot = criar_equipamento(self.c.setor, tem_iot=True)
        ordem = self.os(
            solicitante=None, id_equipamento=eq_iot,
            tipo_manutencao=OrdemServico.TipoManutencao.PREDITIVA,
        )
        data = self._origem(ordem)
        self.assertEqual(data["origem"], "iot")
        self.assertTrue(data["requer_aprovacao_admin"])  # toda OS aberta aguarda o admin
        self.assertNotIn("solicitante_nome", data)
        self.assertNotIn("solicitante_perfil", data)

    def test_origem_sistema(self):
        preventiva = self.os(
            solicitante=None, tipo_manutencao=OrdemServico.TipoManutencao.PREVENTIVA
        )
        preditiva_sem_iot = self.os(
            solicitante=None, tipo_manutencao=OrdemServico.TipoManutencao.PREDITIVA
        )
        self.assertEqual(self._origem(preventiva)["origem"], "sistema")
        self.assertEqual(self._origem(preditiva_sem_iot)["origem"], "sistema")

    def test_requer_aprovacao_reflete_apenas_o_status_aberta(self):
        # Toda OS aberta aguarda decisao do admin, independente de quem a abriu.
        for solicitante in (self.c.operador, self.c.admin, self.c.tecnico, None):
            self.assertTrue(
                self._origem(self.os(solicitante=solicitante))["requer_aprovacao_admin"]
            )
        nao_aberta = self.os(status="em_andamento")
        self.assertFalse(self._origem(nao_aberta)["requer_aprovacao_admin"])

    def test_tecnico_usuario_id(self):
        ordem = self.os(tecnico=self.c.vinculo_tecnico)
        self.assertEqual(
            self._origem(ordem)["tecnico_usuario_id"], self.c.tecnico.pk
        )
        self.assertIsNone(self._origem(self.os())["tecnico_usuario_id"])


class CriacaoTests(OSBase):
    payload = {
        "titulo": "Vazamento",
        "descricao": "Vazando oleo",
        "tipo_manutencao": "corretiva",
        "prioridade": "alta",
    }

    def _criar(self, usuario, **extra):
        return self.cliente(usuario).post(
            URL,
            {**self.payload, "id_equipamento": self.c.equipamento.pk, **extra},
            format="json",
        )

    def test_solicitante_e_sempre_o_usuario_autenticado(self):
        resp = self._criar(self.c.operador, solicitante=self.c.admin.pk)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["solicitante"], self.c.operador.pk)
        self.assertEqual(resp.data["solicitante_nome"], self.c.operador.nome)
        self.assertEqual(resp.data["solicitante_perfil"], "operador")
        self.assertEqual(resp.data["origem"], "operador")
        self.assertTrue(resp.data["requer_aprovacao_admin"])
        self.assertEqual(resp.data["status"], "aberta")
        self.assertEqual(set(resp.data), CAMPOS_OS)

    def test_operador_notifica_admins_ativos_da_empresa(self):
        admin2 = criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN)
        criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN, is_active=False)
        # admin de outra empresa nao e notificado (self.outra.admin)

        resp = self._criar(self.c.operador)
        ordem = OrdemServico.objects.get(pk=resp.data["id_os"])

        notifs = self.notificacoes(ordem)
        self.assertEqual(
            {n.id_usuario_id for n in notifs}, {self.c.admin.pk, admin2.pk}
        )
        for n in notifs:
            self.assertEqual(n.tipo, Notificacao.Tipo.OS_ABERTA)
            self.assertEqual(n.canal, Notificacao.Canal.PUSH)
            self.assertEqual(n.titulo, f"OS #{ordem.pk} aguardando aprovação")
            self.assertEqual(
                n.mensagem, f"{self.c.operador.nome} abriu uma OS: Vazamento"
            )
            self.assertFalse(n.lida)

    def test_admin_abrindo_os_requer_aprovacao_mas_nao_se_autonotifica(self):
        # Com apenas 1 admin na empresa (o proprio solicitante), ninguem mais
        # para notificar — mas a OS fica igualmente aguardando aprovacao.
        resp = self._criar(self.c.admin)
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(Notificacao.objects.exists())
        self.assertTrue(resp.data["requer_aprovacao_admin"])
        self.assertEqual(resp.data["origem"], "admin")

    def test_admin_abrindo_os_notifica_outros_admins_da_empresa(self):
        admin2 = criar_usuario(self.c.empresa, Usuario.Perfil.ADMIN)
        resp = self._criar(self.c.admin)
        ordem = OrdemServico.objects.get(pk=resp.data["id_os"])
        notifs = self.notificacoes(ordem)
        self.assertEqual({n.id_usuario_id for n in notifs}, {admin2.pk})
        self.assertEqual(
            notifs.get().mensagem, f"{self.c.admin.nome} abriu uma OS: Vazamento"
        )

    def test_tecnico_abrindo_os_requer_aprovacao_e_notifica_admin(self):
        resp = self._criar(self.c.tecnico)
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["requer_aprovacao_admin"])
        n = self.notificacoes(OrdemServico.objects.get(pk=resp.data["id_os"])).get()
        self.assertEqual(n.id_usuario, self.c.admin)
        self.assertEqual(n.mensagem, f"{self.c.tecnico.nome} abriu uma OS: Vazamento")

    def test_operador_sem_outros_admins_nao_falha(self):
        Usuario.objects.filter(pk=self.c.admin.pk).update(is_active=False)
        resp = self._criar(self.c.operador)
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(Notificacao.objects.exists())

    def test_campos_obrigatorios(self):
        resp = self.cliente(self.c.operador).post(URL, {}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(set(resp.data), {"titulo", "tipo_manutencao"})

    def test_campos_somente_leitura_sao_ignorados(self):
        resp = self._criar(self.c.operador, data_inicio="2020-01-01T00:00:00Z")
        self.assertIsNone(resp.data["data_inicio"])


class EscopoEmpresaNaEscritaTests(OSBase):
    def _payload(self, **extra):
        return {"titulo": "Vazamento", "tipo_manutencao": "corretiva", **extra}

    def test_criar_com_equipamento_de_outra_empresa_400(self):
        resp = self.cliente(self.c.operador).post(
            URL, self._payload(id_equipamento=self.outra.equipamento.pk), format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_equipamento"]],
            ["Você não pode usar um equipamento fora da sua empresa."],
        )
        self.assertFalse(OrdemServico.objects.exists())
        self.assertFalse(Notificacao.objects.exists())

    def test_criar_com_equipamento_sem_setor_400(self):
        sem_setor = criar_equipamento(None)
        resp = self.cliente(self.c.operador).post(
            URL, self._payload(id_equipamento=sem_setor.pk), format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_criar_com_equipamento_da_propria_empresa_ou_sem_equipamento(self):
        client = self.cliente(self.c.operador)
        ok = client.post(URL, self._payload(id_equipamento=self.c.equipamento.pk), format="json")
        self.assertEqual(ok.status_code, 201)
        sem = client.post(URL, self._payload(), format="json")
        self.assertEqual(sem.status_code, 201)

    def test_editar_trocando_para_equipamento_de_outra_empresa_400(self):
        ordem = self.os()
        resp = self.cliente(self.c.operador).patch(
            f"{URL}{ordem.pk}/", {"id_equipamento": self.outra.equipamento.pk}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        ordem.refresh_from_db()
        self.assertEqual(ordem.id_equipamento, self.c.equipamento)

    def test_editar_outros_campos_nao_revalida_o_equipamento(self):
        ordem = self.os()
        resp = self.cliente(self.c.operador).patch(
            f"{URL}{ordem.pk}/", {"titulo": "Novo titulo"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

    def test_tecnico_de_outra_empresa_no_post_e_no_patch_400(self):
        client = self.cliente(self.c.admin)
        criar = client.post(
            URL, self._payload(tecnico=self.outra.vinculo_tecnico.pk), format="json"
        )
        self.assertEqual(criar.status_code, 400)
        self.assertEqual(
            [str(e) for e in criar.data["tecnico"]],
            ["O técnico atribuído deve pertencer à sua empresa."],
        )
        ordem = self.os()
        editar = client.patch(
            f"{URL}{ordem.pk}/", {"tecnico": self.outra.vinculo_tecnico.pk}, format="json"
        )
        self.assertEqual(editar.status_code, 400)
        ordem.refresh_from_db()
        self.assertIsNone(ordem.tecnico)

    def test_tecnico_da_propria_empresa_e_aceito(self):
        resp = self.cliente(self.c.admin).post(
            URL, self._payload(tecnico=self.c.vinculo_tecnico.pk), format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["tecnico"], self.c.vinculo_tecnico.pk)

    def test_nao_abre_os_para_equipamento_inativo(self):
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="inativo")
        resp = self.cliente(self.c.operador).post(
            URL, self._payload(id_equipamento=self.c.equipamento.pk), format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_equipamento"]],
            ["Não é possível abrir uma ordem de serviço para um equipamento inativo."],
        )
        self.assertFalse(OrdemServico.objects.exists())

    def test_nao_move_os_para_equipamento_inativo_ao_editar(self):
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="inativo")
        outro_equipamento = criar_equipamento(self.c.setor)
        ordem = self.os(id_equipamento=outro_equipamento)
        resp = self.cliente(self.c.admin).patch(
            f"{URL}{ordem.pk}/", {"id_equipamento": self.c.equipamento.pk}, format="json"
        )
        self.assertEqual(resp.status_code, 400)


class AprovarTests(OSBase):
    def test_apenas_admin(self):
        ordem = self.os()
        for usuario in (self.c.operador, self.c.tecnico):
            resp = self.patch(usuario, ordem, "aprovar")
            self.assertEqual(resp.status_code, 403)
            self.assertEqual(
                resp.data, {"detail": "Apenas administradores podem aprovar ordens de servico."}
            )

    def test_aprova_sem_tecnico(self):
        ordem = self.os()
        resp = self.patch(self.c.admin, ordem, "aprovar")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "em_andamento")
        self.assertIsNone(resp.data["tecnico"])

        notifs = self.notificacoes(ordem)
        self.assertEqual(notifs.count(), 1)
        n = notifs.get()
        self.assertEqual(n.id_usuario, self.c.operador)
        self.assertEqual(n.tipo, Notificacao.Tipo.OS_ATUALIZADA)
        self.assertEqual(n.titulo, f"OS #{ordem.pk} aprovada")
        self.assertEqual(
            n.mensagem, "Sua ordem de servico foi aprovada pelo administrador."
        )

    def test_aprova_com_tecnico_notifica_solicitante_e_tecnico(self):
        ordem = self.os(prioridade="alta")
        resp = self.patch(
            self.c.admin, ordem, "aprovar", {"tecnico_id": self.c.vinculo_tecnico.pk}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["tecnico"], self.c.vinculo_tecnico.pk)
        self.assertEqual(resp.data["tecnico_nome"], self.c.tecnico.nome)
        ordem.refresh_from_db()
        self.assertEqual(ordem.tecnico, self.c.vinculo_tecnico)

        solicitante_n = self.notificacoes(ordem).get(id_usuario=self.c.operador)
        self.assertEqual(
            solicitante_n.mensagem,
            "Sua ordem de servico foi aprovada e atribuida ao tecnico "
            f"{self.c.tecnico.nome}.",
        )
        tecnico_n = self.notificacoes(ordem).get(id_usuario=self.c.tecnico)
        self.assertEqual(tecnico_n.titulo, f"Nova OS #{ordem.pk} atribuida")
        self.assertEqual(tecnico_n.mensagem, f"Prioridade alta. {ordem.titulo}")
        self.assertEqual(tecnico_n.tipo, Notificacao.Tipo.OS_ATUALIZADA)

    def test_tecnico_id_vazio_equivale_a_sem_tecnico(self):
        ordem = self.os()
        resp = self.patch(self.c.admin, ordem, "aprovar", {"tecnico_id": ""})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["tecnico"])

    def test_tecnico_id_invalido_400(self):
        ordem = self.os()
        for valor in ("abc", 999999):
            resp = self.patch(self.c.admin, ordem, "aprovar", {"tecnico_id": valor})
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(resp.data, {"detail": "Tecnico invalido para atribuicao."})
        ordem.refresh_from_db()
        self.assertEqual(ordem.status, "aberta")

    def test_vinculo_que_nao_e_de_tecnico_400(self):
        ordem = self.os()
        resp = self.patch(
            self.c.admin, ordem, "aprovar", {"tecnico_id": self.c.vinculo_operador.pk}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"detail": "O vinculo selecionado nao e de tecnico."})

    def test_vinculo_de_usuario_tecnico_e_promovido_a_tecnico_no_setor(self):
        novo = criar_usuario(self.c.empresa, Usuario.Perfil.TECNICO)
        vinculo = vincular(novo, self.c.setor, UsuarioSetor.PerfilSetor.OPERADOR)
        ordem = self.os()
        resp = self.patch(self.c.admin, ordem, "aprovar", {"tecnico_id": vinculo.pk})
        self.assertEqual(resp.status_code, 200)
        vinculo.refresh_from_db()
        self.assertEqual(vinculo.perfil_no_setor, UsuarioSetor.PerfilSetor.TECNICO)

    def test_tecnico_de_outra_empresa_400(self):
        ordem = self.os()
        resp = self.patch(
            self.c.admin, ordem, "aprovar",
            {"tecnico_id": self.outra.vinculo_tecnico.pk},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data, {"detail": "O tecnico deve pertencer a mesma empresa do admin."}
        )

    def test_aprova_os_aberta_por_admin_tecnico_ou_sistema(self):
        for solicitante in (self.c.admin, self.c.tecnico, None):
            ordem = self.os(solicitante=solicitante)
            resp = self.patch(self.c.admin, ordem, "aprovar")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.data["status"], "em_andamento")

    def test_os_cancelada_400(self):
        ordem = self.os(status="cancelada")
        resp = self.patch(self.c.admin, ordem, "aprovar")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"detail": "Esta OS ja foi rejeitada/cancelada."})

    def test_os_fora_de_aberta_400(self):
        ordem = self.os(status="em_andamento")
        resp = self.patch(self.c.admin, ordem, "aprovar")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data, {"detail": "Apenas OS com status aberta podem ser aprovadas."}
        )

    def test_os_de_outra_empresa_404(self):
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.outra.equipamento, solicitante=self.outra.operador,
        )
        self.assertEqual(self.patch(self.c.admin, ordem, "aprovar").status_code, 404)

    def test_aprovar_marca_equipamento_em_manutencao(self):
        ordem = self.os()
        self.assertEqual(self.c.equipamento.status, "ativo")
        resp = self.patch(self.c.admin, ordem, "aprovar")
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "em_manutencao")

    def test_aprovar_nao_sobrescreve_equipamento_inativo(self):
        # Equipamento marcado inativo depois que a OS ja estava aberta.
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="inativo")
        ordem = self.os()
        resp = self.patch(self.c.admin, ordem, "aprovar")
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "inativo")

    def test_aprovar_sem_equipamento_nao_quebra(self):
        # Via API, o admin nem conseguiria ver essa OS (visiveis_para exige
        # id_equipamento para o admin); chamando o service direto, testamos
        # so o guard de "sem equipamento" em _marcar_equipamento_em_manutencao.
        ordem = self.os(id_equipamento=None)
        resultado = OrdemServicoService.aprovar(ordem, self.c.admin)
        self.assertEqual(resultado.status, "em_andamento")


class RejeitarTests(OSBase):
    def test_apenas_admin(self):
        resp = self.patch(self.c.operador, self.os(), "rejeitar")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            resp.data, {"detail": "Apenas administradores podem rejeitar ordens de servico."}
        )

    def test_rejeita_e_notifica_solicitante(self):
        ordem = self.os()
        resp = self.patch(self.c.admin, ordem, "rejeitar")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "cancelada")
        n = self.notificacoes(ordem).get()
        self.assertEqual(n.id_usuario, self.c.operador)
        self.assertEqual(n.tipo, Notificacao.Tipo.OS_ATUALIZADA)
        self.assertEqual(n.titulo, f"OS #{ordem.pk} rejeitada")
        self.assertEqual(
            n.mensagem, "Sua ordem de servico foi rejeitada pelo administrador."
        )

    def test_erros_400(self):
        casos = (
            (self.os(status="cancelada"), "Esta OS ja foi rejeitada/cancelada."),
            (
                self.os(status="em_andamento"),
                "Apenas OS com status aberta podem ser rejeitadas.",
            ),
        )
        for ordem, mensagem in casos:
            resp = self.patch(self.c.admin, ordem, "rejeitar")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(resp.data, {"detail": mensagem})

    def test_rejeita_os_aberta_por_admin_ou_tecnico_e_notifica_o_solicitante(self):
        for solicitante in (self.c.admin, self.c.tecnico):
            ordem = self.os(solicitante=solicitante)
            resp = self.patch(self.c.admin, ordem, "rejeitar")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.data["status"], "cancelada")
            n = self.notificacoes(ordem).get()
            self.assertEqual(n.id_usuario, solicitante)

    def test_rejeita_os_do_sistema_sem_solicitante_nao_notifica_nem_quebra(self):
        ordem = self.os(solicitante=None)
        resp = self.patch(self.c.admin, ordem, "rejeitar")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(self.notificacoes(ordem).exists())


class ReabrirTests(OSBase):
    def test_apenas_admin(self):
        resp = self.patch(self.c.tecnico, self.os(status="cancelada"), "reabrir")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            resp.data, {"detail": "Apenas administradores podem reabrir ordens de servico."}
        )

    def test_reabre_concluida_limpando_datas_e_notifica(self):
        agora = timezone.now()
        ordem = self.os(
            status="concluida", data_inicio=agora, data_fim=agora,
            proxima_manutencao=timezone.localdate(), timestamp_retorno_operacao=agora,
        )
        resp = self.patch(self.c.admin, ordem, "reabrir")
        self.assertEqual(resp.status_code, 200)
        ordem.refresh_from_db()
        self.assertEqual(ordem.status, "aberta")
        self.assertIsNone(ordem.data_inicio)
        self.assertIsNone(ordem.data_fim)
        self.assertIsNone(ordem.proxima_manutencao)
        self.assertIsNone(ordem.timestamp_retorno_operacao)

        n = self.notificacoes(ordem).get()
        self.assertEqual(n.id_usuario, self.c.operador)
        self.assertEqual(n.titulo, f"OS #{ordem.pk} reaberta")
        self.assertEqual(
            n.mensagem, "Sua ordem de servico foi reaberta pelo administrador."
        )

    def test_reabre_cancelada(self):
        ordem = self.os(status="cancelada")
        resp = self.patch(self.c.admin, ordem, "reabrir")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "aberta")

    def test_os_sem_solicitante_reabre_sem_notificar(self):
        ordem = self.os(solicitante=None, status="cancelada")
        resp = self.patch(self.c.admin, ordem, "reabrir")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(self.notificacoes(ordem).exists())

    def test_status_invalido_400(self):
        for status in ("aberta", "em_andamento"):
            resp = self.patch(self.c.admin, self.os(status=status), "reabrir")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(
                resp.data,
                {"detail": "Apenas OS canceladas ou concluidas podem ser reabertas."},
            )


class IniciarTests(OSBase):
    def em_andamento(self, **kwargs):
        return self.os(
            status="em_andamento", tecnico=self.c.vinculo_tecnico, **kwargs
        )

    def test_apenas_tecnico_atribuido(self):
        ordem = self.em_andamento()
        outro = criar_usuario(self.c.empresa, Usuario.Perfil.TECNICO)
        vincular(outro, self.c.setor, UsuarioSetor.PerfilSetor.TECNICO)
        for usuario in (self.c.admin, self.c.operador, outro):
            resp = self.patch(usuario, ordem, "iniciar")
            self.assertEqual(resp.status_code, 403)
            self.assertEqual(
                resp.data, {"detail": "Apenas o tecnico atribuido pode iniciar esta OS."}
            )

    def test_os_sem_tecnico_403(self):
        ordem = self.os(status="em_andamento")
        self.assertEqual(self.patch(self.c.tecnico, ordem, "iniciar").status_code, 403)

    def test_inicia_e_registra_data_inicio(self):
        ordem = self.em_andamento()
        resp = self.patch(self.c.tecnico, ordem, "iniciar")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data["data_inicio"])
        self.assertEqual(resp.data["status"], "em_andamento")

    def test_iniciar_de_novo_mantem_a_data_original(self):
        original = timezone.now() - timedelta(days=1)
        ordem = self.em_andamento(data_inicio=original)
        self.patch(self.c.tecnico, ordem, "iniciar")
        ordem.refresh_from_db()
        self.assertEqual(ordem.data_inicio, original)

    def test_status_diferente_de_em_andamento_400(self):
        ordem = self.os(status="aberta", tecnico=self.c.vinculo_tecnico)
        resp = self.patch(self.c.tecnico, ordem, "iniciar")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data, {"detail": "Apenas OS em andamento podem ser iniciadas."}
        )

    def test_ordem_invisivel_da_404_antes_da_checagem_de_permissao(self):
        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.outra.equipamento, solicitante=self.outra.operador,
        )
        self.assertEqual(self.patch(self.c.tecnico, ordem, "iniciar").status_code, 404)


class ConcluirTests(OSBase):
    def em_andamento(self, **kwargs):
        return self.os(status="em_andamento", tecnico=self.c.vinculo_tecnico, **kwargs)

    def test_apenas_tecnico_atribuido(self):
        ordem = self.em_andamento()
        for usuario in (self.c.admin, self.c.operador):
            resp = self.patch(usuario, ordem, "concluir", {"proxima_manutencao": futuro()})
            self.assertEqual(resp.status_code, 403)
            self.assertEqual(
                resp.data, {"detail": "Apenas o tecnico atribuido pode concluir esta OS."}
            )

    def test_conclui_atualiza_ordem_equipamento_e_notifica(self):
        ordem = self.em_andamento()
        resp = self.patch(
            self.c.tecnico, ordem, "concluir",
            {"proxima_manutencao": futuro(30), "relatorio_intervencao": "  Trocado rolamento  "},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "concluida")
        self.assertEqual(resp.data["relatorio_intervencao"], "Trocado rolamento")
        self.assertEqual(resp.data["proxima_manutencao"], futuro(30))
        self.assertIsNotNone(resp.data["data_inicio"])
        self.assertIsNotNone(resp.data["data_fim"])
        self.assertEqual(
            resp.data["data_fim"], resp.data["timestamp_retorno_operacao"]
        )

        equipamento = self.c.equipamento
        equipamento.refresh_from_db()
        self.assertIsNotNone(equipamento.ultima_manutencao)
        self.assertEqual(equipamento.proxima_manutencao.isoformat(), futuro(30))

        n = self.notificacoes(ordem).get()
        self.assertEqual(n.id_usuario, self.c.operador)
        self.assertEqual(n.tipo, Notificacao.Tipo.OS_CONCLUIDA)
        self.assertEqual(n.titulo, f"OS #{ordem.pk} concluida")
        self.assertEqual(
            n.mensagem, "Sua ordem de servico foi concluida pelo tecnico."
        )

    def test_conclui_mantem_data_inicio_existente_e_relatorio_ausente(self):
        inicio = timezone.now() - timedelta(hours=3)
        ordem = self.em_andamento(data_inicio=inicio, relatorio_intervencao="antigo")
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        ordem.refresh_from_db()
        self.assertEqual(ordem.data_inicio, inicio)
        self.assertEqual(ordem.relatorio_intervencao, "antigo")

    def test_proxima_manutencao_hoje_e_aceita(self):
        ordem = self.em_andamento()
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro(0)}
        )
        self.assertEqual(resp.status_code, 200)

    def test_erros_de_proxima_manutencao_400(self):
        casos = (
            ({}, "Informe a data da proxima manutencao."),
            ({"proxima_manutencao": ""}, "Informe a data da proxima manutencao."),
            ({"proxima_manutencao": "texto"}, "Data da proxima manutencao invalida."),
            (
                {"proxima_manutencao": futuro(-1)},
                "A proxima manutencao nao pode ser anterior a hoje.",
            ),
        )
        for dados, mensagem in casos:
            ordem = self.em_andamento()
            resp = self.patch(self.c.tecnico, ordem, "concluir", dados)
            self.assertEqual(resp.status_code, 400, dados)
            self.assertEqual(resp.data, {"detail": mensagem})
            ordem.refresh_from_db()
            self.assertEqual(ordem.status, "em_andamento")

    def test_status_diferente_de_em_andamento_400(self):
        ordem = self.os(status="aberta", tecnico=self.c.vinculo_tecnico)
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data, {"detail": "Apenas OS em andamento podem ser concluidas."}
        )

    def test_os_sem_solicitante_conclui_sem_notificar(self):
        ordem = self.em_andamento(solicitante=None)
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(self.notificacoes(ordem).exists())

    def test_os_sem_equipamento_conclui_sem_atualizar_equipamento(self):
        ordem = self.os(
            status="em_andamento", tecnico=self.c.vinculo_tecnico, id_equipamento=None
        )
        # sem equipamento a OS nao e visivel por setor, mas o tecnico atribuido ve
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)

    def test_conclui_os_preventiva_registra_ultima_manutencao_no_plano(self):
        plano = PlanoManutencao.objects.create(
            descricao="Lubrificar", tipo="preventiva", periodicidade_dias=30,
            proxima_execucao=timezone.localdate() + timedelta(days=30),
            id_equipamento=self.c.equipamento, id_setor=self.c.setor,
        )
        ordem = self.em_andamento(plano_origem=plano)

        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("plano_origem", resp.data)

        plano.refresh_from_db()
        ordem.refresh_from_db()
        self.assertIsNotNone(plano.ultima_manutencao)
        self.assertEqual(plano.ultima_manutencao, ordem.data_fim)

    def test_conclui_os_sem_plano_origem_nao_toca_em_nenhum_plano(self):
        ordem = self.em_andamento()
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(PlanoManutencao.objects.exists())

    def test_conclui_volta_equipamento_para_ativo_quando_nao_ha_outra_os_ativa(self):
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="em_manutencao")
        ordem = self.em_andamento()
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "ativo")

    def test_conclui_mantem_em_manutencao_se_outra_os_ainda_ativa(self):
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="em_manutencao")
        outra_ordem = self.os(status="em_andamento", tecnico=self.c.vinculo_tecnico)
        ordem = self.em_andamento()

        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "em_manutencao")

        # ao concluir a ultima OS ativa, o equipamento finalmente e liberado
        resp2 = self.patch(
            self.c.tecnico, outra_ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp2.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "ativo")

    def test_conclui_nao_reverte_equipamento_inativo(self):
        Equipamento.objects.filter(pk=self.c.equipamento.pk).update(status="inativo")
        ordem = self.em_andamento()
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "inativo")

    def test_conclui_sem_equipamento_nao_quebra(self):
        ordem = self.em_andamento(id_equipamento=None)
        resp = self.patch(
            self.c.tecnico, ordem, "concluir", {"proxima_manutencao": futuro()}
        )
        self.assertEqual(resp.status_code, 200)


class DesativarAbertasTests(OSBase):
    def test_apenas_admin(self):
        resp = self.cliente(self.c.operador).patch(f"{URL}desativar-abertas/")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            resp.data, {"detail": "Apenas administradores podem desativar ordens de servico."}
        )

    def test_cancela_abertas_preservando_iot_e_outros_status(self):
        eq_iot = criar_equipamento(self.c.setor, tem_iot=True)
        aberta_op = self.os()
        aberta_sistema = self.os(solicitante=None, tipo_manutencao="preventiva")
        iot = self.os(solicitante=None, id_equipamento=eq_iot, tipo_manutencao="preditiva")
        preditiva_sem_iot = self.os(solicitante=None, tipo_manutencao="preditiva")
        em_andamento = self.os(status="em_andamento")
        concluida = self.os(status="concluida")
        de_outra = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.outra.equipamento, solicitante=self.outra.operador,
        )

        resp = self.cliente(self.c.admin).patch(f"{URL}desativar-abertas/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, {"status": "ok", "ordens_desativadas": 3})

        def status(o):
            o.refresh_from_db()
            return o.status

        self.assertEqual(status(aberta_op), "cancelada")
        self.assertEqual(status(aberta_sistema), "cancelada")
        self.assertEqual(status(preditiva_sem_iot), "cancelada")
        self.assertEqual(status(iot), "aberta")
        self.assertEqual(status(em_andamento), "em_andamento")
        self.assertEqual(status(concluida), "concluida")
        self.assertEqual(status(de_outra), "aberta")

    def test_sem_abertas_devolve_zero(self):
        resp = self.cliente(self.c.admin).patch(f"{URL}desativar-abertas/")
        self.assertEqual(resp.data, {"status": "ok", "ordens_desativadas": 0})


class ModeloTests(OSBase):
    def test_clean_exige_tecnico_com_perfil_tecnico_no_setor(self):
        ordem = self.os(tecnico=self.c.vinculo_operador)
        with self.assertRaises(ValidationError):
            ordem.clean()

    def test_clean_aceita_tecnico_valido(self):
        self.os(tecnico=self.c.vinculo_tecnico).clean()

    def test_str(self):
        ordem = self.os()
        self.assertEqual(str(ordem), f"OS#{ordem.pk} - Falha na esteira")
