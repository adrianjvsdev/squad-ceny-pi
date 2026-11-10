from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from equipamentos.models import Equipamento
from ordens_servico.models import OrdemServico
from usuarios.permissions import IsAdmin

from . import services
from .indicadores import calcular_indicadores, montar_agenda
from .iot_Mock import ler_sensores
from .models import ExecucaoPlano, PlanoManutencao, AnomaliaIoT
from .serializers import (
    ExecucaoPlanoSerializer,
    IoTStatusSerializer,
    PlanoManutencaoSerializer,
)
from .services import calcular_status_geral

JANELA_MAXIMA_AGENDA_DIAS = 366
PERIODO_MAXIMO_INDICADORES_DIAS = 365


class PlanoManutencaoViewSet(viewsets.ModelViewSet):
    """Planos de manutencao (agendamentos). Filtros opcionais na listagem,
    na agenda e nos indicadores: ?id_equipamento=, ?id_setor=, ?tipo=,
    ?ativo=true|false e ?tecnico=me (planos com o usuario como tecnico sugerido)."""

    serializer_class = PlanoManutencaoSerializer
    ACOES_DE_LEITURA = ("list", "retrieve", "execucoes", "agenda", "indicadores")

    def get_permissions(self):
        # Qualquer usuário lê os planos que enxerga; só o admin agenda,
        # edita, exclui, pausa, retoma, executa ou pula.
        if self.action in self.ACOES_DE_LEITURA:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = (
            PlanoManutencao.objects.visiveis_para(self.request.user)
            .select_related("tecnico_sugerido__id_usuario")
            .com_situacao()
        )
        return self._filtrar(queryset)

    # ─── Filtros ──────────────────────────────────────────────────────────

    def _param_int(self, nome):
        valor = self.request.query_params.get(nome)
        if valor in (None, ""):
            return None
        try:
            return int(valor)
        except ValueError:
            raise ValidationError({nome: ["Informe um número inteiro."]})

    def _param_data(self, nome, padrao):
        valor = self.request.query_params.get(nome)
        if valor in (None, ""):
            return padrao
        try:
            data = parse_date(valor)
        except ValueError:
            data = None
        if data is None:
            raise ValidationError({nome: ["Informe a data no formato AAAA-MM-DD."]})
        return data

    def _filtrar(self, queryset):
        params = self.request.query_params
        id_equipamento = self._param_int("id_equipamento")
        if id_equipamento is not None:
            queryset = queryset.filter(id_equipamento=id_equipamento)
        id_setor = self._param_int("id_setor")
        if id_setor is not None:
            queryset = queryset.filter(id_equipamento__id_setor=id_setor)
        if params.get("tipo"):
            queryset = queryset.filter(tipo=params["tipo"])
        ativo = params.get("ativo")
        if ativo in ("true", "false"):
            queryset = queryset.filter(ativo=ativo == "true")
        if params.get("tecnico") == "me":
            queryset = queryset.filter(tecnico_sugerido__id_usuario=self.request.user)
        return queryset

    def _ordens_filtradas(self):
        """OS visiveis com os mesmos filtros de equipamento/setor dos planos."""
        ordens = OrdemServico.objects.visiveis_para(self.request.user)
        id_equipamento = self._param_int("id_equipamento")
        if id_equipamento is not None:
            ordens = ordens.filter(id_equipamento=id_equipamento)
        id_setor = self._param_int("id_setor")
        if id_setor is not None:
            ordens = ordens.filter(id_equipamento__id_setor=id_setor)
        return ordens

    # ─── Respostas ────────────────────────────────────────────────────────

    def _bad_request(self, erro):
        return Response({"detail": str(erro)}, status=status.HTTP_400_BAD_REQUEST)

    def _plano_atualizado(self, plano):
        """Recarrega o plano com as anotacoes de situacao e serializa."""
        plano = self.get_queryset().get(pk=plano.pk)
        return self.get_serializer(plano).data

    # ─── Acoes sobre um plano (so admin) ──────────────────────────────────

    @action(detail=True, methods=["patch"], url_path="pausar")
    def pausar(self, request, pk=None):
        try:
            plano = services.pausar(self.get_object())
        except ValueError as erro:
            return self._bad_request(erro)
        return Response(self._plano_atualizado(plano))

    @action(detail=True, methods=["patch"], url_path="retomar")
    def retomar(self, request, pk=None):
        try:
            plano = services.retomar(self.get_object())
        except ValueError as erro:
            return self._bad_request(erro)
        return Response(self._plano_atualizado(plano))

    @action(detail=True, methods=["patch"], url_path="executar-agora")
    def executar_agora(self, request, pk=None):
        plano = self.get_object()
        try:
            ordem = services.executar_agora(plano)
        except ValueError as erro:
            return self._bad_request(erro)
        return Response(
            {
                "detail": f"OS #{ordem.id_os} gerada e aguardando aprovação.",
                "id_os": ordem.id_os,
                "plano": self._plano_atualizado(plano),
            }
        )

    @action(detail=True, methods=["patch"], url_path="pular-proxima")
    def pular_proxima(self, request, pk=None):
        plano = services.pular_proxima(self.get_object())
        return Response(self._plano_atualizado(plano))

    # ─── Leitura ──────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="execucoes")
    def execucoes(self, request, pk=None):
        execucoes = ExecucaoPlano.objects.filter(id_plano=self.get_object()).select_related(
            "id_os"
        )
        return Response(ExecucaoPlanoSerializer(execucoes, many=True).data)

    @action(detail=False, methods=["get"], url_path="agenda")
    def agenda(self, request):
        """Ocorrencias de ?inicio= a ?fim= (padrao: 7 dias atras a 30 dias a frente)."""
        hoje = timezone.localdate()
        inicio = self._param_data("inicio", hoje - timedelta(days=7))
        fim = self._param_data("fim", hoje + timedelta(days=30))
        if fim < inicio:
            return self._bad_request("A data final deve ser igual ou posterior à inicial.")
        if (fim - inicio).days > JANELA_MAXIMA_AGENDA_DIAS:
            return self._bad_request(
                f"A agenda aceita no máximo {JANELA_MAXIMA_AGENDA_DIAS} dias."
            )
        return Response(montar_agenda(self.get_queryset(), inicio, fim, hoje))

    @action(detail=False, methods=["get"], url_path="indicadores")
    def indicadores(self, request):
        """Indicadores das preventivas na janela ?dias= (padrao 90)."""
        dias = self._param_int("dias")
        if dias is None:
            dias = 90
        if not 1 <= dias <= PERIODO_MAXIMO_INDICADORES_DIAS:
            return self._bad_request(
                f"O período deve ser de 1 a {PERIODO_MAXIMO_INDICADORES_DIAS} dias."
            )
        return Response(
            calcular_indicadores(self.get_queryset(), self._ordens_filtradas(), dias=dias)
        )


