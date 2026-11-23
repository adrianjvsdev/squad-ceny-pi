"use client";

import { C } from "@/lib/constants";
import { Ico } from "@/app/components/ui";

export function Painel({ titulo, subtitulo, acoes, children, padding = "1.25rem" }) {
  return (
    <section
      style={{
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 12,
        boxShadow: C.shadowCard,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {(titulo || acoes) && (
        <header
          style={{
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${C.gray100}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 650, color: C.gray900 }}>
              {titulo}
            </h3>
            {subtitulo && (
              <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: C.gray500 }}>
                {subtitulo}
              </p>
            )}
          </div>
          {acoes && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{acoes}</div>}
        </header>
      )}
      <div style={{ padding, flex: 1, minWidth: 0 }}>{children}</div>
    </section>
  );
}

// Cartão de indicador: sigla grande, valor, explicação e variação vs. período
// anterior. `melhorQuandoSobe` decide se a variação é boa (verde) ou ruim.
export function CartaoIndicador({
  sigla,
  titulo,
  valor,
  detalhe,
  icone,
  cor,
  fundo,
  variacao,
  melhorQuandoSobe = true,
  carregando,
}) {
  const temVariacao = variacao !== null && variacao !== undefined && Number.isFinite(variacao);
  // Abaixo de 0,5% a variação aparece como 0% — estável, sem cor de alerta.
  const estavel = temVariacao && Math.abs(variacao) < 0.005;
  const bom = temVariacao && !estavel && variacao > 0 === melhorQuandoSobe;
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 12,
        boxShadow: C.shadowCard,
        padding: "1.15rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          {sigla && (
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", color: C.gray900 }}>
              {sigla}
            </div>
          )}
          <div style={{ fontSize: "0.76rem", color: C.gray500, marginTop: sigla ? 2 : 0 }}>
            {titulo}
          </div>
        </div>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: fundo,
            color: cor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ico name={icone} size={16} color={cor} />
        </span>
      </div>
      <div
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: C.gray900,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {carregando ? "—" : valor}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {temVariacao && !carregando && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 650,
              padding: "1px 7px",
              borderRadius: 999,
              background: estavel ? C.gray100 : bom ? "#f0fdf4" : C.redLight,
              color: estavel ? C.gray600 : bom ? C.greenDark : C.redDark,
              fontVariantNumeric: "tabular-nums",
            }}
            title="Variação em relação ao período anterior de mesma duração"
          >
            {estavel ? "=" : variacao > 0 ? "▲" : "▼"}{" "}
            {Math.abs(variacao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
          </span>
        )}
        <span style={{ fontSize: "0.72rem", color: C.gray500, lineHeight: 1.4 }}>{detalhe}</span>
      </div>
    </div>
  );
}

export function Vazio({ children }) {
  return (
    <div
      style={{
        padding: "2rem 1rem",
        textAlign: "center",
        fontSize: "0.8rem",
        color: C.gray500,
      }}
    >
      {children}
    </div>
  );
}
