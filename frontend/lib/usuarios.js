import api from "./api";

// ─── Usuários ───────────────────────────────────────────────────────────────

export async function getUsuarios() {
  const { data } = await api.get("/api/usuarios/");
  return data;
}

export async function getUsuarioAtual() {
  const { data } = await api.get("/api/usuarios/me/");
  return data;
}

export async function createUsuario({
  nome,
  email,
  password,
  perfil,
  id_empresa,
}) {
  const { data } = await api.post("/api/usuarios/", {
    nome,
    email,
    password,
    perfil,
    ...(id_empresa ? { id_empresa } : {}),
  });
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await api.patch(`/api/usuarios/${id}/`, payload);
  return data;
}

export async function deleteUsuario(id) {
  await api.delete(`/api/usuarios/${id}/`);
}

// ─── Setores ────────────────────────────────────────────────────────────────

export async function getSetores() {
  const { data } = await api.get("/api/setores/");
  return data;
}

// ─── Associação Usuário ↔ Setor ─────────────────────────────────────────────

export async function getUsuarioSetores() {
  const { data } = await api.get("/api/usuario-setor/");
  return data;
}

export async function associarSetor(
  id_usuario,
  id_setor,
  perfil_no_setor = "operador",
) {
  const { data } = await api.post("/api/usuario-setor/", {
    id_usuario: Number(id_usuario),
    id_setor: Number(id_setor),
    perfil_no_setor,
  });
  return data;
}

export async function atualizarSetor(id_vinculo, id_setor, perfil_no_setor) {
  const { data } = await api.patch(`/api/usuario-setor/${id_vinculo}/`, {
    id_setor,
    perfil_no_setor,
  });
  return data;
}

export async function removerSetor(id_vinculo) {
  await api.delete(`/api/usuario-setor/${id_vinculo}/`);
}
