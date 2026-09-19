from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    vincular,
)
from equipamentos.models import TipoEquipamento
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
            {"tag": "T-1", "nome": "N", "id_setor": self.c.setor.pk, "id_tipo": tipo_outra.pk},
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
            {"tag": "NOVO-1", "nome": "Novo", "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], "ativo")

    def test_criar_em_setor_de_outra_empresa_400(self):
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"tag": "NOVO-2", "nome": "Novo", "id_setor": self.outra.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_setor"]],
            ["Você não pode adicionar um equipamento a um setor fora da sua empresa."],
        )

    def test_tag_duplicada_400(self):
        resp = self.cliente(self.c.admin).post(
            "/api/equipamentos/",
            {"tag": self.c.equipamento.tag, "nome": "X", "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("tag", resp.data)

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

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/equipamentos/").status_code, 401)


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

    def test_tipo_de_outra_empresa_404(self):
        resp = self.cliente(self.c.admin).get(
            f"/api/tipos-equipamento/{self.tipo_outra.pk}/"
        )
        self.assertEqual(resp.status_code, 404)

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/tipos-equipamento/").status_code, 401)
