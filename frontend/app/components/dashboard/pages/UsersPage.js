"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Badge, Btn, Ico, Input, Modal, Select } from "@/app/components/ui";

const users = [
  { id: 1, name: "João Gerente", email: "joao@ceny.com", role: "admin", setor: "Geral", status: "Ativo", lastLogin: "Hoje, 09:12" },
  { id: 2, name: "Carlos Oliveira", email: "carlos@ceny.com", role: "tecnico", setor: "Mecânica", status: "Ativo", lastLogin: "Hoje, 08:45" },
  { id: 3, name: "Maria Santos", email: "maria@ceny.com", role: "tecnico", setor: "Elétrica", status: "Ativo", lastLogin: "Ontem" },
  { id: 4, name: "Ana Costa", email: "ana@ceny.com", role: "tecnico", setor: "Instrumentação", status: "Inativo", lastLogin: "3 dias atrás" },
  { id: 5, name: "Pedro Lima", email: "pedro@ceny.com", role: "tecnico", setor: "Mecânica", status: "Ativo", lastLogin: "Hoje, 11:30" },
];

export function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState({ name: "", email: "", role: "tecnico", setor: "" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>
            Usuários do Sistema
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            {users.length} usuários cadastrados
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)} icon="plus">Cadastrar Técnico</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.gray200}` }}>
        {["list", "permissions"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.6rem 1.1rem",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: tab === t ? C.blue : C.gray500,
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: `2px solid ${tab === t ? C.blue : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            {t === "list" ? "Lista de Usuários" : "Permissões"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: C.gray50 }}>
                {["Nome", "E-mail", "Função", "Setor", "Status", "Último acesso", "Ações"].map((h) => (
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
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: C.blueLight,
                          color: C.blue,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span style={{ fontWeight: 500, color: C.gray800 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={u.role === "admin" ? "purple" : "blue"}>
                      {u.role === "admin" ? "Admin" : "Técnico"}
                    </Badge>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>{u.setor}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={u.status === "Ativo" ? "green" : "gray"}>{u.status}</Badge>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray400, fontSize: "0.75rem" }}>{u.lastLogin}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Btn size="sm" variant="ghost" icon="settings">Editar</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "permissions" && (
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "1.25rem" }}>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: C.gray500 }}>
            Controle de acesso por função (RBAC)
          </p>
          {[
            {
              role: "Administrador",
              perms: ["Gerenciar usuários", "Cadastrar setores", "Cadastrar equipamentos", "Ver todos os chamados", "Mapa de risco", "Relatórios completos"],
            },
            {
              role: "Técnico/Colaborador",
              perms: ["Ver inventário", "Criar chamados", "Ver meus chamados", "Mapa de risco (leitura)"],
            },
          ].map(({ role, perms }) => (
            <div
              key={role}
              style={{ marginBottom: "1.25rem", padding: "1rem", background: C.gray50, borderRadius: 6, border: `1px solid ${C.gray200}` }}
            >
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 600, color: C.gray800 }}>{role}</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {perms.map((p) => (
                  <span
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: C.greenLight,
                      color: C.greenDark,
                      border: `1px solid #86efac`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Ico name="check" size={11} color={C.greenDark} /> {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cadastrar Técnico / Colaborador">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Nome completo"
            placeholder="Ex: Carlos Silva"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Select label="Função" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="tecnico">Técnico</option>
            <option value="colaborador">Colaborador</option>
            <option value="admin">Administrador</option>
          </Select>
          <Select label="Setor" value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}>
            <option value="">Selecione o setor...</option>
            <option value="mecanica">Mecânica</option>
            <option value="eletrica">Elétrica</option>
            <option value="instrumentacao">Instrumentação</option>
            <option value="utilidades">Utilidades</option>
          </Select>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={() => setShowModal(false)}>Cadastrar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}