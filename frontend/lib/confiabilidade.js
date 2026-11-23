// Indicadores de confiabilidade (MTBF, MTTF, MTTR, disponibilidade) calculados
// no frontend a partir das ordens de serviço e dos equipamentos do backend.
//
// Definições usadas (todas em horas):
// - Falha: OS corretiva não cancelada, aberta dentro do período.
// - Tempo observado: do início do período (ou da entrada em operação do
//   equipamento, se for depois) até o fim do período.
// - Tempo parado: da abertura da OS corretiva até o retorno à operação (ou a
//   conclusão; se ainda aberta, até o fim do período), recortado no período.
// - MTTR = tempo de reparo (início → conclusão da OS) ÷ nº de reparos concluídos.
// - MTBF = tempo observado ÷ nº de falhas.
// - MTTF = (tempo observado − tempo parado) ÷ nº de falhas — tempo médio em
//   operação até a próxima falha. MTBF ≈ MTTF + MTTR.
// - Disponibilidade = (tempo observado − tempo parado) ÷ tempo observado.

import { parseData } from "./datas";

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export const TIPOS_MANUTENCAO = [
  { valor: "preventiva", label: "Preventiva", cor: "#2b5ce6" },
  { valor: "corretiva", label: "Corretiva", cor: "#d97706" },
  { valor: "preditiva", label: "Preditiva", cor: "#7c3aed" },
];

// Abaixo disso o modelo de ML não tem histórico suficiente por equipamento.
export const MIN_FALHAS_TREINO = 5;

