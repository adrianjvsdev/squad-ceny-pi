"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { C } from "@/lib/constants";
import { listEquipamentos } from "@/lib/equipamentos";
import { getSetores } from "@/lib/setores";
import { getUsuarioSetores } from "@/lib/usuarios";
import {
  aprovarOrdemServico,
  concluirOrdemServico,
  criarOrdemServico,
  desativarOrdensAbertas,
  iniciarOrdemServico,
  listOrdensServico,
  reabrirOrdemServico,
  rejeitarOrdemServico,
} from "@/lib/ordensServico";
import { Badge, Btn, Input, Modal, Select } from "@/app/components/ui";

const PRIORIDADE_LABELS = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const STATUS_LABELS = {
  aberta: "Planejado",
  em_andamento: "Aguardando início",
  concluida: "Concluído",
  cancelada: "Cancelado",
};

const TIPO_LABELS = {
  corretiva: "Manutenção Corretiva",
  preventiva: "Manutenção Preventiva",
  preditiva: "Inspeção",
};

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("pt-BR");
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function parseApiError(error, fallback) {
  const detail = error?.response?.data;
  if (detail && typeof detail === "object") {
    return Object.values(detail).flat().join(" ");
  }
  return fallback;
}

export function TicketsPage({ userType, profile }) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    equip: "",
    setor: "",
    tipo: "",
    urgencia: "media",
    desc: "",
  });

  const [equipamentos, setEquipamentos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);
  const [erroRecursos, setErroRecursos] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [erroTickets, setErroTickets] = useState(null);

  const [salvandoChamado, setSalvandoChamado] = useState(false);
  const [erroForm, setErroForm] = useState(null);
  const [processandoAprovacao, setProcessandoAprovacao] = useState(false);
  const [erroAprovacao, setErroAprovacao] = useState(null);
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState("");
  const [relatorioConclusao, setRelatorioConclusao] = useState("");
  const [proximaManutencao, setProximaManutencao] = useState("");
  const [processandoInicio, setProcessandoInicio] = useState(false);
  const [processandoConclusao, setProcessandoConclusao] = useState(false);
  const [processandoLote, setProcessandoLote] = useState(false);

  const equipamentosPorId = useMemo(
    () =>
      new Map(
        equipamentos.map((equipamento) => [
          String(equipamento.id_equipamento),
          equipamento,
        ]),
      ),
    [equipamentos],
  );

  const ticketsUI = useMemo(
    () =>
      tickets.map((ticket) => {
        const equipamento = equipamentosPorId.get(String(ticket.id_equipamento));
        const atendimentoIniciado = Boolean(ticket.data_inicio);

        return {
          id: `OS-${String(ticket.id_os).padStart(3, "0")}`,
          id_os: ticket.id_os,
          equip: ticket.equipamento_nome ?? "Sem equipamento",
          setor: equipamento?.setor_nome ?? "—",
          tipo: TIPO_LABELS[ticket.tipo_manutencao] ?? ticket.tipo_manutencao,
          urgencia:
            PRIORIDADE_LABELS[ticket.prioridade] ?? ticket.prioridade ?? "Baixa",
          statusRaw: ticket.status,
          status:
            ticket.status === "em_andamento" && atendimentoIniciado
              ? "Em Execução"
              : STATUS_LABELS[ticket.status] ?? ticket.status,
          desc: ticket.descricao ?? "Sem descrição.",
          created: formatDate(ticket.data_abertura),
          started: formatDate(ticket.data_inicio),
          finished: formatDate(ticket.data_fim),
          dataInicio: ticket.data_inicio ?? null,
          proximaManutencao: ticket.proxima_manutencao ?? "",
          proximaManutencaoLabel: formatDate(ticket.proxima_manutencao),
          tech: ticket.tecnico_nome ?? "Não atribuído",
          tecnicoVinculoId: ticket.tecnico ?? "",
          tecnicoUsuarioId: ticket.tecnico_usuario_id ?? null,
          solicitantePerfil: ticket.solicitante_perfil ?? null,
          origem: ticket.origem ?? "sistema",
          requerAprovacao: Boolean(ticket.requer_aprovacao_admin),
          relatorio: ticket.relatorio_intervencao ?? "",
        };
      }),
    [tickets, equipamentosPorId],
  );

  const resumo = useMemo(() => {
    const abertos = tickets.filter((t) => t.status === "aberta").length;
    const emExecucao = tickets.filter((t) => t.status === "em_andamento").length;
    const concluidos = tickets.filter((t) => t.status === "concluida").length;

    return {
      abertos,
      emExecucao,
      concluidos,
      total: tickets.length,
    };
  }, [tickets]);

  const carregarRecursos = useCallback(async () => {
    setLoadingRecursos(true);
    setErroRecursos(null);
    try {
      const requests = [listEquipamentos(), getSetores()];
      if (userType === "admin") {
        requests.push(getUsuarioSetores());
      }

      const [equipamentosData, setoresData, vinculosData = []] =
        await Promise.all(requests);
      setEquipamentos(equipamentosData);
      setSetores(setoresData);
      if (userType === "admin") {
        setTecnicosDisponiveis(
          vinculosData.filter(
            (v) =>
              v.perfil_no_setor === "tecnico" || v.usuario_perfil === "tecnico",
          ),
        );
      } else {
        setTecnicosDisponiveis([]);
      }
    } catch (e) {
      setErroRecursos(
        parseApiError(
          e,
          "Não foi possível carregar os setores e equipamentos cadastrados.",
        ),
      );
      setEquipamentos([]);
      setSetores([]);
      setTecnicosDisponiveis([]);
    } finally {
      setLoadingRecursos(false);
    }
  }, [userType]);

  const carregarChamados = useCallback(async () => {
    setLoadingTickets(true);
    setErroTickets(null);
    try {
      const data = await listOrdensServico();
      setTickets(data);
    } catch (e) {
      setErroTickets(
        parseApiError(e, "Não foi possível carregar os chamados do sistema."),
      );
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    carregarRecursos();
    carregarChamados();
  }, [carregarRecursos, carregarChamados]);

  const urgColor = (u) =>
    u === "Alta" || u === "Crítica" ? "red" : u === "Média" ? "amber" : "gray";
  const statusColor = (s) =>
    s === "Concluído"
      ? "green"
      : s === "Em Progresso" || s === "Em Execução"
        ? "blue"
        : "amber";

  const podeAprovarSelecionada =
    userType === "admin" &&
    selected?.requerAprovacao &&
    selected?.statusRaw === "aberta";
  const podeReabrirSelecionada =
    userType === "admin" &&
    (selected?.statusRaw === "cancelada" || selected?.statusRaw === "concluida");

  const tecnicoEhResponsavel =
    userType === "tecnico" &&
    selected?.tecnicoUsuarioId != null &&
    profile?.id != null &&
    Number(selected?.tecnicoUsuarioId) === Number(profile?.id);
  const podeIniciarSelecionada =
    tecnicoEhResponsavel &&
    selected?.statusRaw === "em_andamento" &&
    !selected?.dataInicio;
  const podeConcluirSelecionada =
    tecnicoEhResponsavel &&
    selected?.statusRaw === "em_andamento" &&
    Boolean(selected?.dataInicio);

  async function handleCriarChamado() {
    setErroForm(null);

    if (!form.equip) return setErroForm("Selecione um equipamento.");
    if (!form.tipo) return setErroForm("Selecione o tipo de chamado.");
    if (!form.desc.trim()) return setErroForm("Descreva o problema.");

    setSalvandoChamado(true);
    try {
      const equipamento = equipamentosPorId.get(form.equip);
      const tipoLabel = TIPO_LABELS[form.tipo] ?? form.tipo;
      const titulo = `${tipoLabel} - ${equipamento?.nome ?? "Equipamento"}`;

      await criarOrdemServico({
        titulo,
        descricao: form.desc.trim(),
        tipo_manutencao: form.tipo,
        prioridade: form.urgencia,
        id_equipamento: Number(form.equip),
      });

      setForm({
        equip: "",
        setor: "",
        tipo: "",
        urgencia: "media",
        desc: "",
      });
      setShowModal(false);
      await carregarChamados();
    } catch (e) {
      setErroForm(parseApiError(e, "Erro ao abrir chamado. Tente novamente."));
    } finally {
      setSalvandoChamado(false);
    }
  }

  async function handleAprovarSelecionada() {
    if (!selected?.id_os) return;
    setErroAprovacao(null);
    setProcessandoAprovacao(true);
    try {
      const payload = {};
      if (tecnicoSelecionado) payload.tecnico_id = Number(tecnicoSelecionado);
      await aprovarOrdemServico(selected.id_os, payload);
      setSelected(null);
      setTecnicoSelecionado("");
      await carregarChamados();
    } catch (e) {
      setErroAprovacao(
        parseApiError(e, "Não foi possível aprovar a ordem de serviço."),
      );
    } finally {
      setProcessandoAprovacao(false);
    }
  }

  async function handleRejeitarSelecionada() {
    if (!selected?.id_os) return;
    setErroAprovacao(null);
    setProcessandoAprovacao(true);
    try {
      await rejeitarOrdemServico(selected.id_os);
      setSelected(null);
      setTecnicoSelecionado("");
      await carregarChamados();
    } catch (e) {
      setErroAprovacao(
        parseApiError(e, "Não foi possível rejeitar a ordem de serviço."),
      );
    } finally {
      setProcessandoAprovacao(false);
    }
  }

  async function handleReabrirSelecionada() {
    if (!selected?.id_os) return;
    setErroAprovacao(null);
    setProcessandoAprovacao(true);
    try {
      await reabrirOrdemServico(selected.id_os);
      setSelected(null);
      await carregarChamados();
    } catch (e) {
      setErroAprovacao(
        parseApiError(e, "Nao foi possivel reabrir a ordem de servico."),
      );
    } finally {
      setProcessandoAprovacao(false);
    }
  }

  async function handleIniciarSelecionada() {
    if (!selected?.id_os) return;
    setErroAprovacao(null);
    setProcessandoInicio(true);
    try {
      await iniciarOrdemServico(selected.id_os);
      setSelected(null);
      await carregarChamados();
    } catch (e) {
      setErroAprovacao(
        parseApiError(e, "Nao foi possivel iniciar a ordem de servico."),
      );
    } finally {
      setProcessandoInicio(false);
    }
  }

  async function handleConcluirSelecionada() {
    if (!selected?.id_os) return;
    setErroAprovacao(null);

    if (!proximaManutencao) {
      setErroAprovacao("Informe a data da proxima manutencao.");
      return;
    }

    setProcessandoConclusao(true);
    try {
      const payload = { proxima_manutencao: proximaManutencao };
      const relatorio = relatorioConclusao.trim();
      if (relatorio) payload.relatorio_intervencao = relatorio;

      await concluirOrdemServico(selected.id_os, payload);
      setSelected(null);
      setRelatorioConclusao("");
      setProximaManutencao("");
      await carregarChamados();
    } catch (e) {
      setErroAprovacao(
        parseApiError(e, "Nao foi possivel concluir a ordem de servico."),
      );
    } finally {
      setProcessandoConclusao(false);
    }
  }

  async function handleDesativarAbertas() {
    if (userType !== "admin") return;
    const ok = confirm("Desativar todas as OS abertas, exceto as de IoT?");
    if (!ok) return;

    setProcessandoLote(true);
    setErroTickets(null);
    try {
      await desativarOrdensAbertas();
      await carregarChamados();
    } catch (e) {
      setErroTickets(
        parseApiError(e, "Nao foi possivel desativar as ordens abertas."),
      );
    } finally {
      setProcessandoLote(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>
            Chamados
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            {loadingTickets ? "Carregando..." : `${ticketsUI.length} chamados no sistema`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {userType === "admin" && (
            <Btn
              variant="ghost"
              onClick={handleDesativarAbertas}
              disabled={processandoLote}
            >
              {processandoLote ? "Desativando..." : "Desativar OS Abertas"}
            </Btn>
          )}
          <Btn onClick={() => setShowModal(true)} icon="plus">
            Criar Chamado
          </Btn>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {[
          ["Abertos", resumo.abertos, "blue"],
          ["Em Execução", resumo.emExecucao, "amber"],
          ["Concluídos", resumo.concluidos, "green"],
          ["Total", resumo.total, "gray"],
        ].map(([label, count, color]) => (
          <div
            key={label}
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "0.85rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color:
                  color === "blue"
                    ? C.blue
                    : color === "amber"
                      ? C.amber
                      : color === "green"
                        ? C.green
                        : C.gray600,
              }}
            >
              {count}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray400 }}>
              {label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {erroRecursos && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: C.redLight,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            color: C.redDark,
            fontSize: "0.8rem",
          }}
        >
          {erroRecursos}
        </div>
      )}

      {erroTickets && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: C.redLight,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            color: C.redDark,
            fontSize: "0.8rem",
          }}
        >
          {erroTickets}
        </div>
      )}

      {/* Tickets List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loadingTickets ? (
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "1rem 1.25rem",
              color: C.gray500,
            }}
          >
            Carregando chamados...
          </div>
        ) : ticketsUI.length === 0 ? (
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "1rem 1.25rem",
              color: C.gray500,
            }}
          >
            Nenhum chamado aberto ainda.
          </div>
        ) : (
          ticketsUI.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelected(ticket);
                setTecnicoSelecionado(
                  ticket.tecnicoVinculoId ? String(ticket.tecnicoVinculoId) : "",
                );
                setRelatorioConclusao(ticket.relatorio ?? "");
                setProximaManutencao(ticket.proximaManutencao ?? "");
                setErroAprovacao(null);
              }}
              style={{
                background: C.white,
                border: `1px solid ${C.gray200}`,
                borderRadius: 8,
                padding: "1rem 1.25rem",
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.blue;
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(43,92,230,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.gray200;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: C.blue, fontSize: "0.82rem" }}>
                      {ticket.id}
                    </span>
                    <Badge color={urgColor(ticket.urgencia)}>Urgência: {ticket.urgencia}</Badge>
                    <Badge color={statusColor(ticket.status)}>{ticket.status}</Badge>
                  </div>
                  <div style={{ fontWeight: 600, color: C.gray800, fontSize: "0.88rem", marginBottom: 2 }}>
                    {ticket.equip} — {ticket.tipo}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: C.gray500 }}>{ticket.desc}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.72rem", color: C.gray400 }}>{ticket.created}</div>
                  <div style={{ fontSize: "0.75rem", color: C.gray500, marginTop: 2 }}>{ticket.tech}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setErroAprovacao(null);
          setTecnicoSelecionado("");
          setRelatorioConclusao("");
          setProximaManutencao("");
        }}
        title={`Chamado ${selected?.id}`}
        width={580}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={urgColor(selected.urgencia)}>Urgência: {selected.urgencia}</Badge>
              <Badge color={statusColor(selected.status)}>{selected.status}</Badge>
              <Badge color="gray">{selected.tipo}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["Equipamento", selected.equip],
                ["Setor", selected.setor],
                ["Técnico", selected.tech],
                ["Origem", selected.origem],
                ["Data de abertura", selected.created],
                ["Início do atendimento", selected.started],
                ["Conclusão", selected.finished],
                ["Próxima manutenção", selected.proximaManutencaoLabel],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "0.65rem 0.85rem", background: C.gray50, borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, marginBottom: 2 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: "0.85rem", color: C.gray800 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0.85rem", background: C.gray50, borderRadius: 6 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, marginBottom: 6 }}>DESCRIÇÃO</div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: C.gray700, lineHeight: 1.6 }}>{selected.desc}</p>
            </div>
            {erroAprovacao && (
              <p style={{ margin: 0, fontSize: "0.78rem", color: C.redDark }}>
                {erroAprovacao}
              </p>
            )}

            {userType === "admin" &&
              (podeAprovarSelecionada ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Select
                    label="Técnico (opcional)"
                    value={tecnicoSelecionado}
                    onChange={(e) => setTecnicoSelecionado(e.target.value)}
                  >
                    <option value="">Aprovar sem técnico</option>
                    {tecnicosDisponiveis.map((tec) => (
                      <option key={tec.id} value={String(tec.id)}>
                        {tec.usuario_nome} • {tec.setor_nome}
                      </option>
                    ))}
                  </Select>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Btn
                      variant="ghost"
                      disabled={processandoAprovacao}
                      onClick={handleRejeitarSelecionada}
                    >
                      Rejeitar
                    </Btn>
                    <Btn
                      disabled={processandoAprovacao}
                      onClick={handleAprovarSelecionada}
                    >
                      {processandoAprovacao ? "Processando..." : "Aprovar"}
                    </Btn>
                  </div>
                </div>
              ) : (
                podeReabrirSelecionada ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Btn
                      disabled={processandoAprovacao}
                      onClick={handleReabrirSelecionada}
                    >
                      {processandoAprovacao ? "Processando..." : "Reabrir OS"}
                    </Btn>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.78rem", color: C.gray500 }}>
                    Esta OS não requer aprovação do admin.
                  </p>
                )
              ))}

            {podeIniciarSelecionada && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn
                  disabled={processandoInicio}
                  onClick={handleIniciarSelecionada}
                >
                  {processandoInicio ? "Iniciando..." : "Iniciar atendimento"}
                </Btn>
              </div>
            )}

            {podeConcluirSelecionada && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray700, letterSpacing: "0.05em" }}>
                    RELATORIO DE CONCLUSAO (OPCIONAL)
                  </label>
                  <textarea
                    value={relatorioConclusao}
                    onChange={(e) => setRelatorioConclusao(e.target.value)}
                    rows={3}
                    placeholder="Descreva o que foi feito para resolver a OS..."
                    style={{ padding: "0.6rem 0.85rem", border: `1px solid ${C.gray300}`, borderRadius: 4, fontSize: "0.9rem", resize: "vertical", outline: "none" }}
                  />
                </div>
                <Input
                  label="Próxima manutenção"
                  type="date"
                  value={proximaManutencao}
                  min={todayInputValue()}
                  onChange={(e) => setProximaManutencao(e.target.value)}
                  error={!proximaManutencao ? "Obrigatorio para concluir a OS." : null}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Btn
                    disabled={processandoConclusao || !proximaManutencao}
                    onClick={handleConcluirSelecionada}
                  >
                    {processandoConclusao ? "Concluindo..." : "Concluir OS"}
                  </Btn>
                </div>
              </div>
            )}

            {userType === "tecnico" &&
              selected.statusRaw === "em_andamento" &&
              !podeIniciarSelecionada &&
              !podeConcluirSelecionada && (
                <p style={{ margin: 0, fontSize: "0.78rem", color: C.gray500 }}>
                  Somente o tecnico atribuido pode concluir esta OS.
                </p>
              )}
          </div>
        )}
      </Modal>

      {/* Create Ticket Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Criar Novo Chamado" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Select
              label="Equipamento"
              value={form.equip}
              onChange={(e) => {
                const idEquipamento = e.target.value;
                const equipamento = equipamentosPorId.get(idEquipamento);
                setForm((f) => ({
                  ...f,
                  equip: idEquipamento,
                  setor: equipamento ? String(equipamento.id_setor) : f.setor,
                }));
              }}
            >
              <option value="">Selecionar...</option>
              {loadingRecursos ? (
                <option disabled>Carregando equipamentos...</option>
              ) : equipamentos.length === 0 ? (
                <option disabled>Nenhum equipamento cadastrado</option>
              ) : (
                equipamentos.map((equipamento) => (
                  <option key={equipamento.id_equipamento} value={String(equipamento.id_equipamento)}>
                    {equipamento.tag} - {equipamento.nome}
                  </option>
                ))
              )}
            </Select>
            <Select label="Setor" value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}>
              <option value="">Selecionar...</option>
              {loadingRecursos ? (
                <option disabled>Carregando setores...</option>
              ) : setores.length === 0 ? (
                <option disabled>Nenhum setor cadastrado</option>
              ) : (
                setores.map((setor) => (
                  <option key={setor.id_setor} value={String(setor.id_setor)}>
                    {setor.nome}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Select label="Tipo de chamado" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="">Selecionar...</option>
              <option value="corretiva">Manutenção Corretiva</option>
              <option value="preventiva">Manutenção Preventiva</option>
              <option value="preditiva">Inspeção</option>
            </Select>
            <Select label="Urgência" value={form.urgencia} onChange={(e) => setForm((f) => ({ ...f, urgencia: e.target.value }))}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </Select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray700, letterSpacing: "0.05em" }}>DESCRIÇÃO DO PROBLEMA</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              rows={4}
              placeholder="Descreva o problema ou necessidade em detalhes..."
              style={{ padding: "0.6rem 0.85rem", border: `1px solid ${C.gray300}`, borderRadius: 4, fontSize: "0.9rem", resize: "vertical", outline: "none" }}
            />
          </div>

          {erroForm && <p style={{ margin: 0, fontSize: "0.78rem", color: C.redDark }}>{erroForm}</p>}

          <div style={{ padding: "0.65rem 0.85rem", background: C.amberLight, border: `1px solid #fcd34d`, borderRadius: 6 }}>
            <div style={{ fontSize: "0.75rem", color: C.amberDark }}>
              <strong>Anexos:</strong> Você pode adicionar fotos ou documentos após criar o chamado.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)} disabled={salvandoChamado}>
              Cancelar
            </Btn>
            <Btn onClick={handleCriarChamado} disabled={salvandoChamado}>
              {salvandoChamado ? "Abrindo..." : "Abrir Chamado"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}



