"use client";

import { useState } from "react";
import { C, font, PRIORIDADE_LABELS } from "@/lib/constants";
import { formatarData, hojeISO, proximasDatas } from "@/lib/datas";
import { errosPorCampo, parseApiError } from "@/lib/erros";
import { atualizarPlano, criarPlano } from "@/lib/planosManutencao";
import { PERIODICIDADES } from "@/lib/preventivas";
import { Btn, Input, Modal, Select } from "@/app/components/ui";

const DESCRICAO_MAX = 500;
const INSTRUCOES_MAX = 2000;
const QTD_PREVIEW = 5;

// Agendar (criar) ou editar um plano preventivo.
// - equipamentos: lista da API (/api/equipamentos/).
// - tecnicos: vínculos da API (/api/usuario-setor/); só os de técnico entram.
// - plano: plano da API para editar; null para agendar um novo.
// - idEquipamentoInicial: já escolhe (e trava) o equipamento ao agendar.
// - onSalvo(plano): chamado com o plano salvo; quem abriu decide fechar.
export function AgendarManutencaoModal({
  open,
  onClose,
  onSalvo,
  equipamentos = [],
  tecnicos = [],
  plano = null,
  idEquipamentoInicial = null,
}) {
  const [salvando, setSalvando] = useState(false);
  const editando = Boolean(plano);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? "Editar manutenção preventiva" : "Agendar manutenção preventiva"}
      width={640}
      bloquearFechamento={salvando}
    >
      {open && (
        <Formulario
          key={plano?.id_plano ?? `novo-${idEquipamentoInicial ?? ""}`}
          plano={plano}
          idEquipamentoInicial={idEquipamentoInicial}
          equipamentos={equipamentos}
          tecnicos={tecnicos}
          salvando={salvando}
          setSalvando={setSalvando}
          onCancelar={onClose}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  );
}

function estadoInicial(plano, idEquipamentoInicial) {
  return {
    id_equipamento: String(plano?.id_equipamento ?? idEquipamentoInicial ?? ""),
    descricao: plano?.descricao ?? "",
    proxima_execucao: plano?.proxima_execucao ?? hojeISO(),
    periodicidade_dias: String(plano?.periodicidade_dias ?? 30),
    dias_antecedencia: String(plano?.dias_antecedencia ?? 0),
    prioridade: plano?.prioridade ?? "media",
    tecnico_sugerido: plano?.tecnico_sugerido ? String(plano.tecnico_sugerido) : "",
    duracao_estimada_horas: plano?.duracao_estimada_horas ?? "",
    instrucoes: plano?.instrucoes ?? "",
  };
}

function inteiro(valor) {
  return /^\d+$/.test(String(valor).trim()) ? Number(valor) : null;
}

// Erros de preenchimento que dá para apontar antes de chamar a API.
function validar(form, { editando, dataOriginal, equipamento }) {
  const erros = {};
  if (!editando && !equipamento) erros.id_equipamento = "Escolha o equipamento.";
  if (!form.descricao.trim()) erros.descricao = "Descreva o que será feito.";

  const hoje = hojeISO();
  const mudouData = !editando || form.proxima_execucao !== dataOriginal;
  if (!form.proxima_execucao) erros.proxima_execucao = "Informe a data.";
  else if (mudouData && form.proxima_execucao < hoje)
    erros.proxima_execucao = "A data não pode ser anterior a hoje.";

  const periodicidade = inteiro(form.periodicidade_dias);
  if (!periodicidade) erros.periodicidade_dias = "Informe um número de dias maior que zero.";

  const antecedencia = inteiro(form.dias_antecedencia);
  if (antecedencia === null) erros.dias_antecedencia = "Informe um número de dias (0 ou mais).";
  else if (periodicidade && antecedencia >= periodicidade)
    erros.dias_antecedencia = "A antecedência deve ser menor que a periodicidade.";

  const duracao = String(form.duracao_estimada_horas).replace(",", ".").trim();
  if (duracao && !(Number(duracao) > 0)) erros.duracao_estimada_horas = "Informe horas maiores que zero.";
  return erros;
}

