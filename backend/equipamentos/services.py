"""Regras de negocio dos equipamentos: geracao automatica da TAG."""

import re
import unicodedata

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Equipamento

# Palavras de ligacao nao entram nas iniciais ("Bomba de Vacuo" -> BV).
PALAVRAS_DE_LIGACAO = {
    "A", "AS", "O", "OS", "E", "DE", "DA", "DO", "DAS", "DOS",
    "EM", "NA", "NO", "COM", "PARA", "POR",
}
PREFIXO_PADRAO = "EQ"
DIGITOS_MINIMOS = 3
TENTATIVAS = 5


def prefixo_da_tag(nome: str) -> str:
    """Duas letras a partir do nome: iniciais das duas primeiras palavras, ou
    as duas primeiras letras quando o nome tem uma palavra so. Sem acentos,
    numeros nem pontuacao; completa com X se faltar letra."""
    sem_acento = unicodedata.normalize("NFKD", nome or "").encode("ascii", "ignore").decode()
    palavras = re.findall(r"[A-Z]+", sem_acento.upper())
    significativas = [p for p in palavras if p not in PALAVRAS_DE_LIGACAO] or palavras
    if not significativas:
        return PREFIXO_PADRAO
    if len(significativas) >= 2:
        return significativas[0][0] + significativas[1][0]
    return significativas[0][:2].ljust(2, "X")


def proxima_tag(prefixo: str) -> str:
    """Maior numero ja usado com o prefixo + 1. A TAG e unica no sistema
    inteiro, entao a sequencia e a mesma para todas as empresas."""
    padrao = re.compile(rf"^{re.escape(prefixo)}-(\d+)$")
    tags = Equipamento.objects.filter(tag__startswith=f"{prefixo}-").values_list("tag", flat=True)
    numeros = [int(m.group(1)) for m in map(padrao.match, tags) if m]
    return f"{prefixo}-{max(numeros, default=0) + 1:0{DIGITOS_MINIMOS}d}"


def criar_com_tag_automatica(**dados) -> Equipamento:
    """Cria o equipamento com a proxima TAG livre. Se dois cadastros
    simultaneos pegarem o mesmo numero, a restricao unica barra o segundo, que
    tenta o numero seguinte.

    Sem data de entrada em operacao informada, vale o momento do cadastro: e
    dela que os relatorios de confiabilidade (MTBF/MTTF) contam o tempo."""
    if not dados.get("data_entrada_operacao"):
        dados["data_entrada_operacao"] = timezone.now()
    prefixo = prefixo_da_tag(dados.get("nome", ""))
    for _ in range(TENTATIVAS):
        try:
            with transaction.atomic():
                return Equipamento.objects.create(tag=proxima_tag(prefixo), **dados)
        except IntegrityError:
            continue
    raise ValueError("Não foi possível gerar a TAG do equipamento. Tente novamente.")
