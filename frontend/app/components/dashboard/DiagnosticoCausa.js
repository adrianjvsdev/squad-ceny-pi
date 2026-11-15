"use client";

import { useState } from "react";
import { C, font, TIPO_PROBLEMA_LABELS } from "@/lib/constants";
import { formatarData } from "@/lib/datas";
import { Badge, Btn, Ico, Select } from "@/app/components/ui";

// SCP-46: bloco "Diagnóstico de causa" exibido no detalhe da OS.
// Consome o objeto `diagnostico_causa` da API (SCP-44/45). Os campos de
// resumo vêm da hipótese principal:
// { causa_provavel, descricao, confianca (0..1), tipo_problema,
//   recomendacao, modelo_usado, gerado_em }
// e o restante detalha o pré-diagnóstico: hipoteses, verificacoes,
// pecas_provaveis, cuidados_seguranca, contexto_usado, status (ativo |
// descartado), motivo_descarte, causa_confirmada e causa_real.

const CONFIANCA_BAIXA = 0.6; // mesmo limiar de alerta da triagem por IA
const MOTIVO_MIN = 5; // mesmos limites do backend
const MOTIVO_MAX = 500;

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

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

const tituloSecao = {
  fontSize: "0.68rem",
  fontWeight: 600,
  color: C.gray400,
  marginBottom: 2,
};

const textoSecao = {
  margin: 0,
  fontSize: "0.8rem",
  color: C.gray700,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};

const listaSecao = {
  margin: "2px 0 0",
  paddingLeft: "1.1rem",
  fontSize: "0.8rem",
  color: C.gray700,
  lineHeight: 1.5,
};

const textareaStyle = {
  padding: "0.6rem 0.85rem",
  border: `1px solid ${C.gray300}`,
  borderRadius: 4,
  fontSize: "0.85rem",
  resize: "vertical",
  outline: "none",
  fontFamily: font,
};

export function BadgeDiagnostico({ diagnostico }) {
  if (diagnostico?.status === "descartado") {
    return <Badge color="gray">Diagnóstico descartado</Badge>;
  }
  return <Badge color="amber">Diagnóstico</Badge>;
}

// "Baseado em: 3 OS anteriores · 2 anomalias IoT (simuladas) · 1 preventiva atrasada"
function textoContexto(contexto) {
  if (!contexto) return null;
  const partes = [`${plural(contexto.os_anteriores ?? 0, "OS anterior", "OS anteriores")}`];
  if (contexto.anomalias_iot) {
    partes.push(
      `${plural(contexto.anomalias_iot, "anomalia IoT", "anomalias IoT")}${contexto.iot_simulado ? " (simuladas)" : ""}`,
    );
  }
  if (contexto.planos_atrasados) {
    partes.push(plural(contexto.planos_atrasados, "preventiva atrasada", "preventivas atrasadas"));
  } else if (contexto.planos) {
    partes.push(plural(contexto.planos, "plano preventivo", "planos preventivos"));
  }
  return `Baseado no cadastro do equipamento, ${partes.join(" · ")}.`;
}

function textoCausaConfirmada(diagnostico) {
  const valor = diagnostico.causa_confirmada;
  if (!valor) return null;
  if (valor === "outra") return `Outra causa: ${diagnostico.causa_real}`;
  const indice = Number(valor.split("_")[1]) - 1;
  const hipotese = diagnostico.hipoteses?.[indice];
  return `Hipótese ${indice + 1}${hipotese ? `: ${hipotese.causa}` : ""}`;
}

