// SCP-46: mock temporário do diagnóstico de causa, para desenvolver a tela
// antes de o backend (SCP-44/45) expor `diagnostico_causa` na OS.
//
// Só é usado quando NEXT_PUBLIC_MOCK_DIAGNOSTICO=true no frontend/.env.local.
// Se a API já devolver `diagnostico_causa`, ele sempre tem prioridade.
// REMOVER este arquivo quando o SCP-45 estiver integrado.

const MOCKS = [
  {
    causa_provavel: "Desbalanceamento do rotor",
    descricao:
      "A vibração ficou acima do limite crítico em 3 leituras consecutivas, padrão típico de desbalanceamento ou folga na fixação.",
    confianca: 0.86,
    tipo_problema: "mecanico",
    recomendacao: "Verificar fixação e balanceamento do rotor antes de religar.",
  },
  {
    causa_provavel: "Superaquecimento por falha de refrigeração",
    descricao:
      "A temperatura subiu de forma contínua sem queda após o pico, sugerindo refrigeração insuficiente.",
    confianca: 0.68,
    tipo_problema: "hidraulico",
    recomendacao: "Inspecionar o circuito de refrigeração e filtros.",
  },
  {
    causa_provavel: "Causa indeterminada",
    descricao: "Os dados disponíveis não permitem apontar uma causa única.",
    confianca: 0.41,
    tipo_problema: "outro",
    recomendacao: "Realizar inspeção presencial para coletar mais evidências.",
  },
];

export function diagnosticoMock(ticket) {
  if (process.env.NEXT_PUBLIC_MOCK_DIAGNOSTICO !== "true") return null;
  // Só em OS que não são abertas por humano (IoT/sistema), como no caso real.
  if (ticket.solicitante_perfil) return null;
  const base = MOCKS[ticket.id_os % MOCKS.length];
  return {
    ...base,
    modelo_usado: "mock",
    gerado_em: ticket.data_abertura ?? new Date().toISOString(),
  };
}
