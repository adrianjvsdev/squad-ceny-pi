"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Vazio } from "./Painel";

const ALTURA = 210;

// Passo "redondo" do eixo (1, 2, 5 × 10ⁿ), com o topo logo acima do máximo.
function escala(maximo, divisoes = 4) {
  if (maximo <= 0) return { max: divisoes, ticks: [0, 1, 2, 3, 4] };
  const bruto = maximo / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const passoInteiro = Math.max(1, Math.ceil(passo));
  const max = Math.ceil(maximo / passoInteiro) * passoInteiro;
  return {
    max,
    ticks: Array.from({ length: max / passoInteiro + 1 }, (_, i) => i * passoInteiro),
  };
}

function Legenda({ series }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {series.map((s) => (
        <span
          key={s.valor}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: C.gray600 }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.cor }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Dica({ children, style }) {
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        zIndex: 5,
        background: C.gray900,
        color: C.white,
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: "0.72rem",
        lineHeight: 1.5,
        boxShadow: "0 8px 20px -6px rgba(15, 23, 42, 0.4)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Colunas empilhadas por série (ex.: OS por mês e tipo de manutenção).
export function ColunasEmpilhadas({ baldes, series, unidade }) {
  const [ativo, setAtivo] = useState(null);
  const totais = baldes.map((b) => series.reduce((s, serie) => s + b[serie.valor], 0));
  const { max, ticks } = escala(Math.max(0, ...totais));

  if (!totais.some(Boolean)) {
    return <Vazio>Nenhuma ordem de serviço aberta no período.</Vazio>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Legenda series={series} />
      <div style={{ display: "flex", gap: 8 }}>
        {/* Eixo Y */}
        <div
          style={{
            position: "relative",
            height: ALTURA,
            width: 24,
            flexShrink: 0,
            fontSize: "0.68rem",
            color: C.gray400,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {ticks.map((t) => (
            <span
              key={t}
              style={{ position: "absolute", right: 0, bottom: `calc(${(t / max) * 100}% - 7px)` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", height: ALTURA }}>
            {ticks.map((t) => (
              <div
                key={t}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(t / max) * 100}%`,
                  borderTop: `1px solid ${t === 0 ? C.gray300 : C.gray100}`,
                }}
              />
            ))}
            <div style={{ position: "absolute", inset: 0, display: "flex" }}>
              {baldes.map((balde, i) => {
                const segmentos = series.filter((s) => balde[s.valor] > 0);
                return (
                  <div
                    key={balde.label + i}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseLeave={() => setAtivo(null)}
                    style={{
                      flex: 1,
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      background: ativo === i ? "rgba(43, 92, 230, 0.05)" : "transparent",
                      borderRadius: 6,
                      cursor: "default",
                    }}
                  >
                    <div
                      style={{
                        width: "60%",
                        maxWidth: 24,
                        height: `${(totais[i] / max) * 100}%`,
                        display: "flex",
                        flexDirection: "column-reverse",
                        gap: 2,
                      }}
                    >
                      {segmentos.map((s, j) => (
                        <div
                          key={s.valor}
                          style={{
                            flex: balde[s.valor],
                            background: s.cor,
                            minHeight: 2,
                            borderRadius: j === segmentos.length - 1 ? "4px 4px 0 0" : 0,
                          }}
                        />
                      ))}
                    </div>
                    {ativo === i && (
                      <Dica
                        style={{
                          bottom: `calc(${(totais[i] / max) * 100}% + 8px)`,
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div style={{ fontWeight: 650, marginBottom: 2 }}>
                          {unidade === "semana" ? `Semana de ${balde.label}` : balde.label}
                        </div>
                        {series.map((s) => (
                          <div key={s.valor} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.cor }} />
                            <span style={{ flex: 1 }}>{s.label}</span>
                            <strong style={{ marginLeft: 12, fontVariantNumeric: "tabular-nums" }}>
                              {balde[s.valor]}
                            </strong>
                          </div>
                        ))}
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 4, paddingTop: 4 }}>
                          Total <strong style={{ float: "right" }}>{totais[i]}</strong>
                        </div>
                      </Dica>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Eixo X */}
          <div style={{ display: "flex", marginTop: 8 }}>
            {baldes.map((balde, i) => (
              <span
                key={balde.label + i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.66rem",
                  color: ativo === i ? C.gray900 : C.gray400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  // Muitos rótulos: mostra um sim, um não.
                  visibility: baldes.length > 8 && i % 2 === 1 ? "hidden" : "visible",
                }}
              >
                {balde.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Barras horizontais de uma série (ranking). `formatar` define o texto do valor.
export function BarrasHorizontais({ itens, cor = C.blue, formatar = (v) => v, vazio, detalhe }) {
  const [ativo, setAtivo] = useState(null);
  if (!itens.length) return <Vazio>{vazio}</Vazio>;
  const max = Math.max(...itens.map((i) => i.valor));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {itens.map((item, i) => (
        <div
          key={item.chave ?? item.label}
          onMouseEnter={() => setAtivo(i)}
          onMouseLeave={() => setAtivo(null)}
          style={{ display: "grid", gridTemplateColumns: "minmax(90px, 38%) 1fr", gap: 12, alignItems: "center" }}
        >
          <span
            title={item.titulo ?? item.label}
            style={{
              fontSize: "0.78rem",
              color: ativo === i ? C.gray900 : C.gray700,
              fontWeight: ativo === i ? 600 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <div
              style={{
                height: 14,
                width: `${Math.max((item.valor / max) * 100, 2)}%`,
                background: cor,
                opacity: ativo === null || ativo === i ? 1 : 0.45,
                borderRadius: "0 4px 4px 0",
                transition: "opacity 0.15s ease",
              }}
            />
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 600,
                color: C.gray700,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatar(item.valor)}
            </span>
            {ativo === i && detalhe && (
              <Dica style={{ bottom: "calc(100% + 6px)", left: 0 }}>{detalhe(item)}</Dica>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Barra de progresso fina (disponibilidade, completude de dados).
export function BarraPercentual({ valor, cor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
      <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(1, valor ?? 0)) * 100}%`,
            height: "100%",
            background: cor,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}
