from config.testutils import BaseTestCase, Cenario, criar_setor, criar_usuario
from empresas.models import Setor


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
            set(resp.data[0]), {"id_setor", "nome", "id_empresa", "empresa_nome"}
        )
        self.assertEqual(resp.data[0]["empresa_nome"], self.c.empresa.nome)

    def test_criar_forca_empresa_do_usuario(self):
        resp = self.cliente(self.c.operador).post(
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

    def test_empresa_de_outro_404_em_leitura_edicao_e_exclusao(self):
        url = f"{self.URL}{self.outra.empresa.pk}/"
        client = self.cliente(self.c.admin)
        self.assertEqual(client.get(url).status_code, 404)
        self.assertEqual(client.patch(url, {"nome": "Hackeada"}, format="json").status_code, 404)
        self.assertEqual(client.delete(url).status_code, 404)
        self.outra.empresa.refresh_from_db()
        self.assertNotEqual(self.outra.empresa.nome, "Hackeada")

    def test_usuario_le_a_propria_empresa(self):
        resp = self.cliente(self.c.operador).get(f"{self.URL}{self.c.empresa.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nome"], self.c.empresa.nome)

    def test_nao_admin_nao_altera_nem_apaga(self):
        url = f"{self.URL}{self.c.empresa.pk}/"
        for usuario in (self.c.operador, self.c.tecnico):
            client = self.cliente(usuario)
            self.assertEqual(client.patch(url, {"nome": "X"}, format="json").status_code, 403)
            self.assertEqual(client.delete(url).status_code, 403)
            self.assertEqual(client.post(self.URL, {}, format="json").status_code, 403)

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
