import api from "./api";

const BASE = "/api/notificacoes";

export async function getNotifications() {
  const { data } = await api.get(`${BASE}/`);
  // DRF com paginação retorna { results: [...] }; sem paginação retorna array direto
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function getNotification(id) {
  const { data } = await api.get(`${BASE}/${id}/`);
  return data;
}

export async function markAsRead(id) {
  const { data } = await api.patch(`${BASE}/${id}/marcar-lida/`);
  return data;
}

export async function markAllAsRead() {
  const { data } = await api.patch(`${BASE}/marcar-todas-lidas/`);
  return data;
}

export async function deleteNotification(id) {
  await api.delete(`${BASE}/${id}/`);
}
