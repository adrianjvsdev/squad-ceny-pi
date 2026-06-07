"use client";

import { useState, useEffect, useCallback } from "react";
import { C } from "@/lib/constants";
import {
  Badge,
  Btn,
  Ico,
  Input,
  IoTBadge,
  Modal,
  Select,
} from "@/app/components/ui";
import { getSetores, createSetor } from "@/lib/setores";
import * as equipamentosAPI from "@/lib/equipamentos";

function EquipmentTooltip({ equip }) {
  const [show, setShow] = useState(false);
  const statusColor = (s) =>
    s === "Operacional" ? "green" : s === "Em Manutenção" ? "amber" : "red";

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          cursor: "pointer",
          color: C.blue,
          fontWeight: 600,
          fontSize: "0.82rem",
        }}
      >
        {equip.name}
      </span>
      {show && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "calc(100% + 8px)",
            zIndex: 100,
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "0.85rem",
            width: 260,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: C.gray900,
                  fontSize: "0.82rem",
                }}
              >
                {equip.name}
              </div>
              <div style={{ fontSize: "0.72rem", color: C.gray400 }}>
                {equip.id} · {equip.setor}
              </div>
            </div>
            <Badge color={statusColor(equip.status)}>{equip.status}</Badge>
          </div>
          {equip.iot && (
            <div
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "0.6rem",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <IoTBadge />
                <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                  Dados em tempo real
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 4,
                }}
              >
                {[
                  ["🌡", "Temp", equip.temp],
                  ["⚡", "RPM", equip.rpm],
                  ["🔵", "Pressão", equip.pressao],
                ].map(([icon, label, val]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#e2e8f0",
                        fontSize: "0.78rem",
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: C.gray500 }}>
            <div>
              Última manutenção: <strong>{equip.lastMaint}</strong>
            </div>
            <div>
              Próxima manutenção: <strong>{equip.nextMaint}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryPage({ userType }) {
  // ─── Equipamentos e tipos ──────────────────────────────────────────────────
  const [equipamentos, setEquipamentos] = useState([]);
  const [tipos, setTipos] = useState({});
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(true);
  const [erroEquipamentos, setErroEquipamentos] = useState(null);

  // ─── Setores ──────────────────────────────────────────────────────────────
  const [setores, setSetores] = useState([]);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEquip, setSelectedEquip] = useState(null);

  // Form setor
  const [nomeSetor, setNomeSetor] = useState("");
  const [salvandoSetor, setSalvandoSetor] = useState(false);
  const [erroSetor, setErroSetor] = useState(null);

  // Form equipamento
  const [formEquip, setFormEquip] = useState({
    nome: "",
    tag: "",
    id_tipo: "",
    id_setor: "",
    tem_iot: false,
  });
  const [salvandoEquip, setSalvandoEquip] = useState(false);
  const [erroEquip, setErroEquip] = useState(null);

  // Form tipo de equipamento
  const [formTipo, setFormTipo] = useState({
    nome: "",
    descricao: "",
  });
  const [salvandoTipo, setSalvandoTipo] = useState(false);
  const [erroTipo, setErroTipo] = useState(null);

  // ─── Carregar setores ──────────────────────────────────────────────────────

  const carregarSetores = useCallback(async () => {
    setLoadingSetores(true);
    try {
      const data = await getSetores();
      setSetores(data);
    } catch {
      // Silencioso — tabela continua funcionando com os mockados
    } finally {
      setLoadingSetores(false);
    }
  }, []);

  useEffect(() => {
    carregarSetores();
  }, [carregarSetores]);

  // ─── Carregar equipamentos ──────────────────────────────────────────────────

  const carregarEquipamentos = useCallback(async () => {
    setLoadingEquipamentos(true);
    setErroEquipamentos(null);
    try {
      // 1. Buscar equipamentos
      const equips = await equipamentosAPI.listEquipamentos();

      // 2. Buscar tipos (para mapear)
      const tiposData = await equipamentosAPI.listTipos();
      const tiposMap = {};
      tiposData.forEach((tipo) => {
        tiposMap[tipo.id_tipo] = tipo;
      });
      setTipos(tiposMap);

      // 3. Enriquecer cada equipamento com dados de manutenção + IoT
      const equipamentosEnriquecidos = [];
      for (const equip of equips) {
        const proximaMaint = await equipamentosAPI.getProximaManutencao(
          equip.id_equipamento,
        );
        const iotStatus = equip.tem_iot
          ? await equipamentosAPI.getIoTStatus(equip.id_equipamento)
          : null;

        const enriquecido = equipamentosAPI.enriquecerEquipamento(
          equip,
          tiposMap[equip.id_tipo],
          proximaMaint,
          iotStatus,
        );
        equipamentosEnriquecidos.push(enriquecido);
      }

      setEquipamentos(equipamentosEnriquecidos);
    } catch (err) {
      console.error("Erro ao carregar equipamentos:", err);
      setErroEquipamentos("Erro ao carregar equipamentos. Tente novamente.");
    } finally {
      setLoadingEquipamentos(false);
    }
  }, []);

  useEffect(() => {
    carregarEquipamentos();
  }, [carregarEquipamentos]);

  // ─── Handlers setor ────────────────────────────────────────────────────────

  function abrirModalSetor() {
    setNomeSetor("");
    setErroSetor(null);
    setShowSectorModal(true);
  }

  function fecharModalSetor() {
    setShowSectorModal(false);
    setNomeSetor("");
    setErroSetor(null);
  }

  async function handleCadastrarSetor() {
    setErroSetor(null);
    if (!nomeSetor.trim()) return setErroSetor("Nome do setor é obrigatório.");

    setSalvandoSetor(true);
    try {
      await createSetor(nomeSetor.trim());
      await carregarSetores();
      fecharModalSetor();
    } catch (e) {
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.values(detail).flat().join(" ");
        setErroSetor(msgs);
      } else {
        setErroSetor("Erro ao cadastrar setor. Tente novamente.");
      }
    } finally {
      setSalvandoSetor(false);
    }
  }

  // ─── Handlers equipamento ──────────────────────────────────────────────────

  function abrirModalEquip() {
    setFormEquip({
      nome: "",
      tag: "",
      id_tipo: "",
      id_setor: "",
      tem_iot: false,
    });
    setErroEquip(null);
    setShowEquipModal(true);
  }

  function fecharModalEquip() {
    setShowEquipModal(false);
    setFormEquip({
      nome: "",
      tag: "",
      id_tipo: "",
      id_setor: "",
      tem_iot: false,
    });
    setErroEquip(null);
  }

  async function handleCadastrarEquip() {
    setErroEquip(null);

    if (!formEquip.nome.trim()) {
      return setErroEquip("Nome do equipamento é obrigatório.");
    }
    if (!formEquip.tag.trim()) {
      return setErroEquip("Código / TAG é obrigatório.");
    }
    if (!formEquip.id_tipo) {
      return setErroEquip("Tipo é obrigatório.");
    }
    if (!formEquip.id_setor) {
      return setErroEquip("Setor é obrigatório.");
    }

    setSalvandoEquip(true);
    try {
      const payload = {
        nome: formEquip.nome.trim(),
        tag: formEquip.tag.trim(),
        id_tipo: formEquip.id_tipo,
        id_setor: formEquip.id_setor,
        tem_iot: formEquip.tem_iot,
        status: "ativo",
      };
      await equipamentosAPI.criarEquipamento(payload);
      fecharModalEquip();
      await carregarEquipamentos();
    } catch (e) {
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.values(detail).flat().join(" ");
        setErroEquip(msgs);
      } else {
        setErroEquip("Erro ao cadastrar equipamento. Tente novamente.");
      }
    } finally {
      setSalvandoEquip(false);
    }
  }

  async function handleDeletarEquip(id) {
    if (!confirm("Tem certeza que deseja deletar este equipamento?")) return;

    try {
      await equipamentosAPI.deletarEquipamento(id);
      await carregarEquipamentos();
    } catch (e) {
      alert("Erro ao deletar equipamento.");
    }
  }

  // ─── Handlers tipo de equipamento ──────────────────────────────────────────

  function abrirModalTipo() {
    setFormTipo({
      nome: "",
      descricao: "",
    });
    setErroTipo(null);
    setShowTypeModal(true);
  }

  function fecharModalTipo() {
    setShowTypeModal(false);
    setFormTipo({
      nome: "",
      descricao: "",
    });
    setErroTipo(null);
  }

  async function handleCadastrarTipo() {
    setErroTipo(null);

    if (!formTipo.nome.trim()) {
      return setErroTipo("Nome do tipo é obrigatório.");
    }

    setSalvandoTipo(true);
    try {
      const payload = {
        nome: formTipo.nome.trim(),
        descricao: formTipo.descricao.trim(),
      };
      await equipamentosAPI.criarTipo(payload);
      fecharModalTipo();
      // Recarrega equipamentos para atualizar dropdown de tipos
      await carregarEquipamentos();
    } catch (e) {
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.values(detail).flat().join(" ");
        setErroTipo(msgs);
      } else {
        setErroTipo("Erro ao cadastrar tipo. Tente novamente.");
      }
    } finally {
      setSalvandoTipo(false);
    }
  }

  // ─── Filtros equipamentos ────────────────────────────────────────────────

  const filtered = equipamentos.filter(
    (e) =>
      (filterStatus === "all" || e.status === filterStatus) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())),
  );

  const statusColor = (s) =>
    s === "Operacional" ? "green" : s === "Em Manutenção" ? "amber" : "red";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: C.gray900,
            }}
          >
            Inventário
          </h2>
          <p
            style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}
          >
            {loadingEquipamentos
              ? "Carregando..."
              : `${filtered.length} equipamentos encontrados`}
          </p>
        </div>
        {userType === "admin" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={abrirModalSetor} icon="sector">
              Cadastrar Setor
            </Btn>
            <Btn variant="ghost" onClick={abrirModalTipo} icon="plus">
              Cadastrar Tipo
            </Btn>
            <Btn onClick={abrirModalEquip} icon="plus">
              Cadastrar Equipamento
            </Btn>
          </div>
        )}
      </div>

      {erroEquipamentos && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: C.redLight,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            color: C.red,
            fontSize: "0.85rem",
          }}
        >
          {erroEquipamentos}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.gray400,
            }}
          >
            <Ico name="search" size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipamento..."
            style={{
              width: "100%",
              padding: "0.55rem 0.85rem 0.55rem 32px",
              border: `1px solid ${C.gray200}`,
              borderRadius: 6,
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
        </div>
        {["all", "Operacional", "Em Manutenção", "Offline"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.78rem",
              fontWeight: 500,
              border: `1px solid ${filterStatus === s ? C.blue : C.gray200}`,
              background: filterStatus === s ? C.blueLight : C.white,
              color: filterStatus === s ? C.blue : C.gray500,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {s === "all" ? "Todos" : s}
          </button>
        ))}
      </div>

      {/* IoT Legend */}
      {!loadingEquipamentos && !erroEquipamentos && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0.6rem 0.85rem",
            background: "#0f172a",
            borderRadius: 6,
            width: "fit-content",
          }}
        >
          <IoTBadge />
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Equipamentos com esta flag possuem monitoramento IoT — passe o mouse
            para ver os dados ao vivo
          </span>
        </div>
      )}

      {/* Loading State */}
      {loadingEquipamentos && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: C.gray400,
            fontSize: "0.85rem",
          }}
        >
          Carregando equipamentos...
        </div>
      )}

      {/* Equipment Table */}
      {!loadingEquipamentos && !erroEquipamentos && (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr style={{ background: C.gray50 }}>
                {[
                  "ID",
                  "Equipamento",
                  "Setor",
                  "Tipo",
                  "Status",
                  "IoT",
                  "Última Manut.",
                  "Ações",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.65rem 1rem",
                      textAlign: "left",
                      color: C.gray500,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${C.gray200}`,
                    }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq, i) => (
                <tr
                  key={eq.id}
                  style={{
                    borderBottom:
                      i < filtered.length - 1
                        ? `1px solid ${C.gray100}`
                        : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: C.gray500,
                      fontFamily: "monospace",
                      fontSize: "0.78rem",
                    }}
                  >
                    {eq.id}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <EquipmentTooltip equip={eq} />
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>
                    {eq.setor}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>
                    {eq.tipo}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={statusColor(eq.status)}>{eq.status}</Badge>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {eq.iot ? (
                      <IoTBadge />
                    ) : (
                      <span style={{ color: C.gray300, fontSize: "0.72rem" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: C.gray400,
                      fontSize: "0.75rem",
                    }}
                  >
                    {eq.lastMaint}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon="eye"
                      onClick={() => setSelectedEquip(eq)}
                    >
                      Ver
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Detail Modal */}
      <Modal
        open={!!selectedEquip}
        onClose={() => setSelectedEquip(null)}
        title={selectedEquip?.name}
        width={600}
      >
        {selectedEquip && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["ID", selectedEquip.id],
                ["Tipo", selectedEquip.tipo],
                ["Setor", selectedEquip.setor],
                ["Status", selectedEquip.status],
                ["Última manutenção", selectedEquip.lastMaint],
                ["Próxima manutenção", selectedEquip.nextMaint],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: C.gray50,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: C.gray400,
                      letterSpacing: "0.05em",
                      marginBottom: 2,
                    }}
                  >
                    {k.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: C.gray800,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            {selectedEquip.iot && (
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: 8,
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <IoTBadge />
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Monitoramento em tempo real
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    ["Temperatura", selectedEquip.temp, "Normal < 80°C"],
                    [
                      "Rotação",
                      selectedEquip.rpm + " RPM",
                      "Nominal: 1450 RPM",
                    ],
                    ["Pressão", selectedEquip.pressao, "Máx: 6.0 bar"],
                  ].map(([label, val, sub]) => (
                    <div
                      key={label}
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          color: "#e2e8f0",
                        }}
                      >
                        {val}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#475569" }}>
                        {sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Setor Modal */}
      <Modal
        open={showSectorModal}
        onClose={fecharModalSetor}
        title="Cadastrar Setor"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Nome do setor"
            placeholder="Ex: Utilidades"
            value={nomeSetor}
            onChange={(e) => setNomeSetor(e.target.value)}
          />
          {erroSetor && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "red" }}>
              {erroSetor}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn
              variant="ghost"
              onClick={fecharModalSetor}
              disabled={salvandoSetor}
            >
              Cancelar
            </Btn>
            <Btn onClick={handleCadastrarSetor} disabled={salvandoSetor}>
              {salvandoSetor ? "Cadastrando..." : "Cadastrar Setor"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Type Modal */}
      <Modal
        open={showTypeModal}
        onClose={fecharModalTipo}
        title="Cadastrar Tipo de Equipamento"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Nome do tipo"
            placeholder="Ex: Bomba, Motor, Compressor..."
            value={formTipo.nome}
            onChange={(e) => setFormTipo({ ...formTipo, nome: e.target.value })}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <label
              style={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}
            >
              Descrição (opcional)
            </label>
            <textarea
              placeholder="Ex: Equipamento de bombeamento centrífuga..."
              value={formTipo.descricao}
              onChange={(e) =>
                setFormTipo({ ...formTipo, descricao: e.target.value })
              }
              style={{
                padding: "0.75rem",
                border: `1px solid #e5e7eb`,
                borderRadius: 6,
                fontSize: "0.85rem",
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: "80px",
              }}
            />
          </div>
          {erroTipo && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "red" }}>
              {erroTipo}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn
              variant="ghost"
              onClick={fecharModalTipo}
              disabled={salvandoTipo}
            >
              Cancelar
            </Btn>
            <Btn onClick={handleCadastrarTipo} disabled={salvandoTipo}>
              {salvandoTipo ? "Cadastrando..." : "Cadastrar Tipo"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Equipment Modal */}
      <Modal
        open={showEquipModal}
        onClose={fecharModalEquip}
        title="Cadastrar Equipamento"
        width={560}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.85rem",
            }}
          >
            <Input
              label="Nome do equipamento"
              placeholder="Ex: Bomba A-2"
              value={formEquip.nome}
              onChange={(e) =>
                setFormEquip({ ...formEquip, nome: e.target.value })
              }
            />
            <Input
              label="Código / TAG"
              placeholder="Ex: EQ-007"
              value={formEquip.tag}
              onChange={(e) =>
                setFormEquip({ ...formEquip, tag: e.target.value })
              }
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.85rem",
            }}
          >
            <Select
              label="Tipo"
              value={formEquip.id_tipo}
              onChange={(e) =>
                setFormEquip({ ...formEquip, id_tipo: e.target.value })
              }
            >
              <option value="">Selecione o tipo...</option>
              {Object.values(tipos).map((tipo) => (
                <option key={tipo.id_tipo} value={tipo.id_tipo}>
                  {tipo.nome}
                </option>
              ))}
            </Select>
            <Select
              label="Setor"
              value={formEquip.id_setor}
              onChange={(e) =>
                setFormEquip({ ...formEquip, id_setor: e.target.value })
              }
            >
              {loadingSetores ? (
                <option>Carregando...</option>
              ) : setores.length === 0 ? (
                <option>Nenhum setor cadastrado</option>
              ) : (
                <>
                  <option value="">Selecione o setor...</option>
                  {setores.map((s) => (
                    <option key={s.id_setor} value={s.id_setor}>
                      {s.nome}
                    </option>
                  ))}
                </>
              )}
            </Select>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0.75rem",
              background: C.gray50,
              borderRadius: 6,
              border: `1px solid ${C.gray200}`,
            }}
          >
            <input
              type="checkbox"
              id="iotCheck"
              checked={formEquip.tem_iot}
              onChange={(e) => {
                setFormEquip({ ...formEquip, tem_iot: e.target.checked });
              }}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label
              htmlFor="iotCheck"
              style={{
                fontSize: "0.85rem",
                color: C.gray700,
                cursor: "pointer",
              }}
            >
              Este equipamento possui monitoramento IoT
            </label>
            <IoTBadge />
          </div>
          {erroEquip && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "red" }}>
              {erroEquip}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn
              variant="ghost"
              onClick={fecharModalEquip}
              disabled={salvandoEquip}
            >
              Cancelar
            </Btn>
            <Btn onClick={handleCadastrarEquip} disabled={salvandoEquip}>
              {salvandoEquip ? "Cadastrando..." : "Cadastrar Equipamento"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
