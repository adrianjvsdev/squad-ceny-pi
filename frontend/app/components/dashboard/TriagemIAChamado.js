"use client";

import { useState } from "react";
import {
  C,
  font,
  PRIORIDADE_LABELS,
  TIPO_PROBLEMA_LABELS,
} from "@/lib/constants";
import { criarOrdemServico, triarOrdemServico } from "@/lib/ordensServico";
import { Badge, Btn, Ico, Input, Select } from "@/app/components/ui";

// Mesmos limites do TriagemTextoSerializer no backend.
const TEXTO_MIN = 10;
const TEXTO_MAX = 2000;
const NIVEIS_PRIORIDADE = Object.keys(PRIORIDADE_LABELS);

const textareaStyle = {
  padding: "0.6rem 0.85rem",
  border: `1px solid ${C.gray300}`,
  borderRadius: 4,
  fontSize: "0.9rem",
  resize: "vertical",
  outline: "none",
  fontFamily: font,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: C.gray700,
  letterSpacing: "0.05em",
};

function corPrioridade(prioridade) {
  if (prioridade === "critica" || prioridade === "alta") return "red";
  return prioridade === "media" ? "amber" : "gray";
}

function corConfianca(confianca) {
  if (confianca >= 0.8) return "green";
  return confianca >= 0.6 ? "amber" : "red";
}

function porcentagem(valor) {
  return `${Math.round(valor * 100)}%`;
}

// Achata erros do DRF (inclusive os aninhados do bloco triagem_ia) em texto.
function mensagensDaApi(valor) {
  if (valor == null) return [];
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(mensagensDaApi);
  if (typeof valor === "object") return Object.values(valor).flatMap(mensagensDaApi);
  return [String(valor)];
}

function mensagemDoPreview(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data?.texto) return mensagensDaApi(data.texto).join(" ");
  return "Não foi possível analisar o texto. Verifique sua conexão e tente novamente.";
}

