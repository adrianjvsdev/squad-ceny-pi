"use client";

import { C } from "@/lib/constants";
import { Badge, Ico } from "@/app/components/ui";

export function OverviewPage({ userType }) {
  const stats = [
    { label: "Total de Ordens", value: "342", change: "+15%", color: C.blue, icon: "ticket" },
    { label: "Em Execução", value: "87", change: "+3", color: C.green, icon: "monitor" },
    { label: "Equipamentos Ativos", value: "156", change: "98% disp.", color: C.purple, icon: "db" },
    { label: "Alertas Ativos", value: "4", change: "2 críticos", color: C.red, icon: "alert" },
  ];

  const recentOS = [
    { id: "OS-089", equip: "Bomba A-1", tech: "Carlos Oliveira", status: "Em Progresso", prog: 65, priority: "Alta" },
    { id: "OS-088", equip: "Motor C-5", tech: "Maria Santos", status: "Concluído", prog: 100, priority: "Média" },
    { id: "OS-087", equip: "Compressor B-3", tech: "João Silva", status: "Planejado", prog: 10, priority: "Baixa" },
    { id: "OS-086", equip: "Válvula D-7", tech: "Ana Costa", status: "Em Execução", prog: 45, priority: "Alta" },
  ];

  const statusColor = (s) =>
    s === "Concluído" ? "green" : s === "Em Progresso" || s === "Em Execução" ? "blue" : "amber";
  const priorityColor = (p) => (p === "Alta" ? "red" : p === "Média" ? "amber" : "gray");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {stats.map(({ label, value, change, color, icon }) => (
          <div
            key={label}
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.gray500 }}>
                {label.toUpperCase()}
              </span>
              <span style={{ color, display: "flex" }}>
                <Ico name={icon} size={16} color={color} />
              </span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: C.gray900, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.72rem", color: C.gray400 }}>{change}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8 }}>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${C.gray200}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: C.gray900 }}>
            Ordens Recentes
          </h3>
          <Badge color="blue">Hoje</Badge>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: C.gray50 }}>
                {["ID", "Equipamento", "Técnico", "Status", "Prioridade", "Progresso"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.65rem 1rem",
                      textAlign: "left",
                      color: C.gray500,
                      fontWeight: 600,
                      fontSize: "0.72rem",
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
              {recentOS.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < recentOS.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: C.blue }}>{row.id}</td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray700 }}>{row.equip}</td>
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>{row.tech}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={statusColor(row.status)}>{row.status}</Badge>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: C.gray200, borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${row.prog}%`,
                            height: "100%",
                            background: row.prog === 100 ? C.green : C.blue,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: C.gray400, minWidth: 28 }}>{row.prog}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}