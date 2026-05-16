// ============================================================
// DESIGN TOKENS
// ============================================================
export const C = {
  blue: "#2B5CE6",
  blueLight: "#EFF4FF",
  blueLight2: "#DBEAFE",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  green: "#22c55e",
  greenLight: "#dcfce7",
  greenDark: "#15803d",
  red: "#ef4444",
  redLight: "#fee2e2",
  redDark: "#b91c1c",
  amber: "#f59e0b",
  amberLight: "#fef3c7",
  amberDark: "#92400e",
  purple: "#7c3aed",
  purpleLight: "#ede9fe",
  purpleDark: "#5b21b6",
  white: "#ffffff",
};

export const font = "'Segoe UI', 'Helvetica Neue', sans-serif";

// ============================================================
// ICON PATHS
// ============================================================
export const Icons = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  box: (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  map: (
    <>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </>
  ),
  ticket: (
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  wifi: (
    <>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </>
  ),
  alert: (
    <>
      <polygon points="10.29 3.86 1.82 18 22.18 18 10.29 3.86" />
      <line x1="10.29" y1="14" x2="10.29" y2="14" />
      <line x1="10.29" y1="10" x2="10.29" y2="14" />
    </>
  ),
  sector: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  chevDown: <polyline points="6 9 12 15 18 9" />,
  chevRight: <polyline points="9 18 15 12 9 6" />,
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  building: (
    <>
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <path d="M17 22V7l-5-5-5 5v15" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
};

// ============================================================
// MOCK DATA
// ============================================================
export const mockNotifications = [
  {
    id: 1,
    type: "alert",
    title: "Equipamento crítico offline",
    desc: "Bomba A-1 (IoT) perdeu conexão há 3 min",
    time: "3 min atrás",
    read: false,
  },
  {
    id: 2,
    type: "info",
    title: "Chamado #OS-089 atribuído",
    desc: "Novo chamado atribuído para você",
    time: "15 min atrás",
    read: false,
  },
  {
    id: 3,
    type: "success",
    title: "OS-047 concluída",
    desc: "Compressor B-3 manutenção finalizada",
    time: "1h atrás",
    read: true,
  },
  {
    id: 4,
    type: "alert",
    title: "Temperatura acima do limite",
    desc: "Sensor T-12 atingiu 89°C (limite: 85°C)",
    time: "2h atrás",
    read: true,
  },
  {
    id: 5,
    type: "info",
    title: "Relatório semanal disponível",
    desc: "Relatório de produtividade gerado",
    time: "1 dia atrás",
    read: true,
  },
];

export const equipmentData = [
  {
    id: "EQ-001",
    name: "Bomba Centrífuga A-1",
    setor: "Utilidades",
    tipo: "Bomba",
    status: "Operacional",
    iot: true,
    temp: "72°C",
    rpm: "1450",
    pressao: "4.2 bar",
    lastMaint: "12/04/2026",
    nextMaint: "12/07/2026",
  },
  {
    id: "EQ-002",
    name: "Motor Elétrico C-5",
    setor: "Produção",
    tipo: "Motor",
    status: "Operacional",
    iot: false,
    lastMaint: "01/03/2026",
    nextMaint: "01/06/2026",
  },
  {
    id: "EQ-003",
    name: "Compressor B-3",
    setor: "Utilidades",
    tipo: "Compressor",
    status: "Em Manutenção",
    iot: true,
    temp: "89°C",
    rpm: "2200",
    pressao: "8.1 bar",
    lastMaint: "05/05/2026",
    nextMaint: "05/08/2026",
  },
  {
    id: "EQ-004",
    name: "Válvula de Controle D-7",
    setor: "Instrumentação",
    tipo: "Válvula",
    status: "Operacional",
    iot: false,
    lastMaint: "20/04/2026",
    nextMaint: "20/07/2026",
  },
  {
    id: "EQ-005",
    name: "Turbina Principal T-01",
    setor: "Geração",
    tipo: "Turbina",
    status: "Operacional",
    iot: true,
    temp: "145°C",
    rpm: "3600",
    pressao: "12.5 bar",
    lastMaint: "28/03/2026",
    nextMaint: "28/06/2026",
  },
  {
    id: "EQ-006",
    name: "Reator Químico RX-2",
    setor: "Processo",
    tipo: "Reator",
    status: "Offline",
    iot: false,
    lastMaint: "10/02/2026",
    nextMaint: "10/05/2026",
  },
];

export const ticketData = [
  {
    id: "OS-089",
    equip: "Bomba A-1",
    setor: "Utilidades",
    tipo: "Manutenção Corretiva",
    urgencia: "Alta",
    status: "Em Progresso",
    desc: "Ruído excessivo no rolamento. Vibração acima do normal.",
    created: "15/05/2026",
    tech: "Carlos Oliveira",
  },
  {
    id: "OS-088",
    equip: "Motor C-5",
    setor: "Produção",
    tipo: "Manutenção Preventiva",
    urgencia: "Média",
    status: "Concluído",
    desc: "Troca de correia e verificação do alinhamento.",
    created: "12/05/2026",
    tech: "Maria Santos",
  },
  {
    id: "OS-087",
    equip: "Compressor B-3",
    setor: "Utilidades",
    tipo: "Inspeção",
    urgencia: "Baixa",
    status: "Planejado",
    desc: "Inspeção semestral de rotina conforme cronograma.",
    created: "10/05/2026",
    tech: "João Silva",
  },
  {
    id: "OS-086",
    equip: "Válvula D-7",
    setor: "Instrumentação",
    tipo: "Manutenção Corretiva",
    urgencia: "Alta",
    status: "Em Execução",
    desc: "Vazamento identificado na gaxeta. Necessita substituição.",
    created: "09/05/2026",
    tech: "Ana Costa",
  },
];

export const adminMenu = [
  { label: "Visão Geral", icon: "grid", page: "overview" },
  { label: "Usuários", icon: "users", page: "users", adminOnly: true },
  { label: "Inventário", icon: "db", page: "inventory" },
  { label: "Meus Chamados", icon: "ticket", page: "tickets" },
  { label: "Mapa de Risco", icon: "map", page: "riskmap" },
  { label: "Relatórios", icon: "chart", page: "reports" },
  { label: "Configurações", icon: "settings", page: "settings" },
];

export const techMenu = [
  { label: "Visão Geral", icon: "grid", page: "overview" },
  { label: "Inventário", icon: "db", page: "inventory" },
  { label: "Meus Chamados", icon: "ticket", page: "tickets" },
  { label: "Mapa de Risco", icon: "map", page: "riskmap" },
];