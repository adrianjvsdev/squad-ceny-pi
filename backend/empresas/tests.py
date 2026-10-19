import io

from django.core.management import call_command

from config.testutils import (
    BaseTestCase,
    Cenario,
    criar_equipamento,
    criar_setor,
    criar_usuario,
)
from empresas.models import Empresa, Setor
from ordens_servico.models import OrdemServico


class SetorViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def test_lista_so_setores_da_propria_empresa(self):
        for usuario in (self.c.admin, self.c.tecnico, self.c.operador):
            resp = self.cliente(usuario).get("/api/setores/")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual({s["id_setor"] for s in resp.data}, {self.c.setor.pk})

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get("/api/setores/")
        self.assertEqual(
            set(resp.data[0]), {"id_setor", "nome", "ativo", "id_empresa", "empresa_nome"}
        )
        self.assertEqual(resp.data[0]["empresa_nome"], self.c.empresa.nome)
        self.assertTrue(resp.data[0]["ativo"])

    def test_criar_forca_empresa_do_usuario(self):
        resp = self.cliente(self.c.admin).post(
            "/api/setores/",
            {"nome": "Novo", "id_empresa": self.outra.empresa.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(
            Setor.objects.get(pk=resp.data["id_setor"]).id_empresa, self.c.empresa
        )

    def test_setor_de_outra_empresa_404(self):
        resp = self.cliente(self.c.admin).get(f"/api/setores/{self.outra.setor.pk}/")
        self.assertEqual(resp.status_code, 404)

    def test_editar_e_apagar(self):
        setor = criar_setor(self.c.empresa)
        client = self.cliente(self.c.admin)
        resp = client.patch(f"/api/setores/{setor.pk}/", {"nome": "Renomeado"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(client.delete(f"/api/setores/{setor.pk}/").status_code, 204)

    def test_nao_admin_le_mas_nao_escreve(self):
        url = f"/api/setores/{self.c.setor.pk}/"
        for usuario in (self.c.operador, self.c.tecnico):
            client = self.cliente(usuario)
            self.assertEqual(client.get(url).status_code, 200)
            self.assertEqual(
                client.post("/api/setores/", {"nome": "X"}, format="json").status_code, 403
            )
            self.assertEqual(
                client.patch(url, {"ativo": False}, format="json").status_code, 403
            )
            self.assertEqual(client.delete(url).status_code, 403)
        self.c.setor.refresh_from_db()
        self.assertTrue(self.c.setor.ativo)

    def test_nome_limitado_a_40_caracteres(self):
        client = self.cliente(self.c.admin)
        criar = client.post("/api/setores/", {"nome": "S" * 41}, format="json")
        self.assertEqual(criar.status_code, 400)
        self.assertIn("nome", criar.data)
        editar = client.patch(
            f"/api/setores/{self.c.setor.pk}/", {"nome": "S" * 41}, format="json"
        )
        self.assertEqual(editar.status_code, 400)
        no_limite = client.post("/api/setores/", {"nome": "S" * 40}, format="json")
        self.assertEqual(no_limite.status_code, 201)

    def _os(self, equipamento, status):
        return OrdemServico.objects.create(
            titulo="Falha",
            tipo_manutencao=OrdemServico.TipoManutencao.CORRETIVA,
            id_equipamento=equipamento,
            status=status,
        )

    def test_desativar_setor_desativa_seus_equipamentos(self):
        em_manutencao = criar_equipamento(self.c.setor, status="em_manutencao")
        de_outro_setor = criar_equipamento(criar_setor(self.c.empresa))
        # OS em aberto em outro setor não impede desativar este
        self._os(de_outro_setor, "aberta")
        resp = self.cliente(self.c.admin).patch(
            f"/api/setores/{self.c.setor.pk}/", {"ativo": False}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["ativo"])
        for equipamento in (self.c.equipamento, em_manutencao):
            equipamento.refresh_from_db()
            self.assertEqual(equipamento.status, "inativo")
        de_outro_setor.refresh_from_db()
        self.assertEqual(de_outro_setor.status, "ativo")

    def test_nao_desativa_setor_com_os_em_aberto(self):
        self._os(self.c.equipamento, "em_andamento")
        resp = self.cliente(self.c.admin).patch(
            f"/api/setores/{self.c.setor.pk}/", {"ativo": False}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["ativo"]],
            ["Não é possível desativar o setor: há 1 OS em aberto em equipamentos dele. Conclua ou cancele as OS antes."],
        )
        self.c.setor.refresh_from_db()
        self.c.equipamento.refresh_from_db()
        self.assertTrue(self.c.setor.ativo)
        self.assertEqual(self.c.equipamento.status, "ativo")

    def test_reativar_setor_nao_reativa_equipamentos(self):
        client = self.cliente(self.c.admin)
        url = f"/api/setores/{self.c.setor.pk}/"
        client.patch(url, {"ativo": False}, format="json")
        resp = client.patch(url, {"ativo": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["ativo"])
        self.c.equipamento.refresh_from_db()
        self.assertEqual(self.c.equipamento.status, "inativo")

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/setores/").status_code, 401)


class EmpresaViewSetTests(BaseTestCase):
    URL = "/api/empresas/"

    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def test_usuario_lista_so_a_propria_empresa(self):
        for usuario in (self.c.admin, self.c.tecnico, self.c.operador):
            resp = self.cliente(usuario).get(self.URL)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual({e["id_empresa"] for e in resp.data}, {self.c.empresa.pk})

    def test_empresa_de_outro_404_em_leitura_e_edicao(self):
        url = f"{self.URL}{self.outra.empresa.pk}/"
        client = self.cliente(self.c.admin)
        self.assertEqual(client.get(url).status_code, 404)
        self.assertEqual(client.patch(url, {"nome": "Hackeada"}, format="json").status_code, 404)
        self.outra.empresa.refresh_from_db()
        self.assertNotEqual(self.outra.empresa.nome, "Hackeada")

    def test_usuario_le_a_propria_empresa(self):
        resp = self.cliente(self.c.operador).get(f"{self.URL}{self.c.empresa.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nome"], self.c.empresa.nome)

    def test_nao_admin_nao_altera(self):
        url = f"{self.URL}{self.c.empresa.pk}/"
        for usuario in (self.c.operador, self.c.tecnico):
            self.assertEqual(
                self.cliente(usuario).patch(url, {"nome": "X"}, format="json").status_code,
                403,
            )

    def test_criar_e_apagar_nao_existem_nem_para_admin(self):
        # Empresa nasce no registro; não há endpoint de criação/exclusão.
        url = f"{self.URL}{self.c.empresa.pk}/"
        client = self.cliente(self.c.admin)
        self.assertEqual(client.post(self.URL, {}, format="json").status_code, 405)
        self.assertEqual(client.delete(url).status_code, 405)
        self.assertTrue(Empresa.objects.filter(pk=self.c.empresa.pk).exists())

    def test_admin_edita_a_propria_empresa(self):
        resp = self.cliente(self.c.admin).patch(
            f"{self.URL}{self.c.empresa.pk}/", {"nome": "Renomeada"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.c.empresa.refresh_from_db()
        self.assertEqual(self.c.empresa.nome, "Renomeada")

    def test_usuario_sem_empresa_nao_ve_nenhuma(self):
        sem_empresa = criar_usuario(None)
        resp = self.cliente(sem_empresa).get(self.URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, [])

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get(self.URL).status_code, 401)


class VerificarDadosCruzadosTests(BaseTestCase):
    """O comando e somente leitura: so verifica se ele detecta corretamente
    dados que a validacao de escrita (S4) passou a impedir, simulando dados
    antigos via criacao direta no ORM (que pula a validacao do serializer)."""

    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def _rodar(self):
        saida = io.StringIO()
        call_command("verificar_dados_cruzados", stdout=saida)
        return saida.getvalue()

    def test_banco_limpo_nao_reporta_nada(self):
        saida = self._rodar()
        self.assertIn("Nenhum registro cruzado entre empresas encontrado.", saida)
        self.assertNotIn("WARNING", saida)

    def test_detecta_os_com_solicitante_de_outra_empresa(self):
        from ordens_servico.models import OrdemServico

        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, solicitante=self.outra.operador,
        )
        saida = self._rodar()
        self.assertIn(
            "Ordens de servico: equipamento e solicitante de empresas diferentes: 1", saida
        )
        self.assertIn(str(ordem.pk), saida)

    def test_detecta_os_com_tecnico_de_outra_empresa(self):
        from ordens_servico.models import OrdemServico

        ordem = OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, tecnico=self.outra.vinculo_tecnico,
        )
        saida = self._rodar()
        self.assertIn(
            "Ordens de servico: equipamento e tecnico de empresas diferentes: 1", saida
        )
        self.assertIn(str(ordem.pk), saida)

    def test_detecta_plano_sem_setor_ou_com_setor_diferente_do_equipamento(self):
        from manutencao.models import PlanoManutencao

        sem_setor = PlanoManutencao.objects.create(
            descricao="d", tipo="preventiva", periodicidade_dias=30,
            proxima_execucao="2030-01-01", id_equipamento=self.c.equipamento, id_setor=None,
        )
        outro_setor = criar_setor(self.c.empresa)
        setor_errado = PlanoManutencao.objects.create(
            descricao="d", tipo="preventiva", periodicidade_dias=30,
            proxima_execucao="2030-01-01",
            id_equipamento=self.c.equipamento, id_setor=outro_setor,
        )
        saida = self._rodar()
        self.assertIn(
            "Planos de manutencao: setor ausente ou diferente do setor do equipamento: 2",
            saida,
        )
        self.assertIn(str(sem_setor.pk), saida)
        self.assertIn(str(setor_errado.pk), saida)

    def test_detecta_vinculo_usuario_setor_de_empresas_diferentes(self):
        from usuarios.models import UsuarioSetor

        vinculo = UsuarioSetor.objects.create(
            id_usuario=self.outra.operador, id_setor=self.c.setor, perfil_no_setor="operador"
        )
        saida = self._rodar()
        self.assertIn(
            "Vinculos usuario-setor: usuario e setor de empresas diferentes: 1", saida
        )
        self.assertIn(str(vinculo.pk), saida)

    def test_detecta_equipamento_com_tipo_de_outra_empresa(self):
        from equipamentos.models import TipoEquipamento

        tipo_outra = TipoEquipamento.objects.create(nome="X", id_empresa=self.outra.empresa)
        self.c.equipamento.id_tipo = tipo_outra
        self.c.equipamento.save()
        saida = self._rodar()
        self.assertIn(
            "Equipamentos: tipo de outra empresa (tipos legados sem empresa sao ignorados): 1",
            saida,
        )
        self.assertIn(str(self.c.equipamento.pk), saida)

    def test_tipo_legado_sem_empresa_nao_e_reportado(self):
        from equipamentos.models import TipoEquipamento

        legado = TipoEquipamento.objects.create(nome="Legado", id_empresa=None)
        self.c.equipamento.id_tipo = legado
        self.c.equipamento.save()
        saida = self._rodar()
        self.assertIn(
            "Equipamentos: tipo de outra empresa (tipos legados sem empresa sao ignorados): 0",
            saida,
        )

    def test_total_soma_todas_as_categorias(self):
        from ordens_servico.models import OrdemServico

        OrdemServico.objects.create(
            titulo="x", tipo_manutencao="corretiva",
            id_equipamento=self.c.equipamento, solicitante=self.outra.operador,
        )
        from manutencao.models import PlanoManutencao

        PlanoManutencao.objects.create(
            descricao="d", tipo="preventiva", periodicidade_dias=30,
            proxima_execucao="2030-01-01", id_equipamento=self.c.equipamento, id_setor=None,
        )
        saida = self._rodar()
        self.assertIn("Total de registros cruzados: 2", saida)
