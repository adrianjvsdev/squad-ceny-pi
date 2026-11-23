"use client";

import { useMemo, useState } from "react";
import { C } from "@/lib/constants";
import {
  baixarCSV,
  formatarHoras,
  formatarMoeda,
  formatarPercentual,
  numeroCSV,
} from "@/lib/confiabilidade";
import { Badge, Btn, Ico, Input } from "@/app/components/ui";
import { BarraPercentual } from "./Graficos";
import { Painel, Vazio } from "./Painel";

// Disponibilidade abaixo da meta ou falhas recorrentes pedem atenção.
export function situacaoEquipamento(linha) {
  if (linha.horasObservadas === 0) return { label: "Sem dados", cor: "gray", ordem: 3 };
  if ((linha.disponibilidade ?? 1) < 0.9 || linha.falhas >= 4) {
    return { label: "Crítico", cor: "red", ordem: 0 };
  }
  if ((linha.disponibilidade ?? 1) < 0.97 || linha.falhas >= 2) {
    return { label: "Atenção", cor: "amber", ordem: 1 };
  }
  return { label: "Estável", cor: "green", ordem: 2 };
}

export function corDisponibilidade(valor) {
  if (valor === null || valor === undefined) return C.gray300;
  if (valor >= 0.97) return C.green;
  if (valor >= 0.9) return C.amber;
  return C.red;
}

const COLUNAS = [
  { chave: "equipamento", label: "Equipamento", valor: (l) => l.equipamento.nome?.toLowerCase() },
  { chave: "falhas", label: "Falhas", valor: (l) => l.falhas, numero: true },
  { chave: "mtbf", label: "MTBF", valor: (l) => l.mtbf ?? Infinity, numero: true },
  { chave: "mttf", label: "MTTF", valor: (l) => l.mttf ?? Infinity, numero: true },
  { chave: "mttr", label: "MTTR", valor: (l) => l.mttr ?? -1, numero: true },
  { chave: "disponibilidade", label: "Disponibilidade", valor: (l) => l.disponibilidade ?? 2, numero: true },
  { chave: "custo", label: "Custo", valor: (l) => l.custo, numero: true },
  { chave: "situacao", label: "Situação", valor: (l) => situacaoEquipamento(l).ordem },
];

export function TabelaConfiabilidade({ linhas, carregando, periodoLabel }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState({ chave: "situacao", asc: true });

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const coluna = COLUNAS.find((c) => c.chave === ordem.chave);
    return linhas
      .filter(
        (l) =>
          !termo ||
          [l.equipamento.nome, l.equipamento.tag, l.equipamento.setor_nome]
            .filter(Boolean)
            .some((t) => t.toLowerCase().includes(termo)),
      )
      .sort((a, b) => {
        const va = coluna.valor(a);
        const vb = coluna.valor(b);
        const cmp = va < vb ? -1 : va > vb ? 1 : b.falhas - a.falhas;
        return ordem.asc ? cmp : -cmp;
      });
  }, [linhas, busca, ordem]);

  const ordenar = (chave) =>
    setOrdem((o) => ({ chave, asc: o.chave === chave ? !o.asc : chave === "equipamento" || chave === "situacao" }));

  const exportar = () =>
    baixarCSV(
      `confiabilidade-equipamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "TAG",
        "Equipamento",
        "Setor",
        "Tipo",
        "Falhas",
        "Reparos concluídos",
        "MTBF (h)",
        "MTTF (h)",
        "MTTR (h)",
        "Disponibilidade (%)",
        "Horas paradas",
        "OS no período",
        "Custo (R$)",
        "Situação",
      ],
      visiveis.map((l) => [
        l.equipamento.tag,
        l.equipamento.nome,
        l.equipamento.setor_nome,
        l.equipamento.tipo_nome,
        l.falhas,
        l.reparos,
        numeroCSV(l.mtbf, 1),
        numeroCSV(l.mttf, 1),
        numeroCSV(l.mttr, 1),
        numeroCSV(l.disponibilidade === null ? null : l.disponibilidade * 100, 2),
        numeroCSV(l.horasParado, 1),
        l.ordens,
        numeroCSV(l.custo, 2),
        situacaoEquipamento(l).label,
      ]),
    );

  const th = {
    padding: "0.65rem 1rem",
    textAlign: "left",
    color: C.gray500,
    fontWeight: 600,
    fontSize: "0.7rem",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${C.gray200}`,
    whiteSpace: "nowrap",
  };
  const td = { padding: "0.75rem 1rem", color: C.gray700, whiteSpace: "nowrap" };

  return (
    <Painel
      titulo="Confiabilidade por equipamento"
      subtitulo={`MTBF, MTTF, MTTR e disponibilidade de cada ativo · ${periodoLabel}`}
      padding={0}
      acoes={
        <>
          <div style={{ width: 220 }}>
            <Input
              placeholder="Buscar equipamento, TAG ou setor"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar equipamento"
              style={{ minHeight: 32, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
            />
          </div>
          <Btn variant="ghost" size="sm" icon="file" onClick={exportar} disabled={!visiveis.length}>
            Exportar CSV
          </Btn>
        </>
      }
    >
      {carregando ? (
        <Vazio>Calculando indicadores...</Vazio>
      ) : !visiveis.length ? (
        <Vazio>{busca ? "Nenhum equipamento encontrado para a busca." : "Nenhum equipamento cadastrado."}</Vazio>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: C.gray50 }}>
                {COLUNAS.map((c) => (
                  <th key={c.chave} style={{ ...th, textAlign: c.numero ? "right" : "left" }}>
                    <button
                      onClick={() => ordenar(c.chave)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: ordem.chave === c.chave ? C.gray900 : C.gray500,
                      }}
                      aria-label={`Ordenar por ${c.label}`}
                    >
                      {c.label.toUpperCase()}
                      {ordem.chave === c.chave && (
                        <span style={{ display: "inline-flex", transform: ordem.asc ? "rotate(180deg)" : "none" }}>
                          <Ico name="chevDown" size={12} />
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l, i) => {
                const situacao = situacaoEquipamento(l);
                return (
                  <tr
                    key={l.equipamento.id_equipamento}
                    style={{ borderBottom: i < visiveis.length - 1 ? `1px solid ${C.gray100}` : "none" }}
                  >
                    <td style={{ ...td, whiteSpace: "normal", minWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: C.gray900 }}>{l.equipamento.nome}</div>
                      <div style={{ fontSize: "0.7rem", color: C.gray500, marginTop: 2 }}>
                        {l.equipamento.tag}
                        {l.equipamento.setor_nome ? ` · ${l.equipamento.setor_nome}` : ""}
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {l.falhas}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {l.falhas ? formatarHoras(l.mtbf) : <span style={{ color: C.gray400 }}>Sem falhas</span>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {l.falhas ? formatarHoras(l.mttf) : <span style={{ color: C.gray400 }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{formatarHoras(l.mttr)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                        <BarraPercentual valor={l.disponibilidade} cor={corDisponibilidade(l.disponibilidade)} />
                        <span style={{ minWidth: 48, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: C.gray900 }}>
                          {formatarPercentual(l.disponibilidade)}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {l.custo ? formatarMoeda(l.custo) : <span style={{ color: C.gray400 }}>—</span>}
                    </td>
                    <td style={td}>
                      <Badge color={situacao.cor}>{situacao.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Painel>
  );
}
