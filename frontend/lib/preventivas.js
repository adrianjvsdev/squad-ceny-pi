// Funções puras de apresentação da aba Preventivas.
import { diasEntre, formatarData, hojeISO, parseData, paraISO, somarDias } from "./datas";

// Situação do plano (PlanoManutencaoSerializer.get_situacao).
export const SITUACAO_PLANO = {
  atrasado: { label: "Atrasado", cor: "red" },
  os_em_aberto: { label: "OS em aberto", cor: "blue" },
  vence_em_breve: { label: "Vence em breve", cor: "amber" },
  em_dia: { label: "Em dia", cor: "green" },
  pausado: { label: "Pausado", cor: "gray" },
  equipamento_inativo: { label: "Equipamento inativo", cor: "gray" },
};

// Status de uma ocorrência na agenda (manutencao/indicadores.py::StatusAgenda).
export const STATUS_AGENDA = {
  atrasada: { label: "Atrasada", cor: "red" },
  gerada: { label: "OS gerada", cor: "blue" },
  prevista: { label: "Prevista", cor: "purple" },
  concluida: { label: "Concluída", cor: "green" },
  pulada: { label: "Pulada", cor: "gray" },
  cancelada: { label: "Cancelada", cor: "gray" },
};

export const COR_PRIORIDADE = {
  baixa: "gray",
  media: "amber",
  alta: "red",
  critica: "red",
};

// Atalhos do campo "Repetir a cada".
export const PERIODICIDADES = [
  { dias: 7, label: "Semanal" },
  { dias: 15, label: "Quinzenal" },
  { dias: 30, label: "Mensal" },
  { dias: 90, label: "Trimestral" },
  { dias: 180, label: "Semestral" },
  { dias: 365, label: "Anual" },
];

export function descreverPeriodicidade(dias) {
  const atalho = PERIODICIDADES.find((p) => p.dias === dias);
  if (atalho) return atalho.label;
  return dias === 1 ? "Diária" : `A cada ${dias} dias`;
}

const percentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatarPercentual(valor) {
  return valor === null || valor === undefined ? "—" : percentual.format(valor);
}

export function formatarHoras(horas) {
  if (horas === null || horas === undefined) return "—";
  const texto = Number(horas).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${texto} h`;
}

// Segunda-feira da semana da data (AAAA-MM-DD).
export function inicioDaSemana(valor) {
  const data = parseData(valor);
  const deslocamento = (data.getDay() + 6) % 7; // segunda = 0
  return paraISO(new Date(data.getFullYear(), data.getMonth(), data.getDate() - deslocamento));
}

function tituloSemana(inicio, hoje) {
  const semanas = Math.round(diasEntre(inicioDaSemana(hoje), inicio) / 7);
  if (semanas === 0) return "Esta semana";
  if (semanas === 1) return "Próxima semana";
  if (semanas === -1) return "Semana passada";
  const fim = somarDias(inicio, 6);
  return `${formatarData(inicio).slice(0, 5)} a ${formatarData(fim).slice(0, 5)}`;
}

// Agrupa os itens da agenda: as atrasadas primeiro (precisam de ação) e o
// resto por semana, na ordem das datas.
export function agruparAgenda(itens, hoje = hojeISO()) {
  const atrasadas = itens.filter((item) => item.status === "atrasada");
  const grupos = atrasadas.length
    ? [{ chave: "atrasadas", titulo: "Atrasadas", destaque: true, itens: atrasadas }]
    : [];

  const porSemana = new Map();
  for (const item of itens) {
    if (item.status === "atrasada") continue;
    const inicio = inicioDaSemana(item.data_prevista);
    if (!porSemana.has(inicio)) porSemana.set(inicio, []);
    porSemana.get(inicio).push(item);
  }
  for (const [inicio, doGrupo] of [...porSemana.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    grupos.push({ chave: inicio, titulo: tituloSemana(inicio, hoje), destaque: false, itens: doGrupo });
  }
  return grupos;
}
