"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { C } from "@/lib/constants";
import { listEquipamentos } from "@/lib/equipamentos";
import { listOrdensServico } from "@/lib/ordensServico";
import { buildRiskZones, normalizeApiList } from "@/lib/riskMap";
import { getSetores } from "@/lib/setores";
import { Badge, Btn, Ico, Input, IoTBadge } from "@/app/components/ui";

function parseApiError(error, fallback) {
  const detail = error?.response?.data;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    return Object.values(detail).flat().join(" ");
  }
  return fallback;
}

function truncateLabel(label, maxLength) {
  if (!label || label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(0, maxLength - 3))}...`;
}

// ============================================================
// RISK MAP PAGE
// ============================================================
export function RiskMapPage() {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [setores, setSetores] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const riskColors = {
    low: { fill: "#dcfce7", stroke: "#86efac", label: "#15803d", badge: "Baixo" },
    medium: { fill: "#fef3c7", stroke: "#fcd34d", label: "#92400e", badge: "Médio" },
    high: { fill: "#fee2e2", stroke: "#fca5a5", label: "#b91c1c", badge: "Alto" },
  };

  const carregarMapa = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const [setoresData, equipamentosData, ordensData] = await Promise.all([
        getSetores(),
        listEquipamentos(),
        listOrdensServico(),
      ]);

      setSetores(normalizeApiList(setoresData));
      setEquipamentos(normalizeApiList(equipamentosData));
      setOrdens(normalizeApiList(ordensData));
    } catch (e) {
      setErro(parseApiError(e, "Nao foi possivel carregar o mapa de risco."));
      setSetores([]);
      setEquipamentos([]);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMapa();
  }, [carregarMapa]);

  const zones = useMemo(
    () => buildRiskZones(setores, equipamentos, ordens),
    [setores, equipamentos, ordens],
  );

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  );

  useEffect(() => {
    if (selectedZoneId && !selectedZone) setSelectedZoneId(null);
  }, [selectedZone, selectedZoneId]);

  const activeAlertZones = zones.filter((zone) => zone.alerts > 0);

  function renderMapContent() {
    if (loading) {
      return (
        <div style={{ height: 480, display: "grid", placeItems: "center", color: C.gray400, fontSize: "0.82rem" }}>
          Carregando mapa de risco...
        </div>
      );
    }

    if (erro) {
      return (
        <div style={{ height: 480, display: "grid", placeItems: "center", textAlign: "center", padding: "1rem" }}>
          <div>
            <Ico name="alert" size={24} color={C.red} />
            <p style={{ margin: "0.6rem 0", fontSize: "0.78rem", color: C.redDark }}>{erro}</p>
            <Btn size="sm" onClick={carregarMapa}>Tentar novamente</Btn>
          </div>
        </div>
      );
    }

    if (zones.length === 0) {
      return (
        <div style={{ height: 480, display: "grid", placeItems: "center", color: C.gray400, fontSize: "0.82rem" }}>
          Nenhum setor cadastrado.
        </div>
      );
    }

    return (
      <svg viewBox="0 0 680 480" style={{ width: "100%", cursor: "default" }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={C.gray200} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="680" height="480" fill={C.gray50} />
        <rect width="680" height="480" fill="url(#grid)" />
        <rect x="60" y="40" width="570" height="420" fill="none" stroke={C.gray300} strokeWidth="2" strokeDasharray="8,4" rx="4" />
        <text x="80" y="32" fontSize="11" fill={C.gray400} fontWeight="600">PLANTA INDUSTRIAL - CENY</text>

        {zones.map((zone) => {
          const r = riskColors[zone.risk];
          const isSelected = selectedZoneId === zone.id;
          const labelMaxLength = Math.max(8, Math.floor(zone.w / 7));
          const riskMaxLength = Math.max(8, Math.floor(zone.w / 8));

          return (
            <g key={zone.id} onClick={() => setSelectedZoneId(isSelected ? null : zone.id)} style={{ cursor: "pointer" }}>
              <title>{`${zone.label}: ${r.badge}`}</title>
              <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} fill={r.fill} stroke={isSelected ? "#2B5CE6" : r.stroke} strokeWidth={isSelected ? 2.5 : 1.5} rx="6" opacity="0.85" />
              <text x={zone.x + zone.w / 2} y={zone.y + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill={r.label}>{truncateLabel(zone.label, labelMaxLength)}</text>
              <text x={zone.x + zone.w / 2} y={zone.y + 40} textAnchor="middle" fontSize="9" fontWeight="600" fill={r.label}>{truncateLabel(r.badge, riskMaxLength)}</text>
              {zone.alerts > 0 && (
                <g>
                  <circle cx={zone.x + zone.w - 14} cy={zone.y + 14} r="10" fill={C.red} />
                  <text x={zone.x + zone.w - 14} y={zone.y + 18} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.white}>{zone.alerts}</text>
                </g>
              )}
              {zone.hasIoT && (
                <circle cx={zone.x + 14} cy={zone.y + 14} r="5" fill="#0ea5e9" opacity="0.8">
                  <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
        <text x="65" y="478" fontSize="9" fill={C.gray400}>Pulso azul = IoT ativo | Numero vermelho = problemas ativos</text>
      </svg>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>Mapa de Risco</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            Visualizacao interativa dos setores cadastrados
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["low", "medium", "high"].map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: riskColors[r].fill, border: `1.5px solid ${riskColors[r].stroke}` }} />
              <span style={{ fontSize: "0.72rem", color: C.gray500 }}>{riskColors[r].badge}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Map */}
        <div style={{ flex: 1, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "1rem", minWidth: 400 }}>
          {renderMapContent()}
        </div>

        {/* Zone Detail */}
        <div
          style={{
            width: 240,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {selectedZone ? (
            <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: C.gray900 }}>{selectedZone.label}</h4>
                <Badge color={selectedZone.risk === "high" ? "red" : selectedZone.risk === "medium" ? "amber" : "green"}>
                  {riskColors[selectedZone.risk].badge}
                </Badge>
              </div>
              {selectedZone.alerts > 0 && (
                <div style={{ padding: "0.5rem 0.75rem", background: C.redLight, border: `1px solid #fca5a5`, borderRadius: 6, marginBottom: 8, fontSize: "0.75rem", color: C.redDark }}>
                  {selectedZone.alerts} problema(s) ativo(s)
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 6, padding: "0.45rem" }}>
                  <div style={{ fontSize: "0.68rem", color: C.gray400, fontWeight: 600 }}>OS ATIVAS</div>
                  <div style={{ fontSize: "0.9rem", color: C.gray800, fontWeight: 700 }}>{selectedZone.activeOrders}</div>
                </div>
                <div style={{ background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 6, padding: "0.45rem" }}>
                  <div style={{ fontSize: "0.68rem", color: C.gray400, fontWeight: 600 }}>EQUIP.</div>
                  <div style={{ fontSize: "0.9rem", color: C.gray800, fontWeight: 700 }}>{selectedZone.equipmentIssues}</div>
                </div>
              </div>
              {selectedZone.orders.length > 0 && (
                <>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray400, marginBottom: 6 }}>ORDENS ATIVAS</div>
                  {selectedZone.orders.slice(0, 4).map((ordem) => (
                    <div key={ordem.id} style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "0.4rem 0", borderBottom: `1px solid ${C.gray100}` }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: "0.76rem", color: C.gray600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ordem.title}</span>
                      <Badge color={ordem.priority === "baixa" ? "gray" : ordem.priority === "media" ? "amber" : "red"}>{ordem.priority}</Badge>
                    </div>
                  ))}
                </>
              )}
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray400, marginBottom: 6 }}>EQUIPAMENTOS</div>
              {selectedZone.equips.length > 0 ? (
                selectedZone.equips.map((equipamento) => (
                  <div key={equipamento.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.4rem 0", borderBottom: `1px solid ${C.gray100}` }}>
                    <Ico name="box" size={12} color={C.gray400} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: "0.78rem", color: C.gray600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{equipamento.label}</span>
                    {equipamento.hasIoT && <IoTBadge />}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.76rem", color: C.gray400 }}>Nenhum equipamento cadastrado.</div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: C.gray50,
                border: `1px dashed ${C.gray200}`,
                borderRadius: 8,
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <Ico name="map" size={24} color={C.gray300} />
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: C.gray400 }}>Clique em um setor para ver detalhes</p>
            </div>
          )}

          <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "0.85rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray400, marginBottom: 8 }}>ALERTAS ATIVOS</div>
            {activeAlertZones.length > 0 ? (
              activeAlertZones.map((z) => (
                <div key={z.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: `1px solid ${C.gray100}` }}>
                  <span style={{ fontSize: "0.78rem", color: C.gray700 }}>{z.label}</span>
                  <Badge color={z.risk === "high" ? "red" : "amber"}>{z.alerts}</Badge>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.76rem", color: C.gray400 }}>Nenhum alerta ativo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REPORTS PAGE
// ============================================================
export function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>
        Relatórios
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          {
            title: "Produtividade Semanal",
            desc: "Chamados abertos vs concluídos por período",
            icon: "chart",
            color: C.blue,
          },
          {
            title: "Equipamentos por Status",
            desc: "Distribuição dos equipamentos na planta",
            icon: "db",
            color: C.purple,
          },
          {
            title: "Técnicos e Alocação",
            desc: "Horas trabalhadas por colaborador",
            icon: "users",
            color: C.green,
          },
          {
            title: "Manutenções Pendentes",
            desc: "Equipamentos com manutenção vencida",
            icon: "alert",
            color: C.amber,
          },
        ].map(({ title, desc, icon, color }) => (
          <div
            key={title}
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "1rem",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${color}15`,
                display: "grid",
                placeItems: "center",
                marginBottom: 12,
              }}
            >
              <Ico name={icon} size={18} color={color} />
            </div>

            <h3
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                color: C.gray900,
              }}
            >
              {title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: C.gray500,
                lineHeight: 1.5,
              }}
            >
              {desc}
            </p>

            <div style={{ marginTop: "1rem" }}>
              <Btn size="sm">Gerar relatório</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h2
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          color: C.gray900,
        }}
      >
        Configurações
      </h2>
      {[
        {
          title: "Perfil",
          fields: [
            { label: "Nome", placeholder: "João Gerente" },
            { label: "E-mail", placeholder: "joao@ceny.com" },
          ],
        },
        { title: "Notificações", fields: [] },
      ].map(({ title, fields }) => (
        <div
          key={title}
          style={{
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              color: C.gray800,
            }}
          >
            {title}
          </h3>
          {fields.map((f) => (
            <div key={f.label} style={{ marginBottom: "0.75rem" }}>
              <Input label={f.label} placeholder={f.placeholder} />
            </div>
          ))}
          {title === "Notificações" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Alertas de equipamentos IoT",
                "Novos chamados atribuídos",
                "Chamados concluídos",
                "Relatórios semanais",
              ].map((item) => (
                <label
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: C.gray700,
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: 15, height: 15 }}
                  />
                  {item}
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <Btn size="sm">Salvar alterações</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
