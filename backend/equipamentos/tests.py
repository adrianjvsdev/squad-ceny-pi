from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

from django.utils import timezone

from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    vincular,
)
from equipamentos.models import Equipamento, TipoEquipamento
from equipamentos.services import criar_com_tag_automatica, prefixo_da_tag, proxima_tag
from ordens_servico.models import OrdemServico
from usuarios.models import UsuarioSetor


class EquipamentoViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()
        self.setor_b = criar_setor(self.c.empresa, "Setor B")
        self.eq_b = criar_equipamento(self.setor_b)
        self.eq_outra = self.outra.equipamento

    def _ids(self, usuario):
        resp = self.cliente(usuario).get("/api/equipamentos/")
        self.assertEqual(resp.status_code, 200)
        return {e["id_equipamento"] for e in resp.data}

    def test_admin_ve_todos_da_empresa_e_nenhum_de_fora(self):
        self.assertEqual(
            self._ids(self.c.admin), {self.c.equipamento.pk, self.eq_b.pk}
        )

    def test_nao_admin_ve_so_equipamentos_dos_seus_setores(self):
        self.assertEqual(self._ids(self.c.operador), {self.c.equipamento.pk})
        self.assertEqual(self._ids(self.c.tecnico), {self.c.equipamento.pk})

    def test_vinculo_adicional_amplia_a_visibilidade(self):
        vincular(self.c.operador, self.setor_b, UsuarioSetor.PerfilSetor.VISUALIZADOR)
        self.assertEqual(
            self._ids(self.c.operador), {self.c.equipamento.pk, self.eq_b.pk}
        )

    def test_usuario_sem_vinculos_nao_ve_nada(self):
        sem_vinculo = self.outra.operador
        sem_vinculo.usuariosetor_set.all().delete()
        self.assertEqual(self._ids(sem_vinculo), set())

    def test_equipamento_de_outra_empresa_404_para_admin(self):
        resp = self.cliente(self.c.admin).get(
            f"/api/equipamentos/{self.eq_outra.pk}/"
        )
        self.assertEqual(resp.status_code, 404)

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get(
            f"/api/equipamentos/{self.c.equipamento.pk}/"
        )
        self.assertEqual(
            set(resp.data),
            {
                "id_equipamento", "tag", "nome", "fabricante", "modelo",
                "data_instalacao", "data_entrada_operacao", "ultima_manutencao",
                "proxima_manutencao", "status", "id_setor", "setor_nome",
                "id_tipo", "tem_iot",
            },
        )
        self.assertEqual(resp.data["setor_nome"], self.c.setor.nome)
        # Sem tipo, o DRF omite "tipo_nome" (SkipField em relacao nula).
        self.assertNotIn("tipo_nome", resp.data)

    def test_tipo_nome_aparece_quando_ha_tipo(self):
        tipo = TipoEquipamento.objects.create(nome="Bomba", id_empresa=self.c.empresa)
        self.c.equipamento.id_tipo = tipo
        self.c.equipamento.save()
        resp = self.cliente(self.c.admin).get(
            f"/api/equipamentos/{self.c.equipamento.pk}/"
        )
        self.assertEqual(resp.data["tipo_nome"], "Bomba")

    def test_id_tipo_de_outra_empresa_400_na_criacao_e_na_edicao(self):
        tipo_outra = TipoEquipamento.objects.create(nome="X", id_empresa=self.outra.empresa)
        client = self.cliente(self.c.admin)
        criar = client.post(
            "/api/equipamentos/",
            {"nome": "N", "id_setor": self.c.setor.pk, "id_tipo": tipo_outra.pk},
            format="json",
        )
        self.assertEqual(criar.status_code, 400)
        self.assertEqual(
            [str(e) for e in criar.data["id_tipo"]],
            ["O tipo de equipamento deve pertencer à sua empresa."],
        )
        editar = client.patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/",
            {"id_tipo": tipo_outra.pk},
            format="json",
        )
        self.assertEqual(editar.status_code, 400)

    def test_id_tipo_da_propria_empresa_e_aceito(self):
        tipo = TipoEquipamento.objects.create(nome="Ok", id_empresa=self.c.empresa)
        resp = self.cliente(self.c.admin).patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/", {"id_tipo": tipo.pk}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["tipo_nome"], "Ok")

    def test_tipo_antigo_sem_empresa_so_e_aceito_se_nao_mudou(self):
        legado = TipoEquipamento.objects.create(nome="Legado", id_empresa=None)
        self.c.equipamento.id_tipo = legado
        self.c.equipamento.save()
        client = self.cliente(self.c.admin)
        url = f"/api/equipamentos/{self.c.equipamento.pk}/"
        # reenviar o mesmo tipo (ex.: PUT completo) continua funcionando
        mantem = client.patch(url, {"id_tipo": legado.pk, "nome": "Novo nome"}, format="json")
        self.assertEqual(mantem.status_code, 200)
        # mas nao da para atribuir um tipo sem empresa a outro equipamento
        outro = criar_equipamento(self.setor_b)
        atribui = client.patch(
            f"/api/equipamentos/{outro.pk}/", {"id_tipo": legado.pk}, format="json"
        )
        self.assertEqual(atribui.status_code, 400)

    def test_criar_em_setor_da_propria_empresa(self):
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"nome": "Novo", "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], "ativo")

    def test_criar_grava_o_momento_do_cadastro_como_entrada_em_operacao(self):
        antes = timezone.now()
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"nome": "Novo", "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        entrada = Equipamento.objects.get(pk=resp.data["id_equipamento"]).data_entrada_operacao
        self.assertIsNotNone(entrada)
        self.assertGreaterEqual(entrada, antes)
        self.assertLessEqual(entrada, timezone.now())

    def test_criar_respeita_entrada_em_operacao_informada(self):
        informada = datetime(2025, 3, 10, 8, 0, tzinfo=dt_timezone.utc)
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {
                "nome": "Novo",
                "id_setor": self.c.setor.pk,
                "data_entrada_operacao": informada.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(
            Equipamento.objects.get(pk=resp.data["id_equipamento"]).data_entrada_operacao,
            informada,
        )

    def test_editar_nao_altera_a_entrada_em_operacao(self):
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"nome": "Novo", "id_setor": self.c.setor.pk},
            format="json",
        )
        equipamento = Equipamento.objects.get(pk=resp.data["id_equipamento"])
        entrada = equipamento.data_entrada_operacao
        self.cliente(self.c.admin).patch(
            f"/api/equipamentos/{equipamento.pk}/", {"nome": "Renomeado"}, format="json"
        )
        equipamento.refresh_from_db()
        self.assertEqual(equipamento.data_entrada_operacao, entrada)

    def test_criar_em_setor_de_outra_empresa_400(self):
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"nome": "Novo", "id_setor": self.outra.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_setor"]],
            ["Você não pode adicionar um equipamento a um setor fora da sua empresa."],
        )

    def test_tag_gerada_pelo_nome_ignora_a_enviada(self):
        client = self.cliente(self.c.admin)
        dados = {"nome": "Peneira Molecular", "id_setor": self.c.setor.pk}
        primeira = client.post(
            "/api/equipamentos/", {**dados, "tag": self.c.equipamento.tag}, format="json"
        )
        segunda = client.post("/api/equipamentos/", dados, format="json")
        self.assertEqual(primeira.status_code, 201)
        self.assertEqual(primeira.data["tag"], "PM-001")
        self.assertEqual(segunda.data["tag"], "PM-002")

    def test_tag_nao_muda_na_edicao(self):
        resp = self.cliente(self.c.admin).patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/",
            {"tag": "OUTRA-1", "nome": "Bomba de Vácuo"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["tag"], self.c.equipamento.tag)
        self.assertEqual(resp.data["nome"], "Bomba de Vácuo")

    def test_sequencia_da_tag_vale_para_todas_as_empresas(self):
        criar_equipamento(self.outra.setor, tag="PM-007")
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"nome": "Peneira Molecular", "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.data["tag"], "PM-008")

    def test_campos_de_manutencao_sao_somente_leitura(self):
        resp = self.cliente(self.c.admin).patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/",
            {"proxima_manutencao": "2030-01-01", "nome": "Renomeado"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.nome, "Renomeado")
        self.assertIsNone(self.c.equipamento.proxima_manutencao)

    def test_nao_admin_le_mas_nao_escreve(self):
        url = f"/api/equipamentos/{self.c.equipamento.pk}/"
        novo = {"nome": "X", "id_setor": self.c.setor.pk}
        for usuario in (self.c.operador, self.c.tecnico):
            client = self.cliente(usuario)
            self.assertEqual(client.get(url).status_code, 200)
            self.assertEqual(
                client.post("/api/equipamentos/", novo, format="json").status_code, 403
            )
            self.assertEqual(
                client.patch(url, {"status": "inativo"}, format="json").status_code, 403
            )
            self.assertEqual(client.put(url, novo, format="json").status_code, 403)
            self.assertEqual(client.delete(url).status_code, 403)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "ativo")
        self.assertFalse(Equipamento.objects.filter(nome="X").exists())

    def test_admin_desativa_e_reativa(self):
        url = f"/api/equipamentos/{self.c.equipamento.pk}/"
        client = self.cliente(self.c.admin)
        resp = client.patch(url, {"status": "inativo"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "inativo")
        resp = client.patch(url, {"status": "ativo"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "ativo")

    def _os(self, status):
        return OrdemServico.objects.create(
            titulo="Falha",
            tipo_manutencao=OrdemServico.TipoManutencao.CORRETIVA,
            id_equipamento=self.c.equipamento,
            status=status,
        )

    def test_nao_desativa_com_os_em_aberto(self):
        url = f"/api/equipamentos/{self.c.equipamento.pk}/"
        client = self.cliente(self.c.admin)
        for status in ("aberta", "em_andamento"):
            ordem = self._os(status)
            resp = client.patch(url, {"status": "inativo"}, format="json")
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(
                [str(e) for e in resp.data["status"]],
                ["Não é possível desativar: o equipamento tem 1 OS em aberto. Conclua ou cancele as OS antes."],
            )
            ordem.delete()
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "ativo")

    def test_desativa_com_os_concluida_ou_cancelada(self):
        self._os("concluida")
        self._os("cancelada")
        resp = self.cliente(self.c.admin).patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/", {"status": "inativo"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

    def test_admin_exclui(self):
        resp = self.cliente(self.c.admin).delete(f"/api/equipamentos/{self.eq_b.pk}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Equipamento.objects.filter(pk=self.eq_b.pk).exists())

    def test_nome_limitado_a_40_caracteres(self):
        client = self.cliente(self.c.admin)
        criar = client.post(
            "/api/equipamentos/",
            {"nome": "E" * 41, "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(criar.status_code, 400)
        self.assertIn("nome", criar.data)
        editar = client.patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/", {"nome": "E" * 41}, format="json"
        )
        self.assertEqual(editar.status_code, 400)
        no_limite = client.post(
            "/api/equipamentos/",
            {"nome": "E" * 40, "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(no_limite.status_code, 201)

    def test_setor_inativo_so_aceita_equipamento_inativo(self):
        self.setor_b.ativo = False
        self.setor_b.save()
        self.eq_b.status = "inativo"
        self.eq_b.save()
        client = self.cliente(self.c.admin)
        msg = ["Este setor está inativo. Reative o setor antes de ter equipamentos ativos nele."]

        criar = client.post(
            "/api/equipamentos/",
            {"nome": "Novo", "id_setor": self.setor_b.pk},
            format="json",
        )
        self.assertEqual(criar.status_code, 400)
        self.assertEqual([str(e) for e in criar.data["id_setor"]], msg)

        mover = client.patch(
            f"/api/equipamentos/{self.c.equipamento.pk}/",
            {"id_setor": self.setor_b.pk},
            format="json",
        )
        self.assertEqual(mover.status_code, 400)

        reativar = client.patch(
            f"/api/equipamentos/{self.eq_b.pk}/", {"status": "ativo"}, format="json"
        )
        self.assertEqual(reativar.status_code, 400)
        self.assertEqual([str(e) for e in reativar.data["id_setor"]], msg)

        # editar um equipamento que continua inativo no setor inativo é permitido
        renomear = client.patch(
            f"/api/equipamentos/{self.eq_b.pk}/", {"nome": "Renomeado"}, format="json"
        )
        self.assertEqual(renomear.status_code, 200)

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/equipamentos/").status_code, 401)
        self.assertEqual(
            self.cliente().post("/api/equipamentos/", {}, format="json").status_code, 401
        )


class TagAutomaticaTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()

    def test_prefixo_da_tag(self):
        casos = {
            "Peneira Molecular": "PM",
            "Bomba de Vácuo": "BV",
            "Bomba centrífuga 2": "BC",
            "Compressor": "CO",
            "Água": "AG",
            "  esteira  ": "ES",
            "Z": "ZX",
            "Bomba-01": "BO",
            "De": "DE",
            "123": "EQ",
            "": "EQ",
        }
        for nome, esperado in casos.items():
            with self.subTest(nome=nome):
                self.assertEqual(prefixo_da_tag(nome), esperado)

    def test_proxima_tag_usa_o_maior_numero_do_prefixo(self):
        self.assertEqual(proxima_tag("PM"), "PM-001")
        for tag in ("PM-002", "PM-010", "PM-ANTIGA", "PMX-050", "XPM-099"):
            criar_equipamento(self.c.setor, tag=tag)
        self.assertEqual(proxima_tag("PM"), "PM-011")

    def test_numero_passa_de_tres_digitos(self):
        criar_equipamento(self.c.setor, tag="PM-999")
        self.assertEqual(proxima_tag("PM"), "PM-1000")
        criar_equipamento(self.c.setor, tag="PM-1000")
        self.assertEqual(proxima_tag("PM"), "PM-1001")

    def test_tag_ocupada_entre_o_calculo_e_a_gravacao_tenta_a_seguinte(self):
        criar_equipamento(self.c.setor, tag="PM-001")
        with patch(
            "equipamentos.services.proxima_tag", side_effect=["PM-001", "PM-002"]
        ):
            equipamento = criar_com_tag_automatica(
                nome="Peneira Molecular", id_setor=self.c.setor
            )
        self.assertEqual(equipamento.tag, "PM-002")

    def test_desiste_depois_de_varias_colisoes(self):
        criar_equipamento(self.c.setor, tag="PM-001")
        with patch("equipamentos.services.proxima_tag", return_value="PM-001"):
            with self.assertRaises(ValueError):
                criar_com_tag_automatica(nome="Peneira Molecular", id_setor=self.c.setor)


class TipoEquipamentoViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()
        self.tipo = TipoEquipamento.objects.create(
            nome="Bomba", id_empresa=self.c.empresa
        )
        self.tipo_outra = TipoEquipamento.objects.create(
            nome="Esteira", id_empresa=self.outra.empresa
        )

    def test_lista_so_tipos_da_propria_empresa(self):
        resp = self.cliente(self.c.operador).get("/api/tipos-equipamento/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual({t["id_tipo"] for t in resp.data}, {self.tipo.pk})

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.operador).get("/api/tipos-equipamento/")
        self.assertEqual(
            set(resp.data[0]), {"id_tipo", "nome", "descricao", "id_empresa"}
        )

    def test_criar_forca_empresa_do_usuario(self):
        resp = self.cliente(self.c.operador).post(
            "/api/tipos-equipamento/",
            {"nome": "Novo", "id_empresa": self.outra.empresa.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["id_empresa"], self.c.empresa.pk)

    def test_nome_limitado_a_40_caracteres(self):
        client = self.cliente(self.c.admin)
        criar = client.post("/api/tipos-equipamento/", {"nome": "T" * 41}, format="json")
        self.assertEqual(criar.status_code, 400)
        self.assertIn("nome", criar.data)
        no_limite = client.post(
            "/api/tipos-equipamento/", {"nome": "T" * 40}, format="json"
        )
        self.assertEqual(no_limite.status_code, 201)

    def test_tipo_de_outra_empresa_404(self):
        resp = self.cliente(self.c.admin).get(
            f"/api/tipos-equipamento/{self.tipo_outra.pk}/"
        )
        self.assertEqual(resp.status_code, 404)

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/tipos-equipamento/").status_code, 401)
