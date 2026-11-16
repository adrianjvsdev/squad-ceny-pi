"use client";

import { useEffect, useMemo, useState } from "react";
import { C } from "@/lib/constants";
import { listEquipamentos } from "@/lib/equipamentos";
import { listOrdensServico } from "@/lib/ordensServico";
import { Badge, Ico } from "@/app/components/ui";

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

function getProgresso(status, dataInicio) {
  const statusNormalizado = String(status ?? "").toUpperCase();

  if (statusNormalizado === "CONCLUIDA") return 100;
  if (statusNormalizado === "CANCELADA") return 0;
  if (statusNormalizado === "EM_ANDAMENTO") return dataInicio ? 65 : 35;
  return 10;
}

function getStatusLabel(status, dataInicio) {
  if (status === "em_andamento" && dataInicio) return "Em Execução";
  return STATUS_LABELS[status] ?? status ?? "Planejado";
}

function parseApiError(error, fallback) {
  const detail = error?.response?.data;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    return Object.values(detail).flat().join(" ");
  }
  return fallback;
}

export function OverviewPage() {
  const [ordens, setOrdens] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarResumo() {
      setLoading(true);
      setErro(null);

      try {
        const [ordensData, equipamentosData] = await Promise.all([
          listOrdensServico(),
          listEquipamentos(),
        ]);

        if (!ativo) return;
        setOrdens(Array.isArray(ordensData) ? ordensData : (ordensData?.results ?? []));
        setEquipamentos(
          Array.isArray(equipamentosData)
            ? equipamentosData
            : (equipamentosData?.results ?? []),
        );
      } catch (e) {
        if (!ativo) return;
        setErro(parseApiError(e, "Não foi possível carregar a visão geral."));
        setOrdens([]);
        setEquipamentos([]);
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregarResumo();

    return () => {
      ativo = false;
    };
  }, []);

  const stats = useMemo(() => {
    const ordensAtivas = ordens.filter(
      (ordem) => !["concluida", "cancelada"].includes(ordem.status),
    );
    const emExecucao = ordens.filter(
      (ordem) => ordem.status === "em_andamento" && ordem.data_inicio,
    ).length;
    const aguardandoInicio = ordens.filter(
      (ordem) => ordem.status === "em_andamento" && !ordem.data_inicio,
    ).length;
    const equipamentosAtivos = equipamentos.filter(
      (equipamento) => equipamento.status === "ativo",
    ).length;
    const alertasAtivos = ordensAtivas.filter((ordem) =>
      ["alta", "critica"].includes(ordem.prioridade),
    ).length;
    const criticos = ordensAtivas.filter(
      (ordem) => ordem.prioridade === "critica",
    ).length;

    return [
      {
        label: "Total de Ordens",
        value: String(ordens.length),
        change: "Ordens no sistema",
        color: C.blue,
        tint: C.blueLight,
        icon: "ticket",
      },
      {
        label: "Em Execução",
        value: String(emExecucao),
        change: aguardandoInicio
          ? `${aguardandoInicio} aguardando início`
          : "Atendimentos iniciados",
        color: C.green,
        tint: "#f0fdf4",
        icon: "activity",
      },
      {
        label: "Equipamentos Ativos",
        value: String(equipamentosAtivos),
        change: `${equipamentos.length} cadastrados`,
        color: C.purple,
        tint: C.purpleLight,
        icon: "cpu",
      },
      {
        label: "Alertas Ativos",
        value: String(alertasAtivos),
        change: `${criticos} críticos`,
        color: C.red,
        tint: C.redLight,
        icon: "alert",
      },
    ];
  }, [ordens, equipamentos]);

  const recentOS = useMemo(
    () =>
      ordens.slice(0, 4).map((ordem) => {
        const progresso = getProgresso(ordem.status, ordem.data_inicio);

        return {
          id: `OS-${String(ordem.id_os).padStart(3, "0")}`,
          equip: ordem.equipamento_nome ?? ordem.equipamento_tag ?? "Sem equipamento",
          tech: ordem.tecnico_nome ?? "Não atribuído",
          status: getStatusLabel(ordem.status, ordem.data_inicio),
          progresso,
          priority:
            PRIORIDADE_LABELS[ordem.prioridade] ?? ordem.prioridade ?? "Baixa",
        };
      }),
    [ordens],
  );

  const statusColor = (s) =>
    s === "Concluído"
      ? "green"
      : s === "Em Progresso" || s === "Em Execução"
        ? "blue"
        : s === "Cancelado"
          ? "red"
          : "amber";
  const priorityColor = (p) =>
    p === "Alta" || p === "Crítica" ? "red" : p === "Média" ? "amber" : "gray";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Cabeçalho */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.4rem",
            letterSpacing: "-0.02em",
            fontWeight: 700,
            color: C.gray900,
          }}
        >
          Visão Geral
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: C.gray500 }}>
          Acompanhe ordens de serviço, equipamentos e alertas da operação.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {stats.map(({ label, value, change, color, tint, icon }) => (
          <div
            key={label}
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 12,
              boxShadow: C.shadowCard,
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: C.gray500 }}>
                {label}
              </span>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: tint,
                  color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ico name={icon} size={17} color={color} />
              </span>
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: C.gray900,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loading ? "—" : value}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.gray500 }}>{change}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, boxShadow: C.shadowCard }}>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${C.gray200}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 650, color: C.gray900 }}>
            Ordens Recentes
          </h3>
          <Badge color={erro ? "red" : "blue"}>
            {loading ? "Carregando" : `${recentOS.length} recentes`}
          </Badge>
        </div>
        {erro && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: `1px solid ${C.gray200}`,
              color: C.redDark,
              background: C.redLight,
              fontSize: "0.78rem",
            }}
          >
            {erro}
          </div>
        )}
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
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", color: C.gray500 }}>
                    Carregando ordens recentes...
                  </td>
                </tr>
              ) : recentOS.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", color: C.gray500 }}>
                    Nenhuma ordem recente encontrada.
                  </td>
                </tr>
              ) : (
                recentOS.map((row, i) => (
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
                              width: `${row.progresso}%`,
                              height: "100%",
                              background: row.progresso === 100 ? C.green : C.blue,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: C.gray400, minWidth: 28 }}>{row.progresso}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