class IoTStatusViewSet(viewsets.ViewSet):
    """
    Retorna:
    - temperatura, rpm, pressão (simulados)
    - anomalias recentes
    - status geral (normal, alerta, crítico)
    """
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """
        Retorna dados IoT simulados para um equipamento específico.
        Incluindo: temperatura, rpm, pressão e anomalias recentes.
        """
        try:
            equipamento = Equipamento.objects.visiveis_para(request.user).get(
                id_equipamento=pk
            )
        except Equipamento.DoesNotExist:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        # se não tiver Iot retorna nulo
        dados = {
            "id_equipamento": equipamento.id_equipamento,
            "tag": equipamento.tag,
            "nome": equipamento.nome,
            "tem_iot": equipamento.tem_iot,
            "temperatura": None,
            "rpm": None,
            "pressao": None,
            "anomalias_recentes": [],
            "status_geral": "desabilitado",
        }

        if equipamento.tem_iot:
            anomalias_recentes = list(
                AnomaliaIoT.objects.filter(equipamento=equipamento).order_by(
                    "-detectada_em"
                )[:10]
            )
            dados.update(
                ler_sensores(),
                anomalias_recentes=anomalias_recentes,
                status_geral=calcular_status_geral(anomalias_recentes),
            )

        return Response(IoTStatusSerializer(dados).data)
