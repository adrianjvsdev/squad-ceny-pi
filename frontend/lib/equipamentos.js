import api from "./api";

export async function listEquipamentos() {
  const { data } = await api.get("/api/equipamentos/");
  return data;
}

export async function getEquipamento(id) {
  const { data } = await api.get(`/api/equipamentos/${id}/`);
  return data;
}

export async function criarEquipamento(equipamento) {
  const { data } = await api.post("/api/equipamentos/", equipamento);
  return data;
}

export async function atualizarEquipamento(id, equipamento) {
  const { data } = await api.patch(`/api/equipamentos/${id}/`, equipamento);
  return data;
}

export async function deletarEquipamento(id) {
  await api.delete(`/api/equipamentos/${id}/`);
  return true;
}

export async function listTipos() {
  const { data } = await api.get("/api/tipos-equipamento/");
  return data;
}

export async function criarTipo(tipo) {
  const { data } = await api.post("/api/tipos-equipamento/", tipo);
  return data;
}

export async function listPlanosMaintencao(filtros = {}) {
  // Pode filtrar por id_equipamento se passado
  const params = new URLSearchParams(filtros);
  const { data } = await api.get(`/api/planos-manutencao/?${params}`);
  return data;
}

export async function getProximaManutencao(idEquipamento) {
  /**
   * Busca o próximo plano de manutenção para um equipamento.
   * Retorna: { proxima_execucao, tipo, periodicidade_dias }
   */
  try {
    const response = await listPlanosMaintencao({
      id_equipamento: idEquipamento,
      ordering: "proxima_execucao",
    });

    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar próxima manutenção:", error);
    return null;
  }
}

//  IOT
export async function getIoTStatus(idEquipamento) {
  try {
    const { data } = await api.get(`/api/iot-status/${idEquipamento}/`);
    return data;
  } catch (error) {
    console.error("Erro ao buscar status IoT:", error);
    return null;
  }
}

export function mapStatusBackendParaUI(statusBackend) {
  /**
   * Mapeia status do backend para UI
   * Backend: "ativo", "em_manutencao", "inativo"
   * UI: "Operacional", "Em Manutenção", "Offline"
   */
  const mapa = {
    ativo: "Operacional",
    em_manutencao: "Em Manutenção",
    inativo: "Offline",
  };
  return mapa[statusBackend] || statusBackend;
}

export function mapStatusUIParaBackend(statusUI) {
  /**
   * Mapeia status da UI para backend
   * UI: "Operacional", "Em Manutenção", "Offline"
   * Backend: "ativo", "em_manutencao", "inativo"
   */
  const mapa = {
    Operacional: "ativo",
    "Em Manutenção": "em_manutencao",
    Offline: "inativo",
  };
  return mapa[statusUI] || statusUI;
}

export function enriquecerEquipamento(
  equipamento,
  tipo,
  proximaMaint,
  iotStatus,
) {
  /**
   * Enriquece dados do equipamento para exibição no UI.
   * Transforma campos do backend para o formato esperado pelo frontend.
   */
  return {
    // IDs
    id: equipamento.tag, // Usa tag como ID visual ("EQ-001")
    id_equipamento: equipamento.id_equipamento, // ID real para requisições

    // Básicos
    name: equipamento.nome,
    tag: equipamento.tag,
    fabricante: equipamento.fabricante,
    modelo: equipamento.modelo,

    // Setor e Tipo
    setor: equipamento.setor_nome,
    id_setor: equipamento.id_setor,
    tipo: tipo?.nome || "—",
    id_tipo: equipamento.id_tipo,

    // Status
    status: mapStatusBackendParaUI(equipamento.status),
    statusBackend: equipamento.status,

    // IoT
    iot: equipamento.tem_iot,

    // Datas
    lastMaint: equipamento.ultima_manutencao
      ? new Date(equipamento.ultima_manutencao).toLocaleDateString("pt-BR")
      : "—",
    nextMaint: equipamento.proxima_manutencao
      ? new Date(equipamento.proxima_manutencao).toLocaleDateString("pt-BR")
      : proximaMaint?.proxima_execucao
      ? new Date(proximaMaint.proxima_execucao).toLocaleDateString("pt-BR")
      : "—",

    // Dados IoT em tempo real (se disponível)
    ...(iotStatus && {
      temp: iotStatus.temperatura ? `${iotStatus.temperatura}°C` : "—",
      rpm: iotStatus.rpm ? `${Math.round(iotStatus.rpm)}` : "—",
      pressao: iotStatus.pressao ? `${iotStatus.pressao} bar` : "—",
      anomalias_recentes: iotStatus.anomalias_recentes || [],
      status_geral_iot: iotStatus.status_geral || "normal",
    }),
  };
}
