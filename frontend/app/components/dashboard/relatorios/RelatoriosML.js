"use client";

import { useMemo, useState } from "react";
import { C, TIPO_PROBLEMA_LABELS } from "@/lib/constants";
import {
  baixarCSV,
  formatarHoras,
  formatarPercentual,
  MIN_FALHAS_TREINO,
  numeroCSV,
  TIPOS_MANUTENCAO,
} from "@/lib/confiabilidade";
import { Badge, Btn, Ico, Input, Tooltip } from "@/app/components/ui";
import { BarraPercentual } from "./Graficos";
import { Vazio } from "./Painel";

// Análises que o módulo de ML vai entregar. Por enquanto só a vitrine.
const MODELOS = [
  {
    icone: "activity",
    titulo: "Probabilidade de falha",
    descricao: "Chance de cada equipamento falhar nos próximos 30 dias, a partir do histórico de OS.",
    saida: "% de risco",
  },
  {
    icone: "clock",
    titulo: "Vida útil restante (RUL)",
    descricao: "Estimativa de quanto tempo o ativo opera até exigir intervenção.",
    saida: "dias restantes",
  },
  {
    icone: "wifi",
    titulo: "Detecção de anomalias",
    descricao: "Padrões fora do normal na telemetria IoT (temperatura, vibração, pressão).",
    saida: "alertas",
    soIoT: true,
  },
  {
    icone: "layers",
    titulo: "Causa raiz recorrente",
    descricao: "Agrupa falhas parecidas para apontar a causa mais provável e a peça envolvida.",
    saida: "ranking",
  },
];

function Selo({ children, cor = C.purple, fundo = C.purpleLight }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: fundo,
        color: cor,
        fontSize: "0.7rem",
        fontWeight: 650,
      }}
    >
      {children}
    </span>
  );
}

