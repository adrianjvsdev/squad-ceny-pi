// ─────────────────────────────────────────────
//  Chaves usadas no localStorage
// ─────────────────────────────────────────────
const ACCESS_KEY = "ceny_access";
const REFRESH_KEY = "ceny_refresh";

// ─────────────────────────────────────────────
//  Persistência de tokens
// ─────────────────────────────────────────────
export function saveTokens(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─────────────────────────────────────────────
//  Decodificação do JWT (sem biblioteca externa)
// ─────────────────────────────────────────────
export function decodeToken(token) {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
//  Perfis do sistema
//  Espelhados do modelo Usuario.Perfil no Django:
//    "admin"    → Administrador (acesso total)
//    "tecnico"  → Técnico       (acesso gerencial/operacional)
//    "operador" → Operador      (acesso básico)
// ─────────────────────────────────────────────
export const PERFIS = {
  ADMIN: "admin",
  TECNICO: "tecnico",
  OPERADOR: "operador",
};

export const PERFIL_LABELS = {
  admin: "ADMINISTRADOR",
  tecnico: "TÉCNICO",
  operador: "OPERADOR",
};

// ─────────────────────────────────────────────
//  Retorna o perfil do usuário logado a partir do JWT.
//  O CenyTokenObtainPairSerializer embute os campos
//  perfil, nome, email e id_empresa no payload.
// ─────────────────────────────────────────────
export function getUserProfile() {
  const token = getToken();
  const payload = decodeToken(token);
  if (!payload) return null;

  return {
    id: payload.user_id ?? null,
    perfil: payload.perfil ?? PERFIS.OPERADOR,
    nome: payload.nome ?? "",
    email: payload.email ?? "",
    id_empresa: payload.id_empresa ?? null,
  };
}

// ─────────────────────────────────────────────
//  Verifica se o access token ainda é válido
// ─────────────────────────────────────────────
export function isTokenValid() {
  const token = getToken();
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

// ─────────────────────────────────────────────
//  Login: chama POST /api/token/ e persiste tokens
// ─────────────────────────────────────────────
export async function loginRequest(email, password) {
  const { default: api } = await import("./api");
  const { data } = await api.post("/api/token/", { email, password });
  saveTokens(data.access, data.refresh);
  return data;
}

// ─────────────────────────────────────────────
//  Logout
// ─────────────────────────────────────────────
export function logout() {
  clearTokens();
  window.location.href = "/login";
}
