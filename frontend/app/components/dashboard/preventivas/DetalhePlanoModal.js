"use client";

import { useEffect, useState } from "react";
import { C, PRIORIDADE_LABELS } from "@/lib/constants";
import { formatarData, hojeISO, proximasDatas } from "@/lib/datas";
import { parseApiError } from "@/lib/erros";
import { listExecucoes } from "@/lib/planosManutencao";
import { descreverPeriodicidade, formatarHoras, SITUACAO_PLANO } from "@/lib/preventivas";
import { Badge, Btn, Modal } from "@/app/components/ui";

// Plano (dados, próximas datas e instruções) + histórico de execuções.
export function DetalhePlanoModal({ plano, onClose, onEditar }) {
  return (
    <Modal
      open={Boolean(plano)}
      onClose={onClose}
      title={plano ? `${plano.equipamento_tag} — ${plano.equipamento_nome}` : ""}
      width={620}
    >
      {plano && <Conteudo key={plano.id_plano} plano={plano} onClose={onClose} onEditar={onEditar} />}
    </Modal>
  );
}

function Info({ rotulo, children }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400 }}>{rotulo.toUpperCase()}</div>
      <div style={{ fontSize: "0.82rem", color: C.gray800, marginTop: 2 }}>{children}</div>
    </div>
  );
}

function Conteudo({ plano, onClose, onEditar }) {
  const [execucoes, setExecucoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    listExecucoes(plano.id_plano)
      .then((dados) => ativo && setExecucoes(dados))
      .catch((e) => ativo && setErro(parseApiError(e, "Não foi possível carregar o histórico.")))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [plano.id_plano]);

  const situacao = SITUACAO_PLANO[plano.situacao] ?? { label: plano.situacao, cor: "gray" };
  const proximas = plano.ativo
    ? proximasDatas(plano.proxima_execucao, plano.periodicidade_dias, 3)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Badge color={situacao.cor}>{situacao.label}</Badge>
        {plano.id_os_em_aberto && <Badge color="blue">OS #{plano.id_os_em_aberto} em aberto</Badge>}
      </div>

      <div style={{ fontSize: "0.9rem", color: C.gray800, fontWeight: 600 }}>{plano.descricao}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.9rem" }}>
        <Info rotulo="Repetição">{descreverPeriodicidade(plano.periodicidade_dias)}</Info>
        <Info rotulo="Próxima execução">{formatarData(plano.proxima_execucao)}</Info>
        <Info rotulo="Última concluída">{formatarData(plano.ultima_manutencao)}</Info>
        <Info rotulo="Técnico sugerido">{plano.tecnico_nome ?? "Sem técnico definido"}</Info>
        <Info rotulo="Prioridade da OS">{PRIORIDADE_LABELS[plano.prioridade] ?? plano.prioridade}</Info>
        <Info rotulo="Duração estimada">{formatarHoras(plano.duracao_estimada_horas)}</Info>
        <Info rotulo="Setor">{plano.setor_nome ?? "—"}</Info>
        <Info rotulo="Antecedência da OS">
          {plano.dias_antecedencia ? `${plano.dias_antecedencia} dia(s)` : "No próprio dia"}
        </Info>
        <Info rotulo="Próximas datas">
          {proximas.length ? proximas.map((d) => formatarData(d).slice(0, 5)).join(" · ") : "Plano pausado"}
        </Info>
      </div>

      {plano.instrucoes && (
        <Info rotulo="Instruções / checklist">
          <span style={{ whiteSpace: "pre-line" }}>{plano.instrucoes}</span>
        </Info>
      )}

      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, marginBottom: 6 }}>
          HISTÓRICO DE EXECUÇÕES
        </div>
        {carregando ? (
          <div style={{ fontSize: "0.8rem", color: C.gray500 }}>Carregando...</div>
        ) : erro ? (
          <div style={{ fontSize: "0.8rem", color: C.redDark }}>{erro}</div>
        ) : !execucoes.length ? (
          <div style={{ fontSize: "0.8rem", color: C.gray500 }}>Nenhuma execução registrada ainda.</div>
        ) : (
          <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 6, maxHeight: 240, overflowY: "auto" }}>
            {execucoes.map((ex) => (
              <LinhaExecucao key={ex.id_execucao} execucao={ex} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>
          Fechar
        </Btn>
        {onEditar && (
          <Btn icon="edit" onClick={() => onEditar(plano)}>
            Editar plano
          </Btn>
        )}
      </div>
    </div>
  );
}

function resultadoExecucao(ex) {
  if (ex.status === "pulada") return { texto: ex.motivo_display || "Pulada", cor: "gray" };
  if (!ex.id_os) return { texto: "OS excluída", cor: "gray" };
  if (ex.os_status === "concluida") {
    return ex.no_prazo
      ? { texto: `Concluída no prazo em ${formatarData(ex.os_concluida_em)}`, cor: "green" }
      : { texto: `Concluída com atraso em ${formatarData(ex.os_concluida_em)}`, cor: "amber" };
  }
  if (ex.os_status === "cancelada") return { texto: "OS cancelada", cor: "gray" };
  return ex.data_prevista < hojeISO()
    ? { texto: "OS em aberto, data vencida", cor: "red" }
    : { texto: "OS em aberto", cor: "blue" };
}

function LinhaExecucao({ execucao: ex }) {
  const resultado = resultadoExecucao(ex);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0.5rem 0.75rem",
        borderTop: `1px solid ${C.gray100}`,
        fontSize: "0.78rem",
      }}
    >
      <span style={{ width: 78, color: C.gray700, fontWeight: 600 }}>{formatarData(ex.data_prevista)}</span>
      <span style={{ width: 60, color: C.gray500 }}>{ex.id_os ? `OS #${ex.id_os}` : "—"}</span>
      <span style={{ flex: 1 }}>
        <Badge color={resultado.cor}>{resultado.texto}</Badge>
      </span>
    </div>
  );
}
