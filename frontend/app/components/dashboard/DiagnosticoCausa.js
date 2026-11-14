"use client";

import { C, TIPO_PROBLEMA_LABELS } from "@/lib/constants";
import { Badge, Ico } from "@/app/components/ui";

// SCP-46: bloco "Diagnóstico de causa" exibido no detalhe da OS.
// Espera o objeto `diagnostico_causa` devolvido pelo backend (SCP-44/45):
// { causa_provavel, descricao, confianca (0..1), tipo_problema,
//   recomendacao, modelo_usado, gerado_em }

const CONFIANCA_BAIXA = 0.6; // mesmo limiar de alerta da triagem por IA

function corConfianca(confianca) {
  if (confianca >= 0.8) return "green";
  return confianca >= CONFIANCA_BAIXA ? "amber" : "red";
}

function porcentagem(valor) {
  return `${Math.round(valor * 100)}%`;
}

function formatarDataHora(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const tituloSecao = {
  fontSize: "0.68rem",
  fontWeight: 600,
  color: C.gray400,
  marginBottom: 2,
};

export function BadgeDiagnostico() {
  return <Badge color="amber">Diagnóstico</Badge>;
}

export function ResumoDiagnosticoCausa({ diagnostico }) {
  if (!diagnostico) return null;

  const {
    causa_provavel: causa,
    descricao,
    confianca,
    tipo_problema: tipoProblema,
    recomendacao,
    modelo_usado: modelo,
    gerado_em: geradoEm,
  } = diagnostico;

  const temConfianca = typeof confianca === "number";
  const confiancaBaixa = temConfianca && confianca < CONFIANCA_BAIXA;
  const geradoEmTexto = formatarDataHora(geradoEm);

  return (
    <div
      style={{
        padding: "0.85rem",
        background: C.amberLight,
        border: "1px solid #fcd34d",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.68rem",
          fontWeight: 600,
          color: C.amberDark,
        }}
      >
        <Ico name="search" size={13} />
        DIAGNÓSTICO DE CAUSA
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tipoProblema && (
          <Badge color="gray">
            Problema {TIPO_PROBLEMA_LABELS[tipoProblema] ?? tipoProblema}
          </Badge>
        )}
        {temConfianca && (
          <Badge color={corConfianca(confianca)}>
            Confiança {porcentagem(confianca)}
          </Badge>
        )}
      </div>

      {confiancaBaixa && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.75rem",
            color: C.redDark,
          }}
        >
          <Ico name="alert" size={13} />
          Confiança baixa: confirme a causa em campo antes de agir.
        </div>
      )}

      <div>
        <div style={tituloSecao}>CAUSA PROVÁVEL</div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: C.gray800 }}>
          {causa || "Não identificada"}
        </div>
      </div>

      {descricao && (
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: C.gray700,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {descricao}
        </p>
      )}

      {recomendacao && (
        <div>
          <div style={tituloSecao}>RECOMENDAÇÃO</div>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: C.gray700,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {recomendacao}
          </p>
        </div>
      )}

      {(modelo || geradoEmTexto) && (
        <div style={{ fontSize: "0.68rem", color: C.gray400 }}>
          {modelo && <>Modelo: {modelo}</>}
          {modelo && geradoEmTexto && " • "}
          {geradoEmTexto && <>Gerado em {geradoEmTexto}</>}
        </div>
      )}
    </div>
  );
}
