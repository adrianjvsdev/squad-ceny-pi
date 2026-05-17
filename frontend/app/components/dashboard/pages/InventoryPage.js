"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { equipmentData } from "@/lib/constants";
import { Badge, Btn, Ico, Input, IoTBadge, Modal, Select } from "@/app/components/ui";

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
      <span style={{ cursor: "pointer", color: C.blue, fontWeight: 600, fontSize: "0.82rem" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: C.gray900, fontSize: "0.82rem" }}>{equip.name}</div>
              <div style={{ fontSize: "0.72rem", color: C.gray400 }}>{equip.id} · {equip.setor}</div>
            </div>
            <Badge color={statusColor(equip.status)}>{equip.status}</Badge>
          </div>
          {equip.iot && (
            <div style={{ background: "#0f172a", borderRadius: 6, padding: "0.6rem", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <IoTBadge />
                <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Dados em tempo real</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                {[["🌡", "Temp", equip.temp], ["⚡", "RPM", equip.rpm], ["🔵", "Pressão", equip.pressao]].map(
                  ([icon, label, val]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{label}</div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.78rem" }}>{val}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: C.gray500 }}>
            <div>Última manutenção: <strong>{equip.lastMaint}</strong></div>
            <div>Próxima manutenção: <strong>{equip.nextMaint}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryPage({ userType }) {
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEquip, setSelectedEquip] = useState(null);

  const filtered = equipmentData.filter(
    (e) =>
      (filterStatus === "all" || e.status === filterStatus) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = (s) =>
    s === "Operacional" ? "green" : s === "Em Manutenção" ? "amber" : "red";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>Inventário</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            {filtered.length} equipamentos encontrados
          </p>
        </div>
        {userType === "admin" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setShowSectorModal(true)} icon="sector">Cadastrar Setor</Btn>
            <Btn onClick={() => setShowEquipModal(true)} icon="plus">Cadastrar Equipamento</Btn>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.85rem", background: "#0f172a", borderRadius: 6, width: "fit-content" }}>
        <IoTBadge />
        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Equipamentos com esta flag possuem monitoramento IoT — passe o mouse para ver os dados ao vivo
        </span>
      </div>

      {/* Equipment Table */}
      <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: C.gray50 }}>
              {["ID", "Equipamento", "Setor", "Tipo", "Status", "IoT", "Última Manut.", "Ações"].map((h) => (
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
              <tr key={eq.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                <td style={{ padding: "0.75rem 1rem", color: C.gray500, fontFamily: "monospace", fontSize: "0.78rem" }}>{eq.id}</td>
                <td style={{ padding: "0.75rem 1rem" }}><EquipmentTooltip equip={eq} /></td>
                <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>{eq.setor}</td>
                <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>{eq.tipo}</td>
                <td style={{ padding: "0.75rem 1rem" }}><Badge color={statusColor(eq.status)}>{eq.status}</Badge></td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {eq.iot ? <IoTBadge /> : <span style={{ color: C.gray300, fontSize: "0.72rem" }}>—</span>}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: C.gray400, fontSize: "0.75rem" }}>{eq.lastMaint}</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <Btn size="sm" variant="ghost" icon="eye" onClick={() => setSelectedEquip(eq)}>Ver</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Equipment Detail Modal */}
      <Modal open={!!selectedEquip} onClose={() => setSelectedEquip(null)} title={selectedEquip?.name} width={600}>
        {selectedEquip && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["ID", selectedEquip.id], ["Tipo", selectedEquip.tipo], ["Setor", selectedEquip.setor], ["Status", selectedEquip.status], ["Última manutenção", selectedEquip.lastMaint], ["Próxima manutenção", selectedEquip.nextMaint]].map(([k, v]) => (
                <div key={k} style={{ padding: "0.65rem 0.85rem", background: C.gray50, borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, letterSpacing: "0.05em", marginBottom: 2 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, color: C.gray800 }}>{v}</div>
                </div>
              ))}
            </div>
            {selectedEquip.iot && (
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <IoTBadge />
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Monitoramento em tempo real</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[["🌡️ Temperatura", selectedEquip.temp, "Normal < 80°C"], ["⚡ Rotação", selectedEquip.rpm + " RPM", "Nominal: 1450 RPM"], ["🔵 Pressão", selectedEquip.pressao, "Máx: 6.0 bar"]].map(([label, val, sub]) => (
                    <div key={label} style={{ textAlign: "center", padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e2e8f0" }}>{val}</div>
                      <div style={{ fontSize: "0.65rem", color: "#475569" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Setor Modal */}
      <Modal open={showSectorModal} onClose={() => setShowSectorModal(false)} title="Cadastrar Setor">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input label="Nome do setor" placeholder="Ex: Utilidades" />
          <Input label="Responsável" placeholder="Nome do responsável" />
          <Input label="Localização" placeholder="Ex: Bloco A - Piso 2" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowSectorModal(false)}>Cancelar</Btn>
            <Btn onClick={() => setShowSectorModal(false)}>Cadastrar Setor</Btn>
          </div>
        </div>
      </Modal>

      {/* Equipment Modal */}
      <Modal open={showEquipModal} onClose={() => setShowEquipModal(false)} title="Cadastrar Equipamento" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Input label="Nome do equipamento" placeholder="Ex: Bomba A-2" />
            <Input label="Código / TAG" placeholder="Ex: EQ-007" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Select label="Tipo">
              <option>Bomba</option><option>Motor</option><option>Compressor</option>
              <option>Válvula</option><option>Turbina</option><option>Reator</option><option>Outro</option>
            </Select>
            <Select label="Setor">
              <option>Utilidades</option><option>Produção</option><option>Instrumentação</option>
              <option>Geração</option><option>Processo</option>
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.75rem", background: C.gray50, borderRadius: 6, border: `1px solid ${C.gray200}` }}>
            <input type="checkbox" id="iotCheck" style={{ width: 16, height: 16 }} />
            <label htmlFor="iotCheck" style={{ fontSize: "0.85rem", color: C.gray700, cursor: "pointer" }}>
              Este equipamento possui monitoramento IoT
            </label>
            <IoTBadge />
          </div>
          <Input label="Data da última manutenção" type="date" />
          <Input label="Intervalo de manutenção (dias)" type="number" placeholder="Ex: 90" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowEquipModal(false)}>Cancelar</Btn>
            <Btn onClick={() => setShowEquipModal(false)}>Cadastrar Equipamento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}