function Aviso({ cor = "amber", children }) {
  const cores = {
    amber: { bg: C.amberLight, border: "#fcd34d", text: C.amberDark },
    red: { bg: C.redLight, border: "#fca5a5", text: C.redDark },
    purple: { bg: C.purpleLight, border: "#c4b5fd", text: C.purpleDark },
  };
  const s = cores[cor];
  return (
    <div
      style={{
        padding: "0.65rem 0.85rem",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 6,
        fontSize: "0.78rem",
        color: s.text,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// SELETOR DE MODO (IA x manual) do modal "Criar Novo Chamado"
// ============================================================
export function SeletorModoCriacao({ modo, onChange }) {
  const opcoes = [
    ["ia", "Descrever com IA", "sparkle"],
    ["manual", "Preencher manualmente", "file"],
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: C.gray100,
        borderRadius: 6,
      }}
    >
      {opcoes.map(([valor, label, icone]) => {
        const ativo = modo === valor;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => onChange(valor)}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "0.45rem",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: font,
              fontSize: "0.8rem",
              fontWeight: 600,
              background: ativo ? C.white : "transparent",
              color: ativo ? C.gray900 : C.gray500,
              boxShadow: ativo ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Ico name={icone} size={14} color={ativo && valor === "ia" ? C.purple : undefined} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// ABERTURA DE CHAMADO POR TEXTO LIVRE (triagem por IA)
// Descrever -> analisar (preview, nada e gravado) -> revisar -> confirmar
// (POST /api/ordens-servico/ com o bloco triagem_ia de auditoria).
// ============================================================
export function TriagemIAChamado({ equipamentos, onCriado, onCancelar, onPreencherManual }) {
  const [texto, setTexto] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState(null);
  const [falhaIA, setFalhaIA] = useState(false);
  const [candidatos, setCandidatos] = useState([]);
  const [triagem, setTriagem] = useState(null);
  const [revisao, setRevisao] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  async function analisar(textoParaAnalisar = texto) {
    const valor = textoParaAnalisar.trim();
    if (valor.length < TEXTO_MIN) {
      setErro(`Descreva o problema com pelo menos ${TEXTO_MIN} caracteres.`);
      return;
    }

    setErro(null);
    setFalhaIA(false);
    setCandidatos([]);
    setAnalisando(true);
    try {
      const data = await triarOrdemServico(valor);
      setTriagem(data);
      setRevisao({
        titulo: data.titulo,
        descricao: data.descricao,
        prioridade: data.prioridade_sugerida,
        idEquipamento: String(data.equipamento.id_equipamento),
      });
    } catch (e) {
      const data = e?.response?.data;
      if (data?.codigo === "equipamento_ambiguo") setCandidatos(data.candidatos ?? []);
      // 502/503: IA fora do ar, sem cota ou resposta invalida -> oferecer o manual.
      setFalhaIA([502, 503].includes(e?.response?.status));
      setErro(mensagemDoPreview(e));
    } finally {
      setAnalisando(false);
    }
  }

  function escolherCandidato(equipamento) {
    const novoTexto = `Equipamento ${equipamento.tag}: ${texto.trim()}`;
    setTexto(novoTexto);
    analisar(novoTexto);
  }

  function voltarParaDescricao() {
    setTriagem(null);
    setRevisao(null);
    setErro(null);
  }

  async function confirmar() {
    if (!revisao.titulo.trim()) {
      setErro("Informe um título para o chamado.");
      return;
    }

    setErro(null);
    setConfirmando(true);
    try {
      await criarOrdemServico({
        titulo: revisao.titulo.trim(),
        descricao: revisao.descricao.trim(),
        tipo_manutencao: triagem.tipo_manutencao,
        prioridade: revisao.prioridade,
        id_equipamento: Number(revisao.idEquipamento),
        // Metadado de auditoria: a OS passa pelas mesmas validacoes de sempre.
        triagem_ia: {
          texto_original: triagem.texto_original,
          tipo_problema: triagem.tipo_problema,
          confianca: triagem.confianca,
          modelo_usado: triagem.modelo_usado,
          justificativa_prioridade: triagem.justificativa_prioridade,
          prioridade_sugerida: triagem.prioridade_sugerida,
        },
      });
      await onCriado();
    } catch (e) {
      const mensagens = mensagensDaApi(e?.response?.data);
      setErro(mensagens.length ? mensagens.join(" ") : "Erro ao abrir chamado. Tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  if (!triagem) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={labelStyle}>DESCREVA O PROBLEMA</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            maxLength={TEXTO_MAX}
            disabled={analisando}
            placeholder="Ex.: A bomba BOMBA-01 está vazando óleo pelo selo desde ontem, mas ainda funciona."
            style={textareaStyle}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: "0.72rem", color: C.gray500 }}>
              Cite a TAG ou o nome do equipamento. A IA sugere título, descrição e
              prioridade, e você revisa antes de abrir.
            </span>
            <span style={{ fontSize: "0.72rem", color: C.gray400, flexShrink: 0 }}>
              {texto.length}/{TEXTO_MAX}
            </span>
          </div>
        </div>

        {erro && (
          <Aviso cor="red">
            {erro}
            {candidatos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {candidatos.map((equipamento) => (
                  <Btn
                    key={equipamento.id_equipamento}
                    size="sm"
                    variant="secondary"
                    disabled={analisando}
                    onClick={() => escolherCandidato(equipamento)}
                  >
                    {equipamento.tag} — {equipamento.nome}
                  </Btn>
                ))}
              </div>
            )}
          </Aviso>
        )}

        <p style={{ margin: 0, fontSize: "0.7rem", color: C.gray400 }}>
          O texto é enviado ao Gemini (Google) para análise. Não inclua dados pessoais.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={onCancelar} disabled={analisando}>
            Cancelar
          </Btn>
          {falhaIA && (
            <Btn variant="secondary" onClick={() => onPreencherManual(texto.trim())}>
              Preencher manualmente
            </Btn>
          )}
          <Btn icon="sparkle" onClick={() => analisar()} disabled={analisando}>
            {analisando ? "Analisando..." : "Analisar com IA"}
          </Btn>
        </div>
      </div>
    );
  }

  const equipamentoResolvido = triagem.equipamento;
  const opcoesEquipamento = equipamentos.some(
    (e) => e.id_equipamento === equipamentoResolvido.id_equipamento,
  )
    ? equipamentos
    : [equipamentoResolvido, ...equipamentos];
  const equipamentoSelecionado = opcoesEquipamento.find(
    (e) => String(e.id_equipamento) === revisao.idEquipamento,
  );
  const equipamentoInativo = equipamentoSelecionado?.status === "inativo";
  const rebaixouComRisco =
    triagem.risco_seguranca &&
    NIVEIS_PRIORIDADE.indexOf(revisao.prioridade) < NIVEIS_PRIORIDADE.indexOf("alta");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge color={corPrioridade(triagem.prioridade_sugerida)}>
          Prioridade sugerida: {PRIORIDADE_LABELS[triagem.prioridade_sugerida]}
        </Badge>
        <Badge color="gray">
          Problema {TIPO_PROBLEMA_LABELS[triagem.tipo_problema] ?? triagem.tipo_problema}
        </Badge>
        {triagem.risco_seguranca && <Badge color="red">Risco à segurança</Badge>}
        {triagem.equipamento_parado && <Badge color="amber">Equipamento parado</Badge>}
        <Badge color={corConfianca(triagem.confianca)}>
          Confiança {porcentagem(triagem.confianca)}
        </Badge>
      </div>

      <Aviso cor="purple">
        <strong>Por que esta prioridade:</strong> {triagem.justificativa_prioridade}
      </Aviso>

      {triagem.confianca < 0.6 && (
        <Aviso>
          A IA teve <strong>baixa confiança</strong> nesta triagem. Revise os campos com
          atenção antes de confirmar.
        </Aviso>
      )}

      <Input
        label="Título"
        value={revisao.titulo}
        maxLength={300}
        onChange={(e) => setRevisao((r) => ({ ...r, titulo: e.target.value }))}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>DESCRIÇÃO</label>
        <textarea
          value={revisao.descricao}
          onChange={(e) => setRevisao((r) => ({ ...r, descricao: e.target.value }))}
          rows={4}
          style={textareaStyle}
        />
      </div>

      {triagem.campos_faltantes.length > 0 && (
        <Aviso>
          <strong>Para ajudar o técnico, considere acrescentar à descrição:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: "1.1rem" }}>
            {triagem.campos_faltantes.map((campo) => (
              <li key={campo}>{campo}</li>
            ))}
          </ul>
        </Aviso>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <Select
          label="Equipamento"
          value={revisao.idEquipamento}
          onChange={(e) => setRevisao((r) => ({ ...r, idEquipamento: e.target.value }))}
        >
          {opcoesEquipamento.map((equipamento) => (
            <option key={equipamento.id_equipamento} value={String(equipamento.id_equipamento)}>
              {equipamento.tag} - {equipamento.nome}
            </option>
          ))}
        </Select>
        <Select
          label="Urgência"
          value={revisao.prioridade}
          onChange={(e) => setRevisao((r) => ({ ...r, prioridade: e.target.value }))}
        >
          {NIVEIS_PRIORIDADE.map((nivel) => (
            <option key={nivel} value={nivel}>
              {PRIORIDADE_LABELS[nivel]}
              {nivel === triagem.prioridade_sugerida ? " (sugerida pela IA)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {rebaixouComRisco && (
        <Aviso>
          A IA identificou <strong>risco à segurança</strong>. A recomendação é prioridade
          Alta ou Crítica.
        </Aviso>
      )}

      {equipamentoInativo && (
        <Aviso cor="red">
          Este equipamento está <strong>inativo</strong> e não pode receber uma ordem de
          serviço. Escolha outro equipamento.
        </Aviso>
      )}

      <div style={{ fontSize: "0.72rem", color: C.gray500 }}>
        Tipo: <strong>Manutenção Corretiva</strong> · Analisado por {triagem.modelo_usado}
      </div>

      {erro && <p style={{ margin: 0, fontSize: "0.78rem", color: C.redDark }}>{erro}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={voltarParaDescricao} disabled={confirmando}>
          Voltar e editar texto
        </Btn>
        <Btn onClick={confirmar} disabled={confirmando || equipamentoInativo}>
          {confirmando ? "Abrindo..." : "Confirmar e abrir chamado"}
        </Btn>
      </div>
    </div>
  );
}

// ============================================================
// RESUMO DA TRIAGEM no detalhe do chamado (auditoria, somente leitura)
// ============================================================
export function ResumoTriagemIA({ triagem, prioridadeFinal }) {
  const alterada = prioridadeFinal && prioridadeFinal !== triagem.prioridade_sugerida;
  return (
    <div
      style={{
        padding: "0.85rem",
        background: C.purpleLight,
        border: "1px solid #c4b5fd",
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
          color: C.purpleDark,
        }}
      >
        <Ico name="sparkle" size={13} />
        ABERTO COM TRIAGEM POR IA
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge color={corPrioridade(triagem.prioridade_sugerida)}>
          Sugerida: {PRIORIDADE_LABELS[triagem.prioridade_sugerida]}
        </Badge>
        {alterada && (
          <Badge color="gray">
            Alterada pelo solicitante para {PRIORIDADE_LABELS[prioridadeFinal] ?? prioridadeFinal}
          </Badge>
        )}
        <Badge color="gray">
          Problema {TIPO_PROBLEMA_LABELS[triagem.tipo_problema] ?? triagem.tipo_problema}
        </Badge>
        <Badge color={corConfianca(triagem.confianca)}>
          Confiança {porcentagem(triagem.confianca)}
        </Badge>
      </div>
      <p style={{ margin: 0, fontSize: "0.8rem", color: C.gray700, lineHeight: 1.5 }}>
        {triagem.justificativa_prioridade}
      </p>
      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, marginBottom: 2 }}>
          RELATO ORIGINAL
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: C.gray600,
            fontStyle: "italic",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {triagem.texto_original}
        </p>
      </div>
      <div style={{ fontSize: "0.68rem", color: C.gray400 }}>Modelo: {triagem.modelo_usado}</div>
    </div>
  );
}
