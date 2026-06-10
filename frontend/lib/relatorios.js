import api from "./api";

export async function getRelatorioConfiabilidade(params = {}) {
  const { data } = await api.get("/api/relatorios/confiabilidade/", { params });
  return data;
}

export function formatHoras(valor) {
  if (valor === null || valor === undefined) return "—";
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

export function formatPercent(valor) {
  if (valor === null || valor === undefined) return "—";
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function confiabilidadeCor(percent) {
  if (percent >= 95) return "green";
  if (percent >= 80) return "amber";
  return "red";
}
