from config.testutils import BaseTestCase, Cenario, criar_setor
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
    """Documenta o comportamento atual (S1): qualquer autenticado ve/edita tudo."""

    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def test_qualquer_usuario_lista_todas_as_empresas(self):
        resp = self.cliente(self.c.operador).get("/api/empresas/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            {e["id_empresa"] for e in resp.data},
            {self.c.empresa.pk, self.outra.empresa.pk},
        )

    def test_qualquer_usuario_edita_empresa_de_outro(self):
        resp = self.cliente(self.c.operador).patch(
            f"/api/empresas/{self.outra.empresa.pk}/", {"nome": "Hackeada"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/empresas/").status_code, 401)
