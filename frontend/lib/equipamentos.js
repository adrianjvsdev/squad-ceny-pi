import api from "./api";
import { formatarData } from "./datas";

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

// Próxima execução (AAAA-MM-DD) mais cedo entre os planos ativos de cada
// equipamento: { [id_equipamento]: "2026-11-20" }. Recebe os planos já
// carregados numa única chamada, em vez de uma requisição por equipamento.
export function proximaExecucaoPorEquipamento(planos) {
  const porEquipamento = {};
  for (const plano of planos) {
    if (!plano.ativo) continue;
    const atual = porEquipamento[plano.id_equipamento];
    if (!atual || plano.proxima_execucao < atual) {
      porEquipamento[plano.id_equipamento] = plano.proxima_execucao;
    }
  }
  return porEquipamento;
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
   * UI: "Operacional", "Em Manutenção", "Inativo"
   */
  const mapa = {
    ativo: "Operacional",
    em_manutencao: "Em Manutenção",
    inativo: "Inativo",
  };
  return mapa[statusBackend] || statusBackend;
}

export function mapStatusUIParaBackend(statusUI) {
  /**
   * Mapeia status da UI para backend
   * UI: "Operacional", "Em Manutenção", "Inativo"
   * Backend: "ativo", "em_manutencao", "inativo"
   */
  const mapa = {
    Operacional: "ativo",
    "Em Manutenção": "em_manutencao",
    Inativo: "inativo",
  };
  return mapa[statusUI] || statusUI;
}

export function enriquecerEquipamento(
  equipamento,
  tipo,
  proximaDoPlano,
  iotStatus,
) {
  /**
   * Enriquece dados do equipamento para exibição no UI.
   * Transforma campos do backend para o formato esperado pelo frontend.
   * proximaDoPlano: próxima execução (AAAA-MM-DD) dos planos ativos, ou null.
   */
  // A próxima manutenção é a mais cedo entre a registrada no equipamento
  // (ao concluir uma OS) e a dos planos ativos.
  const proximaISO =
    [equipamento.proxima_manutencao, proximaDoPlano].filter(Boolean).sort()[0] ?? null;

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
    lastMaint: formatarData(equipamento.ultima_manutencao),
    nextMaint: formatarData(proximaISO),
    nextMaintISO: proximaISO,

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
