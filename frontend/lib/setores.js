import api from "./api";

export async function getSetores() {
  const { data } = await api.get("/api/setores/");
  return data;
}

export async function createSetor(nome) {
  const { data } = await api.post("/api/setores/", { nome });
  return data;
}