function Formulario({
  plano,
  idEquipamentoInicial,
  equipamentos,
  tecnicos,
  salvando,
  setSalvando,
  onCancelar,
  onSalvo,
}) {
  const editando = Boolean(plano);
  const [form, setForm] = useState(() => estadoInicial(plano, idEquipamentoInicial));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);

  const equipamento = equipamentos.find(
    (e) => String(e.id_equipamento) === form.id_equipamento,
  );
  const equipamentoTravado = editando || Boolean(idEquipamentoInicial);

  // Técnicos do setor do equipamento primeiro.
  const opcoesTecnico = tecnicos
    .filter((v) => v.perfil_no_setor === "tecnico")
    .sort((a, b) => {
      const aNoSetor = a.id_setor === equipamento?.id_setor ? 0 : 1;
      const bNoSetor = b.id_setor === equipamento?.id_setor ? 0 : 1;
      return aNoSetor - bNoSetor || a.usuario_nome.localeCompare(b.usuario_nome);
    });

  const periodicidade = inteiro(form.periodicidade_dias);
  const antecedencia = inteiro(form.dias_antecedencia) ?? 0;
  const preview = proximasDatas(form.proxima_execucao, periodicidade, QTD_PREVIEW);
  const atalhoAtivo = PERIODICIDADES.some((p) => p.dias === periodicidade);

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function salvar() {
    const encontrados = validar(form, {
      editando,
      dataOriginal: plano?.proxima_execucao,
      equipamento,
    });
    setErroGeral(null);
    if (Object.keys(encontrados).length) {
      setErros(encontrados);
      return;
    }

    const duracao = String(form.duracao_estimada_horas).replace(",", ".").trim();
    const payload = {
      descricao: form.descricao.trim(),
      proxima_execucao: form.proxima_execucao,
      periodicidade_dias: periodicidade,
      dias_antecedencia: antecedencia,
      prioridade: form.prioridade,
      tecnico_sugerido: form.tecnico_sugerido ? Number(form.tecnico_sugerido) : null,
      duracao_estimada_horas: duracao || null,
      instrucoes: form.instrucoes.trim(),
    };
    if (!editando) {
      // O backend exige que o setor do plano seja o do equipamento.
      Object.assign(payload, {
        tipo: "preventiva",
        id_equipamento: equipamento.id_equipamento,
        id_setor: equipamento.id_setor,
      });
    }

    setSalvando(true);
    try {
      const salvo = editando
        ? await atualizarPlano(plano.id_plano, payload)
        : await criarPlano(payload);
      onSalvo?.(salvo);
    } catch (e) {
      const porCampo = errosPorCampo(e);
      setErros(porCampo);
      const semCampoNaTela = Object.keys(porCampo).filter((c) => !(c in form));
      if (!Object.keys(porCampo).length || semCampoNaTela.length) {
        setErroGeral(parseApiError(e, "Não foi possível salvar o agendamento."));
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Select
        label="Equipamento"
        value={form.id_equipamento}
        onChange={(e) => alterar("id_equipamento", e.target.value)}
        disabled={equipamentoTravado}
        error={erros.id_equipamento}
      >
        <option value="">Selecione o equipamento</option>
        {equipamentos.map((e) => {
          const indisponivel = e.status === "inativo" || !e.id_setor;
          return (
            <option
              key={e.id_equipamento}
              value={String(e.id_equipamento)}
              disabled={indisponivel && String(e.id_equipamento) !== form.id_equipamento}
            >
              {e.tag} — {e.nome}
              {e.setor_nome ? ` (${e.setor_nome})` : ""}
              {e.status === "inativo" ? " · inativo" : !e.id_setor ? " · sem setor" : ""}
            </option>
          );
        })}
      </Select>

      <AreaTexto
        label="O que será feito"
        value={form.descricao}
        onChange={(v) => alterar("descricao", v)}
        max={DESCRICAO_MAX}
        linhas={2}
        placeholder="Ex.: Lubrificar rolamentos e verificar a tensão da correia"
        error={erros.descricao}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Input
          label={editando ? "Próxima execução" : "Primeira execução"}
          type="date"
          value={form.proxima_execucao}
          min={editando && form.proxima_execucao === plano.proxima_execucao ? undefined : hojeISO()}
          onChange={(e) => alterar("proxima_execucao", e.target.value)}
          error={erros.proxima_execucao}
        />
        <Input
          label="Repetir a cada (dias)"
          type="number"
          min={1}
          value={form.periodicidade_dias}
          onChange={(e) => alterar("periodicidade_dias", e.target.value)}
          error={erros.periodicidade_dias}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -6 }}>
        {PERIODICIDADES.map((p) => {
          const ativo = periodicidade === p.dias;
          return (
            <button
              key={p.dias}
              type="button"
              aria-pressed={ativo}
              onClick={() => alterar("periodicidade_dias", String(p.dias))}
              style={{
                padding: "0.3rem 0.7rem",
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 600,
                fontFamily: font,
                cursor: "pointer",
                border: `1px solid ${ativo ? C.blue : C.gray300}`,
                background: ativo ? C.blueLight : C.white,
                color: ativo ? C.blue : C.gray600,
              }}
            >
              {p.label}
            </button>
          );
        })}
        {!atalhoAtivo && periodicidade && (
          <span style={{ fontSize: "0.75rem", color: C.gray500, alignSelf: "center" }}>
            Personalizado
          </span>
        )}
      </div>

      <div
        style={{
          background: C.gray50,
          border: `1px solid ${C.gray200}`,
          borderRadius: 6,
          padding: "0.75rem 0.9rem",
          fontSize: "0.8rem",
          color: C.gray700,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <strong style={{ fontSize: "0.75rem", color: C.gray500 }}>PRÓXIMAS EXECUÇÕES</strong>
        <span>
          {preview.length
            ? preview.map((d) => formatarData(d)).join(" · ")
            : "Preencha a data e a periodicidade para ver as datas."}
        </span>
        <span style={{ color: C.gray500 }}>
          {antecedencia > 0
            ? `A OS de cada data é criada ${antecedencia} dia(s) antes`
            : "A OS de cada data é criada no próprio dia"}{" "}
          e fica aguardando aprovação em Chamados.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Select
          label="Técnico sugerido (opcional)"
          value={form.tecnico_sugerido}
          onChange={(e) => alterar("tecnico_sugerido", e.target.value)}
          error={erros.tecnico_sugerido}
        >
          <option value="">Sem técnico definido</option>
          {opcoesTecnico.map((v) => (
            <option key={v.id} value={String(v.id)}>
              {v.usuario_nome} • {v.setor_nome}
            </option>
          ))}
        </Select>
        <Select
          label="Prioridade da OS"
          value={form.prioridade}
          onChange={(e) => alterar("prioridade", e.target.value)}
          error={erros.prioridade}
        >
          {Object.entries(PRIORIDADE_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label="Duração estimada (horas)"
          inputMode="decimal"
          placeholder="Ex.: 1,5"
          value={form.duracao_estimada_horas}
          onChange={(e) => alterar("duracao_estimada_horas", e.target.value)}
          error={erros.duracao_estimada_horas}
        />
        <Input
          label="Gerar a OS com antecedência (dias)"
          type="number"
          min={0}
          value={form.dias_antecedencia}
          onChange={(e) => alterar("dias_antecedencia", e.target.value)}
          error={erros.dias_antecedencia}
        />
      </div>

      <AreaTexto
        label="Instruções / checklist (opcional)"
        value={form.instrucoes}
        onChange={(v) => alterar("instrucoes", v)}
        max={INSTRUCOES_MAX}
        linhas={4}
        placeholder={"1. Bloquear e etiquetar o equipamento\n2. ..."}
        error={erros.instrucoes}
        ajuda="Vai na descrição de cada OS gerada."
      />

      {erroGeral && (
        <div
          role="alert"
          style={{
            padding: "0.6rem 0.8rem",
            background: C.redLight,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            color: C.redDark,
            fontSize: "0.8rem",
          }}
        >
          {erroGeral}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Btn>
        <Btn onClick={salvar} disabled={salvando} icon="calendar">
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Agendar"}
        </Btn>
      </div>
    </div>
  );
}

function AreaTexto({ label, value, onChange, max, linhas, placeholder, error, ajuda }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.gray700, letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={max}
        rows={linhas}
        placeholder={placeholder}
        style={{
          padding: "0.6rem 0.85rem",
          border: `1px solid ${error ? "red" : C.gray300}`,
          borderRadius: 4,
          fontSize: "0.9rem",
          color: C.gray900,
          fontFamily: font,
          resize: "vertical",
        }}
      />
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          color: error ? "red" : C.gray400,
        }}
      >
        <span>{error ?? ajuda ?? ""}</span>
        <span style={{ color: C.gray400 }}>
          {value.length}/{max}
        </span>
      </span>
    </label>
  );
}
