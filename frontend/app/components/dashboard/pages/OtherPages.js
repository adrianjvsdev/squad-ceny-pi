"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Badge, Btn, Ico, Input, IoTBadge } from "@/app/components/ui";

// ============================================================
// RISK MAP PAGE
// ============================================================
export function RiskMapPage() {
  const [selectedZone, setSelectedZone] = useState(null);

  const zones = [
    {
      id: "Z1",
      x: 80,
      y: 60,
      w: 160,
      h: 100,
      label: "Utilidades",
      risk: "low",
      equips: ["Bomba A-1 (IoT)", "Bomba A-2"],
      alerts: 0,
    },
    {
      id: "Z2",
      x: 280,
      y: 60,
      w: 140,
      h: 100,
      label: "Elétrica",
      risk: "medium",
      equips: ["Motor C-5", "Painel Elétrico"],
      alerts: 1,
    },
    {
      id: "Z3",
      x: 460,
      y: 60,
      w: 150,
      h: 100,
      label: "Geração",
      risk: "high",
      equips: ["Turbina T-01 (IoT)"],
      alerts: 2,
    },
    {
      id: "Z4",
      x: 80,
      y: 200,
      w: 200,
      h: 120,
      label: "Processo",
      risk: "medium",
      equips: ["Reator RX-2", "Válvula D-7"],
      alerts: 1,
    },
    {
      id: "Z5",
      x: 320,
      y: 200,
      w: 160,
      h: 120,
      label: "Compressores",
      risk: "high",
      equips: ["Compressor B-3 (IoT)"],
      alerts: 3,
    },
    {
      id: "Z6",
      x: 80,
      y: 360,
      w: 400,
      h: 80,
      label: "Instrumentação",
      risk: "low",
      equips: ["Sensor T-12 (IoT)", "Sensor P-08"],
      alerts: 0,
    },
  ];

  const riskColors = {
    low: {
      fill: "#dcfce7",
      stroke: "#86efac",
      label: "#15803d",
      badge: "Baixo",
    },
    medium: {
      fill: "#fef3c7",
      stroke: "#fcd34d",
      label: "#92400e",
      badge: "Médio",
    },
    high: {
      fill: "#fee2e2",
      stroke: "#fca5a5",
      label: "#b91c1c",
      badge: "Alto",
    },
  };

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
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: C.gray900,
            }}
          >
            Mapa de Risco
          </h2>
          <p
            style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}
          >
            Visualização interativa das zonas de risco da planta
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["low", "Baixo"],
            ["medium", "Médio"],
            ["high", "Alto"],
          ].map(([r, label]) => (
            <div
              key={r}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: riskColors[r].fill,
                  border: `1.5px solid ${riskColors[r].stroke}`,
                }}
              />
              <span style={{ fontSize: "0.72rem", color: C.gray500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Map */}
        <div
          style={{
            flex: 1,
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "1rem",
            minWidth: 400,
          }}
        >
          <svg
            viewBox="0 0 680 480"
            style={{ width: "100%", cursor: "default" }}
          >
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke={C.gray200}
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="680" height="480" fill={C.gray50} />
            <rect width="680" height="480" fill="url(#grid)" />
            <rect
              x="60"
              y="40"
              width="570"
              height="420"
              fill="none"
              stroke={C.gray300}
              strokeWidth="2"
              strokeDasharray="8,4"
              rx="4"
            />
            <text x="80" y="32" fontSize="11" fill={C.gray400} fontWeight="600">
              PLANTA INDUSTRIAL — CENY
            </text>

            {zones.map((zone) => {
              const r = riskColors[zone.risk];
              const isSelected = selectedZone?.id === zone.id;
              return (
                <g
                  key={zone.id}
                  onClick={() => setSelectedZone(isSelected ? null : zone)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={r.fill}
                    stroke={isSelected ? "#2B5CE6" : r.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    rx="6"
                    opacity="0.85"
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + 22}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={r.label}
                  >
                    {zone.label}
                  </text>
                  {zone.alerts > 0 && (
                    <g>
                      <circle
                        cx={zone.x + zone.w - 14}
                        cy={zone.y + 14}
                        r="10"
                        fill={C.red}
                      />
                      <text
                        x={zone.x + zone.w - 14}
                        y={zone.y + 18}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill={C.white}
                      >
                        {zone.alerts}
                      </text>
                    </g>
                  )}
                  {zone.equips.some((e) => e.includes("IoT")) && (
                    <circle
                      cx={zone.x + 14}
                      cy={zone.y + 14}
                      r="5"
                      fill="#0ea5e9"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="r"
                        values="5;8;5"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.3;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
            <text x="65" y="478" fontSize="9" fill={C.gray400}>
              ● Pulsação = IoT ativo | Número vermelho = alertas
            </text>
          </svg>
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
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.gray200}`,
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: C.gray900,
                  }}
                >
                  {selectedZone.label}
                </h4>
                <Badge
                  color={
                    selectedZone.risk === "high"
                      ? "red"
                      : selectedZone.risk === "medium"
                        ? "amber"
                        : "green"
                  }
                >
                  Risco {riskColors[selectedZone.risk].badge}
                </Badge>
              </div>
              {selectedZone.alerts > 0 && (
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: C.redLight,
                    border: `1px solid #fca5a5`,
                    borderRadius: 6,
                    marginBottom: 8,
                    fontSize: "0.75rem",
                    color: C.redDark,
                  }}
                >
                  ⚠ {selectedZone.alerts} alerta(s) ativo(s)
                </div>
              )}
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: C.gray400,
                  marginBottom: 6,
                }}
              >
                EQUIPAMENTOS
              </div>
              {selectedZone.equips.map((e) => (
                <div
                  key={e}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.4rem 0",
                    borderBottom: `1px solid ${C.gray100}`,
                  }}
                >
                  <Ico name="box" size={12} color={C.gray400} />
                  <span style={{ fontSize: "0.78rem", color: C.gray600 }}>
                    {e.replace(" (IoT)", "")}
                  </span>
                  {e.includes("IoT") && <IoTBadge />}
                </div>
              ))}
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
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.78rem",
                  color: C.gray400,
                }}
              >
                Clique em uma zona para ver detalhes
              </p>
            </div>
          )}

          <div
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 8,
              padding: "0.85rem",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: C.gray400,
                marginBottom: 8,
              }}
            >
              ALERTAS ATIVOS
            </div>
            {zones
              .filter((z) => z.alerts > 0)
              .map((z) => (
                <div
                  key={z.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.35rem 0",
                    borderBottom: `1px solid ${C.gray100}`,
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: C.gray700 }}>
                    {z.label}
                  </span>
                  <Badge color="red">{z.alerts}</Badge>
                </div>
              ))}
          </div>
        </div>
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
