import api from "./api";

const URL = "/api/planos-manutencao/";

// Remove filtros vazios antes de montar a query string.
function query(params = {}) {
  const limpos = Object.entries(params).filter(
    ([, valor]) => valor !== undefined && valor !== null && valor !== "",
  );
  const qs = new URLSearchParams(limpos).toString();
  return qs ? `?${qs}` : "";
}

// Filtros: id_equipamento, id_setor, tipo, ativo ("true"/"false"), tecnico ("me").
export async function listPlanos(filtros = {}) {
  const { data } = await api.get(`${URL}${query(filtros)}`);
  return data;
}

export async function criarPlano(plano) {
  const { data } = await api.post(URL, plano);
  return data;
}

export async function atualizarPlano(id, plano) {
  const { data } = await api.patch(`${URL}${id}/`, plano);
  return data;
}

export async function excluirPlano(id) {
  await api.delete(`${URL}${id}/`);
  return true;
}

export async function pausarPlano(id) {
  const { data } = await api.patch(`${URL}${id}/pausar/`);
  return data;
}

export async function retomarPlano(id) {
  const { data } = await api.patch(`${URL}${id}/retomar/`);
  return data;
}

// Devolve { detail, id_os, plano }.
export async function executarPlanoAgora(id) {
  const { data } = await api.patch(`${URL}${id}/executar-agora/`);
  return data;
}

export async function pularProximaExecucao(id) {
  const { data } = await api.patch(`${URL}${id}/pular-proxima/`);
  return data;
}

export async function listExecucoes(id) {
  const { data } = await api.get(`${URL}${id}/execucoes/`);
  return data;
}

// params: inicio, fim (AAAA-MM-DD) + os mesmos filtros de listPlanos.
export async function getAgenda(params = {}) {
  const { data } = await api.get(`${URL}agenda/${query(params)}`);
  return data;
}

// params: dias (padrão 90) + os mesmos filtros de listPlanos.
export async function getIndicadores(params = {}) {
  const { data } = await api.get(`${URL}indicadores/${query(params)}`);
  return data;
}
