"""Fabricas e classe base compartilhadas pelos testes das apps."""

from itertools import count

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from empresas.models import Empresa, Setor
from equipamentos.models import Equipamento
from usuarios.models import Usuario, UsuarioSetor

_seq = count(1)

SENHA_PADRAO = "senha123"


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class BaseTestCase(TestCase):
    """TestCase com hasher rapido (os testes criam muitos usuarios)."""

    def cliente(self, usuario=None, **kwargs):
        client = APIClient(**kwargs)
        if usuario is not None:
            client.force_authenticate(user=usuario)
        return client


def criar_empresa(nome=None):
    n = next(_seq)
    return Empresa.objects.create(
        nome=nome or f"Empresa {n}",
        cnpj=f"00.000.000/{n:04d}-00",
        email=f"empresa{n}@teste.com",
        telefone="(11) 0000-0000",
    )


def criar_usuario(empresa, perfil=Usuario.Perfil.OPERADOR, **extra):
    n = next(_seq)
    return Usuario.objects.create_user(
        email=extra.pop("email", f"user{n}@teste.com"),
        nome=extra.pop("nome", f"Usuario {n}"),
        password=extra.pop("password", SENHA_PADRAO),
        perfil=perfil,
        id_empresa=empresa,
        **extra,
    )


def criar_setor(empresa, nome=None):
    return Setor.objects.create(nome=nome or f"Setor {next(_seq)}", id_empresa=empresa)


def vincular(usuario, setor, perfil_no_setor=UsuarioSetor.PerfilSetor.OPERADOR):
    return UsuarioSetor.objects.create(
        id_usuario=usuario, id_setor=setor, perfil_no_setor=perfil_no_setor
    )


def criar_equipamento(setor, tem_iot=False, **extra):
    n = next(_seq)
    return Equipamento.objects.create(
        tag=extra.pop("tag", f"EQ-{n:04d}"),
        nome=extra.pop("nome", f"Equipamento {n}"),
        id_setor=setor,
        tem_iot=tem_iot,
        **extra,
    )


class Cenario:
    """Uma empresa completa: admin, tecnico, operador, setor e equipamento."""

    def __init__(self):
        self.empresa = criar_empresa()
        self.setor = criar_setor(self.empresa)
        self.admin = criar_usuario(self.empresa, Usuario.Perfil.ADMIN)
        self.tecnico = criar_usuario(self.empresa, Usuario.Perfil.TECNICO)
        self.operador = criar_usuario(self.empresa, Usuario.Perfil.OPERADOR)
        self.vinculo_tecnico = vincular(
            self.tecnico, self.setor, UsuarioSetor.PerfilSetor.TECNICO
        )
        self.vinculo_operador = vincular(
            self.operador, self.setor, UsuarioSetor.PerfilSetor.OPERADOR
        )
        self.equipamento = criar_equipamento(self.setor)