function SeletorEquipamentos({ historico, selecionados, onAlternar, onTodos, onLimpar }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = historico.filter(
    (h) =>
      !termo ||
      [h.equipamento.nome, h.equipamento.tag, h.equipamento.setor_nome]
        .filter(Boolean)
        .some((t) => t.toLowerCase().includes(termo)),
  );

  return (
    <div
      style={{
        border: `1px solid ${C.gray200}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: C.white,
      }}
    >
      <div style={{ padding: "0.85rem", borderBottom: `1px solid ${C.gray100}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 650, color: C.gray900 }}>
            Equipamentos com OS
          </span>
          <span style={{ fontSize: "0.72rem", color: C.gray500, fontVariantNumeric: "tabular-nums" }}>
            {selecionados.size} de {historico.length}
          </span>
        </div>
        <Input
          placeholder="Buscar por nome, TAG ou setor"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar equipamento para análise"
          style={{ minHeight: 32, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button className="ceny-link" onClick={() => onTodos(filtrados)} style={{ fontSize: "0.74rem" }}>
            Selecionar {termo ? "filtrados" : "todos"}
          </button>
          <button className="ceny-link" onClick={onLimpar} style={{ fontSize: "0.74rem" }} disabled={!selecionados.size}>
            Limpar
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto", padding: 6 }}>
        {!filtrados.length ? (
          <Vazio>Nenhum equipamento encontrado.</Vazio>
        ) : (
          filtrados.map((h) => {
            const id = h.equipamento.id_equipamento;
            const marcado = selecionados.has(id);
            return (
              <label
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.55rem 0.6rem",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: marcado ? C.blueLight : "transparent",
                  transition: "background 0.12s ease",
                }}
              >
                <input type="checkbox" checked={marcado} onChange={() => onAlternar(id)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: C.gray900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.equipamento.nome}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: C.gray500 }}>
                    {h.equipamento.tag} · {h.totalOrdens} OS · {h.falhas} falha{h.falhas === 1 ? "" : "s"}
                  </div>
                </div>
                {h.abertas > 0 && (
                  <Tooltip text={`${h.abertas} OS em aberto`}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, display: "block" }} />
                  </Tooltip>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function ResumoBase({ itens }) {
  const totalOS = itens.reduce((s, h) => s + h.totalOrdens, 0);
  const totalFalhas = itens.reduce((s, h) => s + h.falhas, 0);
  const prontos = itens.filter((h) => h.pronto).length;
  const completude = itens.length ? itens.reduce((s, h) => s + h.completude, 0) / itens.length : 0;
  const blocos = [
    { label: "Ordens de serviço", valor: totalOS.toLocaleString("pt-BR") },
    { label: "Falhas registradas", valor: totalFalhas.toLocaleString("pt-BR") },
    { label: "Prontos para treino", valor: `${prontos}/${itens.length}` },
    { label: "Completude dos dados", valor: formatarPercentual(completude, 0) },
  ];
  return (
    <div className="ceny-grid-4" style={{ gap: 10 }}>
      {blocos.map((b) => (
        <div
          key={b.label}
          style={{ background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 10, padding: "0.75rem 0.85rem" }}
        >
          <div style={{ fontSize: "0.7rem", color: C.gray500 }}>{b.label}</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: C.gray900, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            {b.valor}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaBase({ itens }) {
  const th = {
    padding: "0.55rem 0.75rem",
    textAlign: "left",
    color: C.gray500,
    fontWeight: 600,
    fontSize: "0.68rem",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${C.gray200}`,
    whiteSpace: "nowrap",
  };
  const td = { padding: "0.6rem 0.75rem", color: C.gray700, whiteSpace: "nowrap", fontSize: "0.78rem" };
  return (
    <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 10, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.gray50 }}>
            {["Equipamento", "OS", "Falhas", "Intervalo médio", "MTTR", "Última falha", "Problema frequente", "Completude", "Dados"].map(
              (h) => (
                <th key={h} style={th}>
                  {h.toUpperCase()}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {itens.map((h, i) => (
            <tr key={h.equipamento.id_equipamento} style={{ borderBottom: i < itens.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              <td style={{ ...td, fontWeight: 600, color: C.gray900 }}>
                {h.equipamento.nome}
                <div style={{ fontWeight: 400, fontSize: "0.68rem", color: C.gray500 }}>{h.equipamento.tag}</div>
              </td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{h.totalOrdens}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{h.falhas}</td>
              <td style={td}>{formatarHoras(h.intervaloMedioHoras)}</td>
              <td style={td}>{formatarHoras(h.mttrHoras)}</td>
              <td style={td}>
                {h.diasDesdeUltimaFalha === null
                  ? "—"
                  : h.diasDesdeUltimaFalha === 0
                    ? "hoje"
                    : `há ${h.diasDesdeUltimaFalha} dia${h.diasDesdeUltimaFalha === 1 ? "" : "s"}`}
              </td>
              <td style={td}>{h.tipoPredominante ? TIPO_PROBLEMA_LABELS[h.tipoPredominante] ?? h.tipoPredominante : "—"}</td>
              <td style={td}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BarraPercentual valor={h.completude} cor={h.completude >= 0.8 ? C.green : h.completude >= 0.5 ? C.amber : C.red} />
                  <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{formatarPercentual(h.completude, 0)}</span>
                </div>
              </td>
              <td style={td}>
                {h.pronto ? (
                  <Badge color="green">Suficiente</Badge>
                ) : (
                  <Tooltip text={`Faltam ${MIN_FALHAS_TREINO - h.falhas} falha(s) registradas para o treino`}>
                    <Badge color="amber">Poucos dados</Badge>
                  </Tooltip>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CartaoModelo({ modelo, aplicavel }) {
  return (
    <div
      style={{
        border: `1px dashed ${C.gray300}`,
        borderRadius: 10,
        padding: "0.95rem",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: C.gray50,
        opacity: aplicavel ? 1 : 0.6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: C.purpleLight,
            color: C.purple,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ico name={modelo.icone} size={15} color={C.purple} />
        </span>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 650,
            color: C.gray900,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {modelo.titulo}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "0.74rem", color: C.gray600, lineHeight: 1.5 }}>{modelo.descricao}</p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: 8,
          borderTop: `1px solid ${C.gray200}`,
          gap: 8,
        }}
      >
        <span
          title={`Saída: ${modelo.saida}`}
          style={{
            fontSize: "0.68rem",
            color: C.gray500,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Saída: {modelo.saida}
        </span>
        <Badge color="gray">{aplicavel ? "Em breve" : "Requer IoT"}</Badge>
      </div>
    </div>
  );
}

export function RelatoriosML({ historico, carregando }) {
  const [selecionados, setSelecionados] = useState(() => new Set());

  const itens = useMemo(
    () => historico.filter((h) => selecionados.has(h.equipamento.id_equipamento)),
    [historico, selecionados],
  );
  const algumIoT = itens.some((h) => h.equipamento.tem_iot);

  const alternar = (id) =>
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const exportar = () =>
    baixarCSV(
      `dataset-ml-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "TAG",
        "Equipamento",
        "Setor",
        "Tipo",
        "IoT",
        "Total OS",
        ...TIPOS_MANUTENCAO.map((t) => `OS ${t.label.toLowerCase()}`),
        "Falhas",
        "Intervalo médio entre falhas (h)",
        "MTTR (h)",
        "Dias desde última falha",
        "Problema frequente",
        "Completude (%)",
        "OS em aberto",
      ],
      itens.map((h) => [
        h.equipamento.tag,
        h.equipamento.nome,
        h.equipamento.setor_nome,
        h.equipamento.tipo_nome,
        h.equipamento.tem_iot ? "sim" : "não",
        h.totalOrdens,
        ...TIPOS_MANUTENCAO.map((t) => h.porTipo[t.valor]),
        h.falhas,
        numeroCSV(h.intervaloMedioHoras, 1),
        numeroCSV(h.mttrHoras, 1),
        h.diasDesdeUltimaFalha ?? "",
        h.tipoPredominante ? TIPO_PROBLEMA_LABELS[h.tipoPredominante] ?? h.tipoPredominante : "",
        numeroCSV(h.completude * 100, 0),
        h.abertas,
      ]),
    );

  return (
    <section
      style={{
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 12,
        boxShadow: C.shadowCard,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "1.15rem 1.25rem",
          borderBottom: `1px solid ${C.gray100}`,
          background: `linear-gradient(135deg, ${C.purpleLight}, ${C.white} 60%)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: C.purple,
              color: C.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Ico name="sparkle" size={18} color={C.white} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>
              Relatórios de Machine Learning
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: C.gray500 }}>
              Escolha os equipamentos com OS para montar a base de análise preditiva.
            </p>
          </div>
        </div>
        <Selo>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple }} />
          Modelo ainda não instalado
        </Selo>
      </header>

      <div className="ceny-ml-grid" style={{ padding: "1.25rem" }}>
        {carregando ? (
          <Vazio>Carregando equipamentos...</Vazio>
        ) : !historico.length ? (
          <Vazio>Nenhum equipamento teve ordem de serviço aberta ainda.</Vazio>
        ) : (
          <SeletorEquipamentos
            historico={historico}
            selecionados={selecionados}
            onAlternar={alternar}
            onTodos={(lista) =>
              setSelecionados((atual) => new Set([...atual, ...lista.map((h) => h.equipamento.id_equipamento)]))
            }
            onLimpar={() => setSelecionados(new Set())}
          />
        )}

        <div className="ceny-cq" style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
          {!itens.length ? (
            <div
              style={{
                border: `1px dashed ${C.gray300}`,
                borderRadius: 10,
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: C.purpleLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ico name="cpu" size={20} color={C.purple} />
              </span>
              <div style={{ fontSize: "0.88rem", fontWeight: 650, color: C.gray900 }}>
                Selecione equipamentos para analisar
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: C.gray500, maxWidth: 420, lineHeight: 1.5 }}>
                Vamos reunir o histórico de ordens de serviço de cada um (falhas, tempos de reparo e tipos de
                problema) e mostrar se já há dados suficientes para treinar os modelos.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 650, color: C.gray900 }}>
                  Base de análise · {itens.length} equipamento{itens.length === 1 ? "" : "s"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="sm" icon="file" onClick={exportar}>
                    Exportar dataset
                  </Btn>
                  <Tooltip text="Disponível quando o modelo de ML for instalado">
                    <Btn size="sm" icon="sparkle" disabled>
                      Executar análise
                    </Btn>
                  </Tooltip>
                </div>
              </div>
              <ResumoBase itens={itens} />
              <TabelaBase itens={itens} />
            </>
          )}

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 650, color: C.gray900, marginBottom: 10 }}>
              Análises previstas
            </div>
            <div className="ceny-grid-cards" style={{ gap: 10 }}>
              {MODELOS.map((m) => (
                <CartaoModelo key={m.titulo} modelo={m} aplicavel={!m.soIoT || !itens.length || algumIoT} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
