import { getAccessToken, refreshToken, logout } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Wrapper em torno do fetch nativo que:
 * 1. Injeta o token JWT automaticamente em toda requisição
 * 2. Se receber 401, tenta renovar o token e repete a requisição
 * 3. Se a renovação falhar, desloga o usuário
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getAccessToken();

  // Monta os headers com o token JWT
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Token expirado: tenta renovar automaticamente
  if (response.status === 401) {
    try {
      const newToken = await refreshToken();

      // Repete a requisição original com o novo token
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    } catch {
      logout();
      throw new Error("Sessão expirada");
    }
  }

  return response;
}
