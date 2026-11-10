from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from empresas.models import Empresa, Setor
from equipamentos.models import Equipamento, TipoEquipamento
from manutencao.models import ExecucaoPlano, PlanoManutencao
from notificacoes.models import Notificacao
from ordens_servico.models import OrdemServico
from usuarios.models import Usuario, UsuarioSetor

# Historico de cada ocorrencia nos planos de demonstracao, em dias relativos a
# hoje: (NO_PRAZO | FORA_DO_PRAZO, prevista, concluida), (PULADA, prevista,
# motivo) ou (EM_ABERTO, prevista).
NO_PRAZO, FORA_DO_PRAZO, PULADA, EM_ABERTO = "no_prazo", "fora_do_prazo", "pulada", "em_aberto"


def _momento(dia, hora):
    return timezone.make_aware(datetime.combine(dia, time(hora)))


class Command(BaseCommand):
    help = (
        "Cria/atualiza dados de mock no banco para testes locais "
        "(empresa, usuarios, setores, tipos, equipamentos e OS). "
        "--with-planos recria os planos dos equipamentos DEMO-EQ-* com historico."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-os",
            action="store_true",
            help="Tambem cria OS de exemplo (operador e IoT).",
        )
        parser.add_argument(
            "--with-planos",
            action="store_true",
            help=(
                "Recria os planos preventivos dos equipamentos DEMO-EQ-* com 3 meses "
                "de historico (para a aba Preventivas). Apaga os planos e as OS "
                "desses planos que ja existirem nesses equipamentos."
            ),
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
        vinculo_tecnico = self._garantir_vinculo(
            tecnico, setor_prod, UsuarioSetor.PerfilSetor.TECNICO
        )

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
        eq_caldeira = self._garantir_equipamento(
            tag="DEMO-EQ-002",
            nome="Caldeira 1",
            setor=setor_util,
            tipo=tipo_caldeira,
            tem_iot=True,
        )
        eq_bomba = self._garantir_equipamento(
            tag="DEMO-EQ-003",
            nome="Bomba de Recalque",
            setor=setor_util,
            tipo=tipo_bomba,
            tem_iot=False,
        )

        if options["with_os"]:
            self._garantir_os_operador(operador, admin, eq_esteira)
            self._garantir_os_iot(eq_esteira)

        if options["with_planos"]:
            equipamentos = {
                "esteira": eq_esteira,
                "caldeira": eq_caldeira,
                "bomba": eq_bomba,
                "bomba_circulacao": self._garantir_equipamento(
                    tag="DEMO-EQ-004",
                    nome="Bomba de Circulacao",
                    setor=setor_util,
                    tipo=tipo_bomba,
                    tem_iot=False,
                ),
                "embaladora": self._garantir_equipamento(
                    tag="DEMO-EQ-005",
                    nome="Esteira de Embalagem",
                    setor=setor_prod,
                    tipo=tipo_esteira,
                    tem_iot=False,
                ),
            }
            self._recriar_planos(equipamentos, operador, vinculo_tecnico)

        self.stdout.write(self.style.SUCCESS("Seed de mock concluido com sucesso."))

    # ─── Planos preventivos de demonstracao ──────────────────────────────────

    def _recriar_planos(self, eq, operador, vinculo_tecnico):
        """Recria planos com historico pensado para a demonstracao: aderencia
        em torno de 70%, 2 preventivas atrasadas, 1 plano pausado, carga para
        o tecnico e algumas corretivas para comparar com as preventivas."""
        hoje = timezone.localdate()
        demo = Equipamento.objects.filter(tag__startswith="DEMO-EQ-")
        OrdemServico.objects.filter(plano_origem__id_equipamento__in=demo).delete()
        OrdemServico.objects.filter(
            id_equipamento__in=demo, titulo__startswith="DEMO - Corretiva"
        ).delete()
        PlanoManutencao.objects.filter(id_equipamento__in=demo).delete()

        planos = (
            dict(
                equipamento=eq["esteira"], tecnico=vinculo_tecnico,
                descricao="Lubrificar rolamentos e verificar tensão da correia",
                periodicidade=30, primeira=-90, antecedencia=2, horas="2.0",
                instrucoes="1. Bloquear e etiquetar a esteira\n2. Lubrificar os rolamentos\n3. Conferir a tensão da correia",
                historico=[(NO_PRAZO, -90, -89), (NO_PRAZO, -60, -58), (FORA_DO_PRAZO, -30, -24)],
            ),
            dict(
                equipamento=eq["caldeira"], prioridade=OrdemServico.Prioridade.ALTA,
                descricao="Inspecionar queimador e purgar a caldeira",
                periodicidade=15, primeira=-75, horas="3.0",
                historico=[
                    (NO_PRAZO, -75, -75), (NO_PRAZO, -60, -59), (FORA_DO_PRAZO, -45, -38),
                    (PULADA, -30, ExecucaoPlano.Motivo.ATRASADA), (EM_ABERTO, -15),
                ],
            ),
            dict(
                equipamento=eq["bomba"],
                descricao="Verificar selo mecânico e alinhamento",
                periodicidade=60, primeira=-55, horas="1.5",
                historico=[(NO_PRAZO, -55, -54)],
            ),
            dict(
                # Ocorrencia vencida e ainda nao gerada (como se o worker
                # estivesse parado): rode gerar_preventivas para gerar a OS.
                equipamento=eq["bomba_circulacao"],
                descricao="Trocar óleo do motor",
                periodicidade=90, primeira=-3, horas="2.5", historico=[],
            ),
            dict(
                equipamento=eq["embaladora"], tecnico=vinculo_tecnico,
                descricao="Limpeza e ajuste dos sensores",
                periodicidade=7, primeira=-54, horas="1.0",
                historico=[
                    (NO_PRAZO, -54, -54), (NO_PRAZO, -47, -46), (NO_PRAZO, -40, -40),
                    (NO_PRAZO, -33, -31), (PULADA, -26, ExecucaoPlano.Motivo.MANUAL),
                    (NO_PRAZO, -19, -19), (FORA_DO_PRAZO, -12, -6), (NO_PRAZO, -5, -4),
                ],
            ),
            dict(
                equipamento=eq["esteira"], tecnico=vinculo_tecnico,
                descricao="Revisão geral semestral",
                periodicidade=180, primeira=40, horas="6.0", historico=[],
            ),
            dict(
                equipamento=eq["caldeira"], ativo=False,
                descricao="Teste hidrostático anual",
                periodicidade=365, primeira=100, horas="8.0", historico=[],
            ),
        )
        for dados in planos:
            self._criar_plano_com_historico(hoje, **dados)

        corretivas = (
            (eq["esteira"], "DEMO - Corretiva: correia rompida", -80),
            (eq["caldeira"], "DEMO - Corretiva: falha na ignição", -50),
            (eq["bomba"], "DEMO - Corretiva: vazamento no selo", -35),
            (eq["embaladora"], "DEMO - Corretiva: sensor desalinhado", -20),
        )
        for equipamento, titulo, dia in corretivas:
            ordem = OrdemServico.objects.create(
                titulo=titulo,
                tipo_manutencao=OrdemServico.TipoManutencao.CORRETIVA,
                prioridade=OrdemServico.Prioridade.ALTA,
                status=OrdemServico.Status.CONCLUIDA,
                solicitante=operador,
                id_equipamento=equipamento,
                data_inicio=_momento(hoje + timedelta(days=dia), 10),
                data_fim=_momento(hoje + timedelta(days=dia), 16),
                relatorio_intervencao="Corrigido no mesmo dia.",
            )
            OrdemServico.objects.filter(pk=ordem.pk).update(
                data_abertura=_momento(hoje + timedelta(days=dia), 8)
            )

        self._sincronizar_equipamentos(eq.values())

    def _criar_plano_com_historico(
        self, hoje, *, equipamento, descricao, periodicidade, primeira, horas,
        historico, tecnico=None, antecedencia=0, ativo=True, instrucoes="",
        prioridade=OrdemServico.Prioridade.MEDIA,
    ):
        # A proxima execucao continua a serie a partir da primeira data.
        proxima = hoje + timedelta(days=primeira)
        while proxima < hoje and historico:
            proxima += timedelta(days=periodicidade)

        plano = PlanoManutencao.objects.create(
            id_equipamento=equipamento,
            id_setor=equipamento.id_setor,
            descricao=descricao,
            tipo=PlanoManutencao.Tipo.PREVENTIVA,
            periodicidade_dias=periodicidade,
            proxima_execucao=proxima,
            dias_antecedencia=antecedencia,
            prioridade=prioridade,
            tecnico_sugerido=tecnico,
            duracao_estimada_horas=Decimal(horas),
            instrucoes=instrucoes,
            ativo=ativo,
        )

        for situacao, prevista_rel, *resto in historico:
            prevista = hoje + timedelta(days=prevista_rel)
            if situacao == PULADA:
                ExecucaoPlano.objects.create(
                    id_plano=plano, id_equipamento=equipamento, data_prevista=prevista,
                    status=ExecucaoPlano.Status.PULADA, motivo=resto[0],
                )
                continue

            ordem = OrdemServico.objects.create(
                titulo=f"Manutenção Preventiva - {equipamento.nome}",
                descricao=(
                    f"Manutenção preventiva automática\n\n{descricao}\n\n"
                    f"Data prevista: {prevista:%d/%m/%Y}"
                ),
                tipo_manutencao=OrdemServico.TipoManutencao.PREVENTIVA,
                prioridade=prioridade,
                status=OrdemServico.Status.ABERTA,  # em aberto: aguarda aprovacao
                id_equipamento=equipamento,
                plano_origem=plano,
            )
            if situacao in (NO_PRAZO, FORA_DO_PRAZO):
                concluida = hoje + timedelta(days=resto[0])
                ordem.status = OrdemServico.Status.CONCLUIDA
                ordem.tecnico = tecnico
                ordem.data_inicio = _momento(concluida, 9)
                ordem.data_fim = ordem.timestamp_retorno_operacao = _momento(concluida, 15)
                ordem.proxima_manutencao = prevista + timedelta(days=periodicidade)
                ordem.relatorio_intervencao = "Executado conforme o plano."
                ordem.save()
                plano.ultima_manutencao = ordem.data_fim
            OrdemServico.objects.filter(pk=ordem.pk).update(
                data_abertura=_momento(prevista - timedelta(days=antecedencia), 7)
            )
            ExecucaoPlano.objects.create(
                id_plano=plano, id_equipamento=equipamento, data_prevista=prevista,
                id_os=ordem, status=ExecucaoPlano.Status.GERADA,
            )

        plano.save(update_fields=["ultima_manutencao"])

    def _sincronizar_equipamentos(self, equipamentos):
        """Ultima/proxima manutencao e status coerentes com o historico gerado."""
        for equipamento in equipamentos:
            ultima = (
                OrdemServico.objects.filter(
                    id_equipamento=equipamento, status=OrdemServico.Status.CONCLUIDA
                )
                .order_by("-data_fim")
                .values_list("data_fim", flat=True)
                .first()
            )
            proxima = (
                equipamento.planos_manutencao.filter(ativo=True)
                .order_by("proxima_execucao")
                .values_list("proxima_execucao", flat=True)
                .first()
            )
            em_curso = OrdemServico.objects.em_aberto().filter(
                id_equipamento=equipamento, status=OrdemServico.Status.EM_ANDAMENTO
            ).exists()
            equipamento.ultima_manutencao = ultima
            equipamento.proxima_manutencao = proxima
            if equipamento.status != Equipamento.Status.INATIVO:
                equipamento.status = (
                    Equipamento.Status.EM_MANUTENCAO if em_curso else Equipamento.Status.ATIVO
                )
            equipamento.save(
                update_fields=["ultima_manutencao", "proxima_manutencao", "status"]
            )

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
