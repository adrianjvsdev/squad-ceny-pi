"use client";

import { C, PRIORIDADE_LABELS } from "@/lib/constants";
import { descreverPrazo, diasAte, parseData } from "@/lib/datas";
import { agruparAgenda, COR_PRIORIDADE, formatarHoras, STATUS_AGENDA } from "@/lib/preventivas";
import { Badge } from "@/app/components/ui";

const MOTIVOS = {
  os_em_aberto: "a OS anterior ainda estava em aberto",
  atrasada: "substituída pela ocorrência mais recente",
  manual: "pulada pelo administrador",
};

function DataItem({ valor }) {
  const data = parseData(valor);
  return (
    <div style={{ width: 52, flexShrink: 0, textAlign: "center" }}>
      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: C.gray800, lineHeight: 1.1 }}>
        {String(data.getDate()).padStart(2, "0")}/{String(data.getMonth() + 1).padStart(2, "0")}
      </div>
      <div style={{ fontSize: "0.7rem", color: C.gray400, textTransform: "capitalize" }}>
        {data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
      </div>
    </div>
  );
}

function detalheStatus(item, hoje) {
  if (item.status === "atrasada") {
    const prazo = descreverPrazo(diasAte(item.data_prevista, hoje));
    return item.id_os ? `OS #${item.id_os} em aberto · venceu ${prazo}` : `Venceu ${prazo} · OS ainda não gerada`;
  }
  if (item.status === "gerada") return `OS #${item.id_os} aguardando execução`;
  if (item.status === "concluida") {
    return `OS #${item.id_os} concluída ${item.no_prazo ? "no prazo" : "fora do prazo"}`;
  }
  if (item.status === "pulada") return `Pulada: ${MOTIVOS[item.motivo] ?? "sem OS"}`;
  if (item.status === "cancelada") return item.id_os ? `OS #${item.id_os} cancelada` : "OS excluída";
  return `Prevista para ${descreverPrazo(diasAte(item.data_prevista, hoje))}`;
}

function LinhaAgenda({ item, hoje, onAbrirPlano }) {
  const status = STATUS_AGENDA[item.status] ?? { label: item.status, cor: "gray" };
  const meta = [
    item.setor_nome,
    item.tecnico_nome ?? "Sem técnico definido",
    item.duracao_estimada_horas ? formatarHoras(item.duracao_estimada_horas) : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onAbrirPlano(item.id_plano)}
      aria-label={`${item.equipamento_tag}, ${item.descricao}, ${status.label}. Abrir o plano`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "0.7rem 0.9rem",
        background: C.white,
        border: "none",
        borderTop: `1px solid ${C.gray100}`,
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
      }}
    >
      <DataItem valor={item.data_prevista} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.gray800 }}>
          <span style={{ color: C.blue }}>{item.equipamento_tag}</span> — {item.equipamento_nome}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: C.gray600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.descricao}
        </div>
        <div style={{ fontSize: "0.72rem", color: C.gray400, marginTop: 2 }}>
          {meta.join(" · ")} · {detalheStatus(item, hoje)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <Badge color={status.cor}>{status.label}</Badge>
        <Badge color={COR_PRIORIDADE[item.prioridade] ?? "gray"}>
          {PRIORIDADE_LABELS[item.prioridade] ?? item.prioridade}
        </Badge>
      </div>
    </button>
  );
}

// itens: resposta de /agenda/. Sem mostrarHistorico, ocorrências passadas só
// aparecem se ainda estiverem atrasadas (precisam de ação).
export function AgendaPreventivas({ itens, hoje, mostrarHistorico, onAbrirPlano }) {
  const visiveis = mostrarHistorico
    ? itens
    : itens.filter((item) => item.data_prevista >= hoje || item.status === "atrasada");
  const grupos = agruparAgenda(visiveis, hoje);

  if (!grupos.length) {
    return (
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.gray200}`,
          borderRadius: 8,
          padding: "1.5rem",
          color: C.gray500,
          fontSize: "0.85rem",
          textAlign: "center",
        }}
      >
        Nenhuma preventiva neste período.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {grupos.map((grupo) => (
        <section
          key={grupo.chave}
          aria-label={grupo.titulo}
          style={{
            background: C.white,
            border: `1px solid ${grupo.destaque ? C.red : C.gray200}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.55rem 0.9rem",
              background: grupo.destaque ? C.redLight : C.gray50,
              fontSize: "0.75rem",
              fontWeight: 700,
              color: grupo.destaque ? C.redDark : C.gray600,
            }}
          >
            <span>{grupo.titulo.toUpperCase()}</span>
            <span>
              {grupo.itens.length} {grupo.itens.length === 1 ? "preventiva" : "preventivas"}
            </span>
          </div>
          {grupo.itens.map((item) => (
            <LinhaAgenda
              key={`${item.id_plano}-${item.data_prevista}`}
              item={item}
              hoje={hoje}
              onAbrirPlano={onAbrirPlano}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
