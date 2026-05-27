const ACTIVE_ORDER_STATUSES = new Set(["aberta", "em_andamento"]);
const HIGH_ORDER_PRIORITIES = new Set(["alta", "critica"]);

function key(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function groupBySector(equipamentos) {
  const grupos = new Map();

  equipamentos.forEach((equipamento) => {
    const setorId = key(equipamento.id_setor);
    if (!setorId) return;

    if (!grupos.has(setorId)) grupos.set(setorId, []);
    grupos.get(setorId).push(equipamento);
  });

  return grupos;
}

function buildEquipmentIndex(equipamentos) {
  return new Map(
    equipamentos
      .map((equipamento) => [key(equipamento.id_equipamento), equipamento])
      .filter(([id]) => id),
  );
}

function groupActiveOrdersBySector(ordens, equipamentosPorId) {
  const grupos = new Map();

  ordens.forEach((ordem) => {
    if (!ACTIVE_ORDER_STATUSES.has(ordem.status)) return;

    const equipamento = equipamentosPorId.get(key(ordem.id_equipamento));
    const setorId = key(equipamento?.id_setor);
    if (!setorId) return;

    if (!grupos.has(setorId)) grupos.set(setorId, []);
    grupos.get(setorId).push(ordem);
  });

  return grupos;
}

function getZoneGeometry(index, total) {
  if (total <= 1) {
    return { x: 80, y: 80, w: 520, h: 300 };
  }

  const left = 80;
  const top = 60;
  const width = 530;
  const height = 380;
  const gap = 18;
  const cols = total <= 2 ? total : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);
  const cellWidth = (width - gap * (cols - 1)) / cols;
  const cellHeight = (height - gap * (rows - 1)) / rows;
  const col = index % cols;
  const row = Math.floor(index / cols);

  return {
    x: left + col * (cellWidth + gap),
    y: top + row * (cellHeight + gap),
    w: cellWidth,
    h: cellHeight,
  };
}

function calculateRisk(equipamentos, ordens) {
  const inactiveEquipments = equipamentos.filter(
    (equipamento) => equipamento.status === "inativo",
  ).length;
  const maintenanceEquipments = equipamentos.filter(
    (equipamento) => equipamento.status === "em_manutencao",
  ).length;

  const criticalOrders = ordens.filter(
    (ordem) => ordem.prioridade === "critica",
  ).length;
  const highOrders = ordens.filter((ordem) =>
    HIGH_ORDER_PRIORITIES.has(ordem.prioridade),
  ).length;
  const mediumOrders = ordens.filter(
    (ordem) => ordem.prioridade === "media",
  ).length;
  const lowOrders = ordens.filter((ordem) => ordem.prioridade === "baixa").length;

  const highProblems = highOrders + inactiveEquipments;
  const mediumProblems = mediumOrders + maintenanceEquipments;
  const lowProblems = lowOrders;
  const totalProblems = highProblems + mediumProblems + lowProblems;
  const attentionProblems = highProblems + mediumProblems;

  let risk = "low";
  if (
    criticalOrders > 0 ||
    highProblems >= 2 ||
    attentionProblems >= 3 ||
    totalProblems >= 5
  ) {
    risk = "high";
  } else if (highProblems >= 1 || mediumProblems >= 1 || totalProblems >= 2) {
    risk = "medium";
  }

  return {
    risk,
    totalProblems,
    highProblems,
    mediumProblems,
    lowProblems,
    equipmentIssues: inactiveEquipments + maintenanceEquipments,
  };
}

function formatEquipment(equipamento) {
  const fallbackId = `${equipamento.tag ?? "equip"}-${equipamento.nome ?? ""}`;
  const label = [equipamento.tag, equipamento.nome].filter(Boolean).join(" - ");

  return {
    id: key(equipamento.id_equipamento) ?? fallbackId,
    label: label || "Equipamento sem nome",
    hasIoT: Boolean(equipamento.tem_iot),
    status: equipamento.status,
  };
}

function formatOrder(ordem) {
  return {
    id: key(ordem.id_os) ?? `${ordem.titulo}-${ordem.data_abertura}`,
    title: ordem.titulo || `OS #${ordem.id_os}`,
    priority: ordem.prioridade || "baixa",
    status: ordem.status,
  };
}

export function normalizeApiList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function buildRiskZones(setores, equipamentos, ordens) {
  const equipamentosPorId = buildEquipmentIndex(equipamentos);
  const equipamentosPorSetor = groupBySector(equipamentos);
  const ordensPorSetor = groupActiveOrdersBySector(ordens, equipamentosPorId);

  return setores.map((setor, index) => {
    const setorId = key(setor.id_setor) ?? `setor-${index}`;
    const setorEquipamentos = equipamentosPorSetor.get(setorId) ?? [];
    const setorOrdens = ordensPorSetor.get(setorId) ?? [];
    const riskInfo = calculateRisk(setorEquipamentos, setorOrdens);

    return {
      id: setorId,
      label: setor.nome || "Setor sem nome",
      ...getZoneGeometry(index, setores.length),
      ...riskInfo,
      alerts: riskInfo.totalProblems,
      activeOrders: setorOrdens.length,
      equips: setorEquipamentos.map(formatEquipment),
      orders: setorOrdens.map(formatOrder),
      hasIoT: setorEquipamentos.some((equipamento) => equipamento.tem_iot),
    };
  });
}