export function ResumoDiagnosticoCausa({ diagnostico, podeDescartar = false, onDescartar }) {
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  if (!diagnostico) return null;

  const {
    causa_provavel: causa,
    descricao,
    confianca,
    tipo_problema: tipoProblema,
    recomendacao,
    modelo_usado: modelo,
    gerado_em: geradoEm,
    hipoteses = [],
    verificacoes = [],
    pecas_provaveis: pecas = [],
    cuidados_seguranca: cuidados = [],
    contexto_usado: contexto,
    gerado_por_nome: geradoPor,
    status,
    motivo_descarte: motivoDescarte,
    descartado_em: descartadoEm,
    descartado_por_nome: descartadoPor,
  } = diagnostico;

  const descartado = status === "descartado";
  const temConfianca = typeof confianca === "number";
  const confiancaBaixa = temConfianca && confianca < CONFIANCA_BAIXA;
  const geradoEmTexto = formatarDataHora(geradoEm);
  const principal = hipoteses[0];
  const outrasHipoteses = hipoteses.slice(1);
  // Com verificações detalhadas, a recomendação (= primeira verificação) não se repete.
  const mostrarRecomendacao = recomendacao && verificacoes.length === 0;
  const causaConfirmada = textoCausaConfirmada(diagnostico);
  const baseadoEm = textoContexto(contexto);

  async function confirmarDescarte() {
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MIN || texto.length > MOTIVO_MAX) {
      setErro(`Informe o motivo do descarte (de ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres).`);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await onDescartar(texto);
      setDescartando(false);
      setMotivo("");
    } catch (e) {
      setErro(e?.response?.data?.detail ?? "Não foi possível descartar o pré-diagnóstico.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        padding: "0.85rem",
        background: descartado ? C.gray50 : C.amberLight,
        border: `1px solid ${descartado ? C.gray300 : "#fcd34d"}`,
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
          justifyContent: "space-between",
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
            color: descartado ? C.gray500 : C.amberDark,
          }}
        >
          <Ico name="search" size={13} />
          DIAGNÓSTICO DE CAUSA (IA)
        </div>
        {podeDescartar && !descartado && !descartando && (
          <Btn size="sm" variant="ghost" onClick={() => setDescartando(true)}>
            Descartar
          </Btn>
        )}
      </div>

      {descartado && (
        <div style={{ fontSize: "0.78rem", color: C.gray600, lineHeight: 1.5 }}>
          <strong>Descartado</strong>
          {descartadoPor && <> por {descartadoPor}</>}
          {descartadoEm && <> em {formatarData(descartadoEm)}</>}
          {motivoDescarte && <>: {motivoDescarte}</>}
        </div>
      )}

      {causaConfirmada && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0.45rem 0.65rem",
            background: C.greenLight,
            borderRadius: 4,
            fontSize: "0.78rem",
            color: C.greenDark,
          }}
        >
          <Ico name="check" size={13} />
          Causa confirmada pelo técnico — {causaConfirmada}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: descartado ? 0.7 : 1 }}>
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

        {confiancaBaixa && !descartado && (
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
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: C.gray800,
              textDecoration: descartado ? "line-through" : "none",
            }}
          >
            {causa || "Não identificada"}
          </div>
          {principal?.evidencia && (
            <p style={{ ...textoSecao, marginTop: 2 }}>{principal.evidencia}</p>
          )}
        </div>

        {descricao && <p style={textoSecao}>{descricao}</p>}

        {outrasHipoteses.length > 0 && (
          <div>
            <div style={tituloSecao}>OUTRAS HIPÓTESES</div>
            <ol start={2} style={listaSecao}>
              {outrasHipoteses.map((hipotese, indice) => (
                <li key={indice}>
                  <strong>{hipotese.causa}</strong> ({porcentagem(hipotese.confianca)}) —{" "}
                  {hipotese.evidencia}
                </li>
              ))}
            </ol>
          </div>
        )}

        {verificacoes.length > 0 && (
          <div>
            <div style={tituloSecao}>O QUE VERIFICAR, NESTA ORDEM</div>
            <ol style={listaSecao}>
              {verificacoes.map((item, indice) => (
                <li key={indice}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {mostrarRecomendacao && (
          <div>
            <div style={tituloSecao}>RECOMENDAÇÃO</div>
            <p style={textoSecao}>{recomendacao}</p>
          </div>
        )}

        {pecas.length > 0 && (
          <div>
            <div style={tituloSecao}>PEÇAS PROVÁVEIS</div>
            <p style={textoSecao}>{pecas.join(" · ")}</p>
          </div>
        )}

        {cuidados.length > 0 && (
          <div>
            <div style={{ ...tituloSecao, color: C.redDark }}>CUIDADOS DE SEGURANÇA</div>
            <ul style={listaSecao}>
              {cuidados.map((item, indice) => (
                <li key={indice}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {baseadoEm && <div style={{ fontSize: "0.72rem", color: C.gray500 }}>{baseadoEm}</div>}

        {(modelo || geradoEmTexto) && (
          <div style={{ fontSize: "0.68rem", color: C.gray400 }}>
            Sugestão da IA, não substitui a inspeção.
            {modelo && <> Modelo: {modelo}</>}
            {geradoEmTexto && <> • Gerado em {geradoEmTexto}</>}
            {geradoPor && <> por {geradoPor}</>}
          </div>
        )}
      </div>

      {descartando && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={MOTIVO_MAX}
            disabled={enviando}
            placeholder="Por que este pré-diagnóstico não serve? O técnico verá o motivo."
            style={textareaStyle}
            aria-label="Motivo do descarte"
          />
          {erro && <span style={{ fontSize: "0.75rem", color: C.redDark }}>{erro}</span>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn
              size="sm"
              variant="ghost"
              disabled={enviando}
              onClick={() => {
                setDescartando(false);
                setMotivo("");
                setErro(null);
              }}
            >
              Cancelar
            </Btn>
            <Btn size="sm" disabled={enviando} onClick={confirmarDescarte}>
              {enviando ? "Descartando..." : "Confirmar descarte"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// Convite para gerar o pré-diagnóstico quando a OS ainda não tem um.
export function GerarDiagnosticoCausa({ onGerar }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  async function gerar() {
    setErro(null);
    setGerando(true);
    try {
      await onGerar();
    } catch (e) {
      setErro(e?.response?.data?.detail ?? "Não foi possível gerar o pré-diagnóstico.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div
      style={{
        padding: "0.85rem",
        border: `1px dashed ${C.gray300}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 600, color: C.gray500 }}>
        <Ico name="search" size={13} />
        DIAGNÓSTICO DE CAUSA (IA)
      </div>
      <p style={{ ...textoSecao, color: C.gray600 }}>
        A IA cruza o relato com o histórico do equipamento (OS anteriores, alertas de IoT e
        preventivas) e sugere causas prováveis e o que verificar primeiro. É só uma sugestão: a
        OS não muda.
      </p>
      {erro && <span style={{ fontSize: "0.75rem", color: C.redDark }}>{erro}</span>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.68rem", color: C.gray400 }}>
          Os dados da OS e do equipamento são enviados ao Gemini (Google).
        </span>
        <Btn size="sm" icon="sparkle" disabled={gerando} onClick={gerar}>
          {gerando ? "Analisando o histórico..." : "Gerar pré-diagnóstico"}
        </Btn>
      </div>
    </div>
  );
}

// Campo da conclusão da OS: qual hipótese se confirmou (opcional). Mede o
// acerto da IA e alimenta os próximos pré-diagnósticos do equipamento.
export function CausaConfirmadaCampo({ diagnostico, valor, causaReal, onChange }) {
  const hipoteses = diagnostico?.hipoteses ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Select
        label="Causa encontrada (opcional)"
        value={valor}
        onChange={(e) => onChange(e.target.value, causaReal)}
      >
        <option value="">Não informar</option>
        {hipoteses.map((hipotese, indice) => (
          <option key={indice} value={`hipotese_${indice + 1}`}>
            Hipótese {indice + 1}: {hipotese.causa}
          </option>
        ))}
        <option value="outra">Outra causa</option>
      </Select>
      {valor === "outra" && (
        <textarea
          value={causaReal}
          onChange={(e) => onChange(valor, e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Qual foi a causa encontrada?"
          style={textareaStyle}
          aria-label="Causa encontrada"
        />
      )}
      <span style={{ fontSize: "0.72rem", color: C.gray500 }}>
        Diz se o pré-diagnóstico da IA acertou e ajuda nos próximos deste equipamento.
      </span>
    </div>
  );
}

// Faixa do admin em Chamados: quanto a IA acertou nos pré-diagnósticos
// avaliados pelos técnicos na conclusão.
export function IndicadoresDiagnosticoIA({ indicadores }) {
  if (!indicadores?.gerados) return null;
  const {
    periodo_dias: dias,
    gerados,
    descartados,
    avaliados,
    acertos_principal: acertosPrincipal,
    taxa_acerto_principal: taxaPrincipal,
    taxa_acerto_entre_hipoteses: taxaEntreHipoteses,
  } = indicadores;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "0.6rem 0.85rem",
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 8,
        fontSize: "0.78rem",
        color: C.gray600,
      }}
    >
      <Ico name="search" size={13} />
      <strong style={{ color: C.gray800 }}>Pré-diagnóstico por IA</strong>
      <span>
        {plural(gerados, "gerado", "gerados")} em {dias} dias
        {descartados > 0 && <> · {plural(descartados, "descartado", "descartados")}</>}
      </span>
      {avaliados > 0 ? (
        <>
          <Badge color={corConfianca(taxaPrincipal)}>
            Acertou a causa principal: {porcentagem(taxaPrincipal)} ({acertosPrincipal} de {avaliados})
          </Badge>
          <Badge color="gray">Entre as hipóteses: {porcentagem(taxaEntreHipoteses)}</Badge>
        </>
      ) : (
        <span style={{ color: C.gray400 }}>
          Nenhum avaliado ainda: o técnico informa a causa ao concluir a OS.
        </span>
      )}
    </div>
  );
}