export function comoLista(data) {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export function janelaDoPeriodo(dias, fim = new Date()) {
  return { inicio: new Date(fim.getTime() - dias * DIA_MS), fim };
}

export function janelaAnterior({ inicio, fim }) {
  const duracao = fim - inicio;
  return { inicio: new Date(inicio - duracao), fim: inicio };
}

function ms(valor) {
  const data = parseData(valor);
  return data ? data.getTime() : null;
}

function dentro(valor, { inicio, fim }) {
  const t = ms(valor);
  return t !== null && t >= inicio.getTime() && t < fim.getTime();
}

export function ehFalha(os) {
  return os.tipo_manutencao === "corretiva" && os.status !== "cancelada";
}

function horasDeReparo(os) {
  const fim = ms(os.data_fim);
  const inicio = ms(os.data_inicio) ?? ms(os.data_abertura);
  if (os.status !== "concluida" || fim === null || inicio === null || fim < inicio) {
    return null;
  }
  return (fim - inicio) / HORA_MS;
}

function horasParado(os, { inicio, fim }) {
  const de = ms(os.data_abertura);
  if (de === null) return 0;
  const ate = ms(os.timestamp_retorno_operacao) ?? ms(os.data_fim) ?? fim.getTime();
  const a = Math.max(de, inicio.getTime());
  const b = Math.min(ate, fim.getTime());
  return b > a ? (b - a) / HORA_MS : 0;
}

function horasObservadas(equipamento, { inicio, fim }) {
  const entrada =
    ms(equipamento.data_entrada_operacao) ?? ms(equipamento.data_instalacao);
  const de = Math.max(inicio.getTime(), entrada ?? inicio.getTime());
  return de < fim.getTime() ? (fim.getTime() - de) / HORA_MS : 0;
}

function dividir(a, b) {
  return b > 0 ? a / b : null;
}

function resumir({ horas, parado, falhas, reparos, horasReparo }) {
  return {
    falhas,
    reparos,
    horasObservadas: horas,
    horasParado: parado,
    mtbf: dividir(horas, falhas),
    mttf: dividir(Math.max(horas - parado, 0), falhas),
    mttr: dividir(horasReparo, reparos),
    disponibilidade: dividir(Math.max(horas - parado, 0), horas),
  };
}

// Indicadores por equipamento e da frota no período.
export function calcularConfiabilidade(ordens, equipamentos, janela) {
  const porEquipamento = new Map();
  for (const equipamento of equipamentos) {
    porEquipamento.set(equipamento.id_equipamento, {
      equipamento,
      horas: equipamento.status === "inativo" ? 0 : horasObservadas(equipamento, janela),
      parado: 0,
      falhas: 0,
      reparos: 0,
      horasReparo: 0,
      custo: 0,
      ordens: 0,
    });
  }

  for (const os of ordens) {
    const item = porEquipamento.get(os.id_equipamento);
    if (!item) continue;
    if (dentro(os.data_abertura, janela) && os.status !== "cancelada") {
      item.ordens += 1;
      if (os.status === "concluida" && os.custo) item.custo += Number(os.custo) || 0;
    }
    if (!ehFalha(os)) continue;
    // O tempo parado conta mesmo se a falha abriu antes e invadiu o período.
    item.parado += horasParado(os, janela);
    if (!dentro(os.data_abertura, janela)) continue;
    item.falhas += 1;
    const reparo = horasDeReparo(os);
    if (reparo !== null) {
      item.reparos += 1;
      item.horasReparo += reparo;
    }
  }

  const linhas = [...porEquipamento.values()].map((item) => ({
    equipamento: item.equipamento,
    ordens: item.ordens,
    custo: item.custo,
    ...resumir({ ...item, parado: Math.min(item.parado, item.horas) }),
  }));

  const total = linhas.reduce(
    (acc, l) => ({
      horas: acc.horas + l.horasObservadas,
      parado: acc.parado + l.horasParado,
      falhas: acc.falhas + l.falhas,
      reparos: acc.reparos + l.reparos,
      horasReparo: acc.horasReparo + (l.mttr ?? 0) * l.reparos,
    }),
    { horas: 0, parado: 0, falhas: 0, reparos: 0, horasReparo: 0 },
  );

  return { frota: resumir(total), linhas };
}

// Gestão: planejada x corretiva, backlog e custo no período.
export function calcularGestao(ordens, janela) {
  const doPeriodo = ordens.filter(
    (os) => os.status !== "cancelada" && dentro(os.data_abertura, janela),
  );
  const planejadas = doPeriodo.filter((os) => os.tipo_manutencao !== "corretiva").length;
  const abertas = ordens.filter((os) => ["aberta", "em_andamento"].includes(os.status));
  const agora = janela.fim.getTime();
  const idadeMedia = dividir(
    abertas.reduce((s, os) => s + (agora - (ms(os.data_abertura) ?? agora)) / DIA_MS, 0),
    abertas.length,
  );
  const custo = { total: 0, corretiva: 0, preventiva: 0, preditiva: 0 };
  for (const os of doPeriodo) {
    if (os.status !== "concluida" || !os.custo) continue;
    const valor = Number(os.custo) || 0;
    custo.total += valor;
    custo[os.tipo_manutencao] = (custo[os.tipo_manutencao] ?? 0) + valor;
  }
  return {
    totalPeriodo: doPeriodo.length,
    percentualPlanejada: dividir(planejadas, doPeriodo.length),
    backlog: abertas.length,
    backlogCriticas: abertas.filter((os) => os.prioridade === "critica").length,
    idadeMediaBacklog: idadeMedia,
    custo,
  };
}

// OS do período agrupadas por semana (até 60 dias) ou por mês, por tipo.
export function ordensPorPeriodo(ordens, janela, dias) {
  const porSemana = dias <= 60;
  const baldes = [];
  if (porSemana) {
    for (let t = janela.inicio.getTime(); t < janela.fim.getTime(); t += 7 * DIA_MS) {
      const d = new Date(t);
      baldes.push({
        inicio: t,
        fim: Math.min(t + 7 * DIA_MS, janela.fim.getTime()),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      });
    }
  } else {
    const d = new Date(janela.inicio.getFullYear(), janela.inicio.getMonth(), 1);
    while (d < janela.fim) {
      const proximo = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      baldes.push({
        inicio: d.getTime(),
        fim: proximo.getTime(),
        label: d
          .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          .replace(".", "")
          .replace(" de ", "/"),
      });
      d.setMonth(d.getMonth() + 1);
    }
  }
  for (const balde of baldes) {
    for (const tipo of TIPOS_MANUTENCAO) balde[tipo.valor] = 0;
  }
  for (const os of ordens) {
    if (os.status === "cancelada" || !dentro(os.data_abertura, janela)) continue;
    const t = ms(os.data_abertura);
    const balde = baldes.find((b) => t >= b.inicio && t < b.fim);
    if (balde && os.tipo_manutencao in balde) balde[os.tipo_manutencao] += 1;
  }
  return { baldes, unidade: porSemana ? "semana" : "mês" };
}

// Falhas do período por tipo de problema (triagem ou pré-diagnóstico da IA).
export function falhasPorTipoProblema(ordens, janela, labels) {
  const contagem = {};
  for (const os of ordens) {
    if (!ehFalha(os) || !dentro(os.data_abertura, janela)) continue;
    const tipo =
      os.triagem_ia?.tipo_problema || os.diagnostico_causa?.tipo_problema || "nao_classificado";
    contagem[tipo] = (contagem[tipo] ?? 0) + 1;
  }
  return Object.entries(contagem)
    .map(([tipo, valor]) => ({ tipo, label: labels[tipo] ?? "Não classificado", valor }))
    .sort((a, b) => b.valor - a.valor);
}

// Histórico completo (sem recorte de período) de cada equipamento que já teve
// OS — é a base que o módulo de machine learning vai consumir.
export function historicoParaML(ordens, equipamentos) {
  const porId = new Map(equipamentos.map((e) => [e.id_equipamento, e]));
  const grupos = new Map();
  for (const os of ordens) {
    if (os.id_equipamento == null) continue;
    if (!grupos.has(os.id_equipamento)) grupos.set(os.id_equipamento, []);
    grupos.get(os.id_equipamento).push(os);
  }
  const agora = Date.now();
  return [...grupos.entries()]
    .map(([id, lista]) => {
      const equipamento = porId.get(id) ?? {
        id_equipamento: id,
        tag: lista[0].equipamento_tag,
        nome: lista[0].equipamento_nome,
      };
      const falhas = lista
        .filter(ehFalha)
        .map((os) => ms(os.data_abertura))
        .filter((t) => t !== null)
        .sort((a, b) => a - b);
      const intervalos = falhas.slice(1).map((t, i) => (t - falhas[i]) / HORA_MS);
      const reparos = lista.filter(ehFalha).map(horasDeReparo).filter((h) => h !== null);
      const tipos = {};
      for (const os of lista.filter(ehFalha)) {
        const tipo = os.triagem_ia?.tipo_problema || os.diagnostico_causa?.tipo_problema;
        if (tipo) tipos[tipo] = (tipos[tipo] ?? 0) + 1;
      }
      const tipoPredominante = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const comDatas = lista.filter((os) => os.data_inicio && os.data_fim).length;
      const ultimaFalha = falhas.at(-1) ?? null;
      return {
        equipamento,
        totalOrdens: lista.length,
        porTipo: Object.fromEntries(
          TIPOS_MANUTENCAO.map((t) => [
            t.valor,
            lista.filter((os) => os.tipo_manutencao === t.valor).length,
          ]),
        ),
        falhas: falhas.length,
        intervaloMedioHoras: intervalos.length
          ? intervalos.reduce((s, h) => s + h, 0) / intervalos.length
          : null,
        mttrHoras: reparos.length ? reparos.reduce((s, h) => s + h, 0) / reparos.length : null,
        diasDesdeUltimaFalha: ultimaFalha ? Math.floor((agora - ultimaFalha) / DIA_MS) : null,
        tipoPredominante,
        completude: lista.length ? comDatas / lista.length : 0,
        pronto: falhas.length >= MIN_FALHAS_TREINO,
        abertas: lista.filter((os) => ["aberta", "em_andamento"].includes(os.status)).length,
        primeiraOS: Math.min(...lista.map((os) => ms(os.data_abertura) ?? agora)),
      };
    })
    .sort((a, b) => b.totalOrdens - a.totalOrdens);
}

// ─── Formatação ───

export function formatarHoras(horas) {
  if (horas === null || horas === undefined || Number.isNaN(horas)) return "—";
  if (horas < 1 / 60) return "< 1 min";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) {
    return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  }
  return `${(horas / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function formatarPercentual(valor, casas = 1) {
  if (valor === null || valor === undefined) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function formatarMoeda(valor) {
  return (valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Variação relativa entre períodos; null quando não dá para comparar.
export function variacao(atual, anterior) {
  if (atual === null || anterior === null || anterior === undefined || anterior === 0) {
    return null;
  }
  return (atual - anterior) / anterior;
}

// ─── CSV (separador ";" e BOM para abrir certo no Excel em pt-BR) ───

export function baixarCSV(nomeArquivo, cabecalho, linhas) {
  const escapar = (v) => {
    const texto = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(escapar).join(";")).join("\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export function numeroCSV(valor, casas = 2) {
  if (valor === null || valor === undefined) return "";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas, useGrouping: false });
}
