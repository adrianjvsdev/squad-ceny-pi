// Erros do DRF: {"detail": "..."} ou {"campo": ["..."], ...}.

// Mensagem única para exibir num aviso geral.
export function parseApiError(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    if (data.detail) return String(data.detail);
    return Object.values(data).flat().join(" ");
  }
  return fallback;
}

// {campo: "mensagem"} para exibir cada erro junto do seu campo.
export function errosPorCampo(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== "object" || data.detail) return {};
  return Object.fromEntries(
    Object.entries(data).map(([campo, msgs]) => [
      campo,
      Array.isArray(msgs) ? msgs.join(" ") : String(msgs),
    ]),
  );
}
