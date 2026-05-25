import api from "./api";

export async function listOrdensServico() {
  const { data } = await api.get("/api/ordens-servico/");
  return data;
}

export async function criarOrdemServico(payload) {
  const { data } = await api.post("/api/ordens-servico/", payload);
  return data;
}

export async function aprovarOrdemServico(idOs, payload = {}) {
  const { data } = await api.patch(`/api/ordens-servico/${idOs}/aprovar/`, payload);
  return data;
}

export async function rejeitarOrdemServico(idOs) {
  const { data } = await api.patch(`/api/ordens-servico/${idOs}/rejeitar/`);
  return data;
}

export async function reabrirOrdemServico(idOs) {
  const { data } = await api.patch(`/api/ordens-servico/${idOs}/reabrir/`);
  return data;
}

export async function iniciarOrdemServico(idOs) {
  const { data } = await api.patch(`/api/ordens-servico/${idOs}/iniciar/`);
  return data;
}

export async function concluirOrdemServico(idOs, payload = {}) {
  const { data } = await api.patch(`/api/ordens-servico/${idOs}/concluir/`, payload);
  return data;
}

export async function desativarOrdensAbertas() {
  const { data } = await api.patch("/api/ordens-servico/desativar-abertas/");
  return data;
}
