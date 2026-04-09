const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Faz login enviando username e password para o backend.
 * Em caso de sucesso, salva os tokens no localStorage.
 */
export async function login(username, password) {
  const response = await fetch(`${API_URL}/api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Credenciais inválidas");
  }

  const data = await response.json();

  // Salva os tokens no localStorage do navegador
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);

  return data;
}

/**
 * Usa o refresh token para obter um novo access token.
 * Chamado automaticamente quando o access token expirar.
 */
export async function refreshToken() {
  const refresh = localStorage.getItem("refresh_token");

  if (!refresh) throw new Error("Sem refresh token");

  const response = await fetch(`${API_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    logout(); // Se o refresh também expirou, desloga o usuário
    throw new Error("Sessão expirada, faça login novamente");
  }

  const data = await response.json();
  localStorage.setItem("access_token", data.access);

  return data.access;
}

/**
 * Remove os tokens e redireciona para o login.
 */
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

/**
 * Retorna o access token atual ou null se não estiver logado.
 */
export function getAccessToken() {
  return localStorage.getItem("access_token");
}
