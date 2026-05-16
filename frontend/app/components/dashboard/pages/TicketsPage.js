"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { equipmentData, ticketData } from "@/lib/constants";
import { Badge, Btn, Modal, Input, Select } from "@/app/components/ui";

export function TicketsPage({ userType }) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ equip: "", setor: "", tipo: "", urgencia: "Média", desc: "" });

  const urgColor = (u) => (u === "Alta" ? "red" : u === "Média" ? "amber" : "gray");
  const statusColor = (s) =>
    s === "Concluído" ? "green" : s === "Em Progresso" || s === "Em Execução" ? "blue" : "amber";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>Chamados</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            {ticketData.length} chamados no sistema
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)} icon="plus">Criar Chamado</Btn>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[["Abertos", 2, "blue"], ["Em Execução", 1, "amber"], ["Concluídos", 1, "green"], ["Total", 4, "gray"]].map(
          ([label, count, color]) => (
            <div key={label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "0.85rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color === "blue" ? C.blue : color === "amber" ? C.amber : color === "green" ? C.green : C.gray600 }}>
                {count}
              </div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray400 }}>{label.toUpperCase()}</div>
            </div>
          )
        )}
      </div>

      {/* Tickets List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ticketData.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => setSelected(ticket)}
            style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "1rem 1.25rem", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(43,92,230,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: C.blue, fontSize: "0.82rem" }}>{ticket.id}</span>
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
        ))}
      </div>

      {/* Ticket Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Chamado ${selected?.id}`} width={580}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={urgColor(selected.urgencia)}>Urgência: {selected.urgencia}</Badge>
              <Badge color={statusColor(selected.status)}>{selected.status}</Badge>
              <Badge color="gray">{selected.tipo}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Equipamento", selected.equip], ["Setor", selected.setor], ["Técnico", selected.tech], ["Data de abertura", selected.created]].map(([k, v]) => (
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
            {userType === "admin" && (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost">Reatribuir</Btn>
                <Btn variant="secondary">Editar Status</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Ticket Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Criar Novo Chamado" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Select label="Equipamento" value={form.equip} onChange={(e) => setForm((f) => ({ ...f, equip: e.target.value }))}>
              <option value="">Selecionar...</option>
              {equipmentData.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <Select label="Setor" value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}>
              <option value="">Selecionar...</option>
              <option>Utilidades</option><option>Produção</option><option>Instrumentação</option><option>Geração</option>
            </Select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Select label="Tipo de chamado" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="">Selecionar...</option>
              <option>Manutenção Corretiva</option><option>Manutenção Preventiva</option><option>Inspeção</option><option>Instalação</option>
            </Select>
            <Select label="Urgência" value={form.urgencia} onChange={(e) => setForm((f) => ({ ...f, urgencia: e.target.value }))}>
              <option>Baixa</option><option>Média</option><option>Alta</option>
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
          <div style={{ padding: "0.65rem 0.85rem", background: C.amberLight, border: `1px solid #fcd34d`, borderRadius: 6 }}>
            <div style={{ fontSize: "0.75rem", color: C.amberDark }}>
              📎 <strong>Anexos:</strong> Você pode adicionar fotos ou documentos após criar o chamado.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={() => setShowModal(false)}>Abrir Chamado</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}