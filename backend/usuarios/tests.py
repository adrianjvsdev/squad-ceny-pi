import io

from django.core.management import call_command
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from config.testutils import (
    SENHA_PADRAO,
    BaseTestCase,
    Cenario,
    criar_empresa,
    criar_setor,
    criar_usuario,
)
from empresas.models import Empresa
from usuarios.models import Usuario, UsuarioSetor


class LoginJWTTests(BaseTestCase):
    def setUp(self):
        self.empresa = criar_empresa()
        self.admin = criar_usuario(self.empresa, Usuario.Perfil.ADMIN)

    def test_login_devolve_tokens_e_last_login(self):
        resp = self.cliente().post(
            "/api/token/",
            {"email": self.admin.email, "password": SENHA_PADRAO},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(set(resp.data), {"access", "refresh", "last_login"})
        self.assertIsNotNone(resp.data["last_login"])

    def test_claims_extras_no_access_e_no_refresh(self):
        resp = self.cliente().post(
            "/api/token/",
            {"email": self.admin.email, "password": SENHA_PADRAO},
            format="json",
        )
        esperado = {
            "perfil": "admin",
            "nome": self.admin.nome,
            "email": self.admin.email,
            "id_empresa": self.empresa.id_empresa,
        }
        for token in (AccessToken(resp.data["access"]), RefreshToken(resp.data["refresh"])):
            for claim, valor in esperado.items():
                self.assertEqual(token[claim], valor)
            self.assertEqual(token["user_id"], str(self.admin.id_usuario))

    def test_senha_errada_401(self):
        resp = self.cliente().post(
            "/api/token/",
            {"email": self.admin.email, "password": "errada"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_usuario_sem_empresa_tem_claim_nula(self):
        sem_empresa = criar_usuario(None)
        resp = self.cliente().post(
            "/api/token/",
            {"email": sem_empresa.email, "password": SENHA_PADRAO},
            format="json",
        )
        self.assertIsNone(AccessToken(resp.data["access"])["id_empresa"])

    def test_refresh_e_verify(self):
        resp = self.cliente().post(
            "/api/token/",
            {"email": self.admin.email, "password": SENHA_PADRAO},
            format="json",
        )
        refresh = self.cliente().post(
            "/api/token/refresh/", {"refresh": resp.data["refresh"]}, format="json"
        )
        self.assertEqual(refresh.status_code, 200)
        self.assertIn("access", refresh.data)
        verify = self.cliente().post(
            "/api/token/verify/", {"token": resp.data["access"]}, format="json"
        )
        self.assertEqual(verify.status_code, 200)

    def test_access_token_autentica_requisicoes(self):
        resp = self.cliente().post(
            "/api/token/",
            {"email": self.admin.email, "password": SENHA_PADRAO},
            format="json",
        )
        client = self.cliente()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        me = client.get("/api/usuarios/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], self.admin.email)

    def test_sem_token_401(self):
        self.assertEqual(self.cliente().get("/api/usuarios/me/").status_code, 401)


class RegistroTests(BaseTestCase):
    payload = {
        "nome_empresa": "Nova Empresa",
        "cnpj": "11.111.111/0001-11",
        "telefone": "(11) 1111-1111",
        "nome": "Fulano",
        "email": "fulano@nova.com",
        "senha": "abc123",
    }

    def _post(self, **override):
        return self.cliente().post(
            "/api/registro/", {**self.payload, **override}, format="json"
        )

    def test_registro_cria_empresa_e_admin_e_devolve_tokens(self):
        resp = self._post()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(set(resp.data), {"access", "refresh"})

        empresa = Empresa.objects.get(cnpj=self.payload["cnpj"])
        self.assertEqual(empresa.nome, "Nova Empresa")
        self.assertEqual(empresa.email, self.payload["email"])
        usuario = Usuario.objects.get(email=self.payload["email"])
        self.assertEqual(usuario.perfil, Usuario.Perfil.ADMIN)
        self.assertEqual(usuario.id_empresa, empresa)
        self.assertTrue(usuario.check_password("abc123"))
        self.assertIsNotNone(usuario.last_login)

    def test_claims_extras_no_access_e_no_refresh(self):
        resp = self._post()
        usuario = Usuario.objects.get(email=self.payload["email"])
        esperado = {
            "perfil": "admin",
            "nome": "Fulano",
            "email": self.payload["email"],
            "id_empresa": usuario.id_empresa_id,
        }
        for token in (AccessToken(resp.data["access"]), RefreshToken(resp.data["refresh"])):
            for claim, valor in esperado.items():
                self.assertEqual(token[claim], valor)
            self.assertEqual(token["user_id"], str(usuario.id_usuario))

    def test_conjunto_exato_de_claims(self):
        resp = self._post()
        chaves = {
            "token_type", "exp", "iat", "jti", "user_id",
            "perfil", "nome", "email", "id_empresa",
        }
        self.assertEqual(set(AccessToken(resp.data["access"]).payload), chaves)
        self.assertEqual(set(RefreshToken(resp.data["refresh"]).payload), chaves)
        self.assertEqual(AccessToken(resp.data["access"])["token_type"], "access")
        self.assertEqual(RefreshToken(resp.data["refresh"])["token_type"], "refresh")

    def test_cnpj_duplicado_400(self):
        criar_empresa()
        Empresa.objects.update(cnpj=self.payload["cnpj"])
        resp = self._post()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual([str(e) for e in resp.data["cnpj"]], ["CNPJ já cadastrado."])

    def test_email_duplicado_400(self):
        criar_usuario(None, email=self.payload["email"])
        resp = self._post()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual([str(e) for e in resp.data["email"]], ["E-mail já cadastrado."])

    def test_senha_curta_400(self):
        resp = self._post(senha="123")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("senha", resp.data)

    def test_campos_obrigatorios_400(self):
        resp = self.cliente().post("/api/registro/", {}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            set(resp.data),
            {"nome_empresa", "cnpj", "telefone", "nome", "email", "senha"},
        )

    def test_registro_nao_cria_nada_quando_invalido(self):
        self._post(senha="1")
        self.assertFalse(Empresa.objects.exists())

    def test_email_de_empresa_existente_400(self):
        # Empresa.email tambem e unico: antes estourava IntegrityError (500).
        empresa = criar_empresa()
        Empresa.objects.filter(pk=empresa.pk).update(email=self.payload["email"])
        resp = self._post()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual([str(e) for e in resp.data["email"]], ["E-mail já cadastrado."])
        self.assertEqual(Empresa.objects.count(), 1)
        self.assertFalse(Usuario.objects.filter(email=self.payload["email"]).exists())


class UsuarioViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def test_admin_lista_so_usuarios_da_propria_empresa(self):
        resp = self.cliente(self.c.admin).get("/api/usuarios/")
        self.assertEqual(resp.status_code, 200)
        ids = {u["id_usuario"] for u in resp.data}
        self.assertEqual(
            ids, {self.c.admin.pk, self.c.tecnico.pk, self.c.operador.pk}
        )

    def test_nao_admin_403_em_list_create_retrieve(self):
        client = self.cliente(self.c.operador)
        self.assertEqual(client.get("/api/usuarios/").status_code, 403)
        self.assertEqual(client.post("/api/usuarios/", {}, format="json").status_code, 403)
        self.assertEqual(
            client.get(f"/api/usuarios/{self.c.admin.pk}/").status_code, 403
        )

    def test_sem_autenticacao_401(self):
        self.assertEqual(self.cliente().get("/api/usuarios/").status_code, 401)

    def test_admin_nao_ve_usuario_de_outra_empresa(self):
        resp = self.cliente(self.c.admin).get(f"/api/usuarios/{self.outra.admin.pk}/")
        self.assertEqual(resp.status_code, 404)

    def test_admin_cria_usuario_na_propria_empresa_como_operador(self):
        resp = self.cliente(self.c.admin).post(
            "/api/usuarios/",
            {
                "nome": "Novo",
                "email": "novo@teste.com",
                "password": "abc123",
                "perfil": "admin",  # read_only: deve ser ignorado
                "id_empresa": self.outra.empresa.pk,  # read_only: idem
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertNotIn("password", resp.data)
        novo = Usuario.objects.get(email="novo@teste.com")
        self.assertEqual(novo.perfil, Usuario.Perfil.OPERADOR)
        self.assertEqual(novo.id_empresa, self.c.empresa)
        self.assertTrue(novo.check_password("abc123"))

    def test_criar_sem_senha_400(self):
        # Antes: KeyError em create() -> 500.
        resp = self.cliente(self.c.admin).post(
            "/api/usuarios/",
            {"nome": "Novo", "email": "novo@teste.com"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["password"]], ["Este campo é obrigatório."]
        )
        self.assertFalse(Usuario.objects.filter(email="novo@teste.com").exists())

    def test_criar_com_senha_em_branco_400(self):
        resp = self.cliente(self.c.admin).post(
            "/api/usuarios/",
            {"nome": "Novo", "email": "novo@teste.com", "password": ""},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("password", resp.data)

    def test_atualizar_sem_senha_continua_permitido(self):
        client = self.cliente(self.c.admin)
        url = f"/api/usuarios/{self.c.operador.pk}/"
        put = client.put(
            url, {"nome": "Via Put", "email": self.c.operador.email}, format="json"
        )
        self.assertEqual(put.status_code, 200)
        patch = client.patch(url, {"nome": "Via Patch"}, format="json")
        self.assertEqual(patch.status_code, 200)

    def test_admin_atualiza_senha(self):
        resp = self.cliente(self.c.admin).patch(
            f"/api/usuarios/{self.c.operador.pk}/",
            {"password": "novasenha"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.c.operador.refresh_from_db()
        self.assertTrue(self.c.operador.check_password("novasenha"))

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get(f"/api/usuarios/{self.c.operador.pk}/")
        self.assertEqual(
            set(resp.data),
            {
                "id_usuario", "nome", "email", "perfil", "is_active",
                "notifications_enabled", "data_cadastro", "last_login", "id_empresa",
            },
        )

    def test_me_devolve_o_proprio_usuario_para_qualquer_perfil(self):
        resp = self.cliente(self.c.operador).get("/api/usuarios/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id_usuario"], self.c.operador.pk)
        self.assertEqual(resp.data["perfil"], "operador")

    def test_update_profile_atualiza_nome_e_senha_mas_nao_perfil(self):
        client = self.cliente(self.c.operador)
        resp = client.patch(
            "/api/usuarios/update_profile/",
            {"nome": "Outro Nome", "password": "trocada1", "perfil": "admin"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.c.operador.refresh_from_db()
        self.assertEqual(self.c.operador.nome, "Outro Nome")
        self.assertEqual(self.c.operador.perfil, Usuario.Perfil.OPERADOR)
        self.assertTrue(self.c.operador.check_password("trocada1"))

    def test_update_profile_invalido_400(self):
        resp = self.cliente(self.c.operador).patch(
            "/api/usuarios/update_profile/", {"email": "nao-e-email"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("email", resp.data)

    def test_update_profile_aceita_put(self):
        resp = self.cliente(self.c.operador).put(
            "/api/usuarios/update_profile/", {"nome": "Via Put"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nome"], "Via Put")


class UsuarioSetorViewSetTests(BaseTestCase):
    def setUp(self):
        self.c = Cenario()
        self.outra = Cenario()

    def test_admin_lista_so_vinculos_da_propria_empresa(self):
        resp = self.cliente(self.c.admin).get("/api/usuario-setor/")
        self.assertEqual(resp.status_code, 200)
        ids = {v["id"] for v in resp.data}
        self.assertEqual(ids, {self.c.vinculo_tecnico.pk, self.c.vinculo_operador.pk})

    def test_campos_da_resposta(self):
        resp = self.cliente(self.c.admin).get("/api/usuario-setor/")
        self.assertEqual(
            set(resp.data[0]),
            {
                "id", "id_usuario", "usuario_nome", "usuario_perfil",
                "id_setor", "setor_nome", "perfil_no_setor",
            },
        )

    def test_nao_admin_403(self):
        self.assertEqual(
            self.cliente(self.c.tecnico).get("/api/usuario-setor/").status_code, 403
        )

    def test_cria_vinculo(self):
        setor2 = criar_setor(self.c.empresa)
        resp = self.cliente(self.c.admin).post(
            "/api/usuario-setor/",
            {
                "id_usuario": self.c.operador.pk,
                "id_setor": setor2.pk,
                "perfil_no_setor": "visualizador",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["perfil_no_setor"], "visualizador")

    def test_vinculo_duplicado_400(self):
        resp = self.cliente(self.c.admin).post(
            "/api/usuario-setor/",
            {"id_usuario": self.c.operador.pk, "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        # O UniqueTogetherValidator do ModelSerializer dispara antes do validate()
        # customizado, que so vale de fato para atualizacoes.
        self.assertEqual(
            [str(e) for e in resp.data["non_field_errors"]],
            ["Os campos id_usuario, id_setor devem criar um set único."],
        )

    def test_atualizar_proprio_vinculo_nao_conta_como_duplicado(self):
        resp = self.cliente(self.c.admin).patch(
            f"/api/usuario-setor/{self.c.vinculo_operador.pk}/",
            {"id_usuario": self.c.operador.pk, "id_setor": self.c.setor.pk,
             "perfil_no_setor": "gestor"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_nao_vincula_usuario_de_outra_empresa(self):
        resp = self.cliente(self.c.admin).post(
            "/api/usuario-setor/",
            {"id_usuario": self.outra.operador.pk, "id_setor": self.c.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_usuario"]],
            ["O usuário deve pertencer à sua empresa."],
        )
        self.assertFalse(
            UsuarioSetor.objects.filter(
                id_usuario=self.outra.operador, id_setor=self.c.setor
            ).exists()
        )

    def test_nao_vincula_a_setor_de_outra_empresa(self):
        resp = self.cliente(self.c.admin).post(
            "/api/usuario-setor/",
            {"id_usuario": self.c.operador.pk, "id_setor": self.outra.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            [str(e) for e in resp.data["id_setor"]],
            ["O setor deve pertencer à sua empresa."],
        )

    def test_nao_move_vinculo_existente_para_outra_empresa(self):
        resp = self.cliente(self.c.admin).patch(
            f"/api/usuario-setor/{self.c.vinculo_operador.pk}/",
            {"id_setor": self.outra.setor.pk},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.c.vinculo_operador.refresh_from_db()
        self.assertEqual(self.c.vinculo_operador.id_setor, self.c.setor)

class SeedMockDataTests(BaseTestCase):
    def test_seed_e_idempotente_e_cria_dados_de_demo(self):
        from equipamentos.models import Equipamento
        from notificacoes.models import Notificacao
        from ordens_servico.models import OrdemServico

        for _ in range(2):
            call_command("seed_mock_data", "--with-os", stdout=io.StringIO())

        self.assertEqual(Usuario.objects.count(), 3)
        self.assertEqual(Equipamento.objects.count(), 3)
        self.assertEqual(OrdemServico.objects.count(), 2)
        self.assertEqual(Notificacao.objects.count(), 1)
        self.assertTrue(
            self.cliente().post(
                "/api/token/",
                {"email": "mariafernanda@uspe.com", "password": "123456"},
                format="json",
            ).status_code == 200
        )
