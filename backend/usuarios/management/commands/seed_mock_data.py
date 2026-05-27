from django.core.management.base import BaseCommand
from django.db import transaction

from empresas.models import Empresa, Setor
from equipamentos.models import Equipamento, TipoEquipamento
from notificacoes.models import Notificacao
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario, UsuarioSetor


class Command(BaseCommand):
    help = (
        "Cria/atualiza dados de mock no banco para testes locais "
        "(empresa, usuarios, setores, tipos, equipamentos e OS)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-os",
            action="store_true",
            help="Tambem cria OS de exemplo (operador e IoT).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        empresa = self._garantir_empresa()

        admin = self._garantir_usuario(
            email="mariafernanda@uspe.com",
            nome="Maria Fernanda",
            perfil=Usuario.Perfil.ADMIN,
            senha="123456",
            empresa=empresa,
            is_staff=True,
        )
        operador = self._garantir_usuario(
            email="carlosulberg@uspe.com",
            nome="Carlos Ulberg",
            perfil=Usuario.Perfil.OPERADOR,
            senha="123456",
            empresa=empresa,
        )
        tecnico = self._garantir_usuario(
            email="tecnico@uspe.com",
            nome="Tecnico Demo",
            perfil=Usuario.Perfil.TECNICO,
            senha="123456",
            empresa=empresa,
        )

        setor_util = self._garantir_setor(empresa, "Utilidades")
        setor_prod = self._garantir_setor(empresa, "Producao")

        self._garantir_vinculo(admin, setor_util, UsuarioSetor.PerfilSetor.GESTOR)
        self._garantir_vinculo(operador, setor_prod, UsuarioSetor.PerfilSetor.OPERADOR)
        self._garantir_vinculo(tecnico, setor_prod, UsuarioSetor.PerfilSetor.TECNICO)

        tipo_esteira = self._garantir_tipo("Esteira", "Transporte de caixas")
        tipo_caldeira = self._garantir_tipo("Caldeira", "Controle termico")
        tipo_bomba = self._garantir_tipo("Bomba", "Bombeamento de fluidos")

        eq_esteira = self._garantir_equipamento(
            tag="DEMO-EQ-001",
            nome="Esteira Principal",
            setor=setor_prod,
            tipo=tipo_esteira,
            tem_iot=True,
        )
        self._garantir_equipamento(
            tag="DEMO-EQ-002",
            nome="Caldeira 1",
            setor=setor_util,
            tipo=tipo_caldeira,
            tem_iot=True,
        )
        self._garantir_equipamento(
            tag="DEMO-EQ-003",
            nome="Bomba de Recalque",
            setor=setor_util,
            tipo=tipo_bomba,
            tem_iot=False,
        )

        if options["with_os"]:
            self._garantir_os_operador(operador, admin, eq_esteira)
            self._garantir_os_iot(eq_esteira)

        self.stdout.write(self.style.SUCCESS("Seed de mock concluido com sucesso."))

    def _garantir_empresa(self):
        empresa = None
        admin_existente = Usuario.objects.filter(email="mariafernanda@uspe.com").first()
        if admin_existente and admin_existente.id_empresa:
            empresa = admin_existente.id_empresa

        if empresa is None:
            empresa, _ = Empresa.objects.get_or_create(
                cnpj="12.345.678/0001-99",
                defaults={
                    "nome": "USPE Industria",
                    "email": "contato@uspe.com",
                    "telefone": "(11) 3333-0000",
                },
            )
        return empresa

    def _garantir_usuario(self, *, email, nome, perfil, senha, empresa, is_staff=False):
        usuario = Usuario.objects.filter(email=email).first()
        if usuario is None:
            usuario = Usuario(
                email=email,
                nome=nome,
                perfil=perfil,
                id_empresa=empresa,
                is_active=True,
                is_staff=is_staff,
            )
        else:
            usuario.nome = nome
            usuario.perfil = perfil
            usuario.id_empresa = empresa
            usuario.is_active = True
            if perfil == Usuario.Perfil.ADMIN:
                usuario.is_staff = True

        usuario.set_password(senha)
        usuario.save()
        return usuario

    def _garantir_setor(self, empresa, nome):
        setor, _ = Setor.objects.get_or_create(
            id_empresa=empresa,
            nome=nome,
        )
        return setor

    def _garantir_vinculo(self, usuario, setor, perfil_no_setor):
        vinculo, _ = UsuarioSetor.objects.get_or_create(
            id_usuario=usuario,
            id_setor=setor,
            defaults={"perfil_no_setor": perfil_no_setor},
        )
        if vinculo.perfil_no_setor != perfil_no_setor:
            vinculo.perfil_no_setor = perfil_no_setor
            vinculo.save(update_fields=["perfil_no_setor"])
        return vinculo

    def _garantir_tipo(self, nome, descricao):
        tipo, _ = TipoEquipamento.objects.get_or_create(
            nome=nome,
            defaults={"descricao": descricao},
        )
        if not tipo.descricao:
            tipo.descricao = descricao
            tipo.save(update_fields=["descricao"])
        return tipo

    def _garantir_equipamento(self, *, tag, nome, setor, tipo, tem_iot):
        equipamento, _ = Equipamento.objects.get_or_create(
            tag=tag,
            defaults={
                "nome": nome,
                "id_setor": setor,
                "id_tipo": tipo,
                "tem_iot": tem_iot,
                "status": Equipamento.Status.ATIVO,
            },
        )
        equipamento.nome = nome
        equipamento.id_setor = setor
        equipamento.id_tipo = tipo
        equipamento.tem_iot = tem_iot
        if not equipamento.status:
            equipamento.status = Equipamento.Status.ATIVO
        equipamento.save()
        return equipamento

    def _garantir_os_operador(self, operador, admin, equipamento):
        ordem = OrdemServico.objects.filter(
            titulo="DEMO - Falha na esteira",
            solicitante=operador,
            status=OrdemServico.Status.ABERTA,
        ).first()
        if ordem is None:
            ordem = OrdemServico.objects.create(
                titulo="DEMO - Falha na esteira",
                descricao="Queda de rendimento observada no turno.",
                prioridade=OrdemServico.Prioridade.MEDIA,
                status=OrdemServico.Status.ABERTA,
                tipo_manutencao=OrdemServico.TipoManutencao.CORRETIVA,
                solicitante=operador,
                id_equipamento=equipamento,
            )

        Notificacao.objects.get_or_create(
            id_usuario=admin,
            id_os=ordem,
            tipo=Notificacao.Tipo.OS_ABERTA,
            canal=Notificacao.Canal.PUSH,
            titulo=f"OS #{ordem.id_os} aguardando aprovacao",
            defaults={
                "mensagem": f"{operador.nome} abriu uma OS: {ordem.titulo}",
            },
        )

    def _garantir_os_iot(self, equipamento):
        OrdemServico.objects.get_or_create(
            titulo="DEMO - Anomalia IoT de temperatura",
            solicitante=None,
            status=OrdemServico.Status.ABERTA,
            tipo_manutencao=OrdemServico.TipoManutencao.PREDITIVA,
            id_equipamento=equipamento,
            defaults={
                "descricao": "OS automatica gerada pelo monitoramento IoT.",
                "prioridade": OrdemServico.Prioridade.ALTA,
            },
        )
