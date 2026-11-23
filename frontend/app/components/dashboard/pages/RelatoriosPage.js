"use client";

import { useEffect, useMemo, useState } from "react";
import { C, TIPO_PROBLEMA_LABELS } from "@/lib/constants";
import {
  calcularConfiabilidade,
  calcularGestao,
  comoLista,
  falhasPorTipoProblema,
  formatarHoras,
  formatarMoeda,
  formatarPercentual,
  historicoParaML,
  janelaAnterior,
  janelaDoPeriodo,
  ordensPorPeriodo,
  TIPOS_MANUTENCAO,
  variacao,
} from "@/lib/confiabilidade";
import { listEquipamentos } from "@/lib/equipamentos";
import { parseApiError } from "@/lib/erros";
import { listOrdensServico } from "@/lib/ordensServico";
import { getIndicadores } from "@/lib/planosManutencao";
import { Ico, Select } from "@/app/components/ui";
import { BarrasHorizontais, ColunasEmpilhadas } from "../relatorios/Graficos";
import { CartaoIndicador, Painel } from "../relatorios/Painel";
import { RelatoriosML } from "../relatorios/RelatoriosML";
import { corDisponibilidade, TabelaConfiabilidade } from "../relatorios/TabelaConfiabilidade";

const PERIODOS = [
  { dias: 30, label: "Últimos 30 dias" },
  { dias: 90, label: "Últimos 90 dias" },
  { dias: 180, label: "Últimos 6 meses" },
  { dias: 365, label: "Últimos 12 meses" },
];

const LABELS_PROBLEMA = { ...TIPO_PROBLEMA_LABELS, nao_classificado: "Não classificado" };

function TituloSecao({ titulo, descricao }) {
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: C.gray900, letterSpacing: "-0.01em" }}>
        {titulo}
      </h3>
      {descricao && <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: C.gray500 }}>{descricao}</p>}
    </div>
  );
}

function ComoCalculamos() {
  const [aberto, setAberto] = useState(false);
  const itens = [
    ["MTBF", "Tempo médio entre falhas", "Tempo observado ÷ nº de falhas (OS corretivas). Quanto maior, melhor."],
    ["MTTF", "Tempo médio até a falha", "Tempo em operação (sem as paradas) ÷ nº de falhas. MTBF ≈ MTTF + MTTR."],
    ["MTTR", "Tempo médio de reparo", "Do início à conclusão de cada OS corretiva concluída. Quanto menor, melhor."],
    ["Disp.", "Disponibilidade", "Tempo em operação ÷ tempo observado. A parada vai da abertura da OS ao retorno à operação."],
  ];
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 10,
        fontSize: "0.78rem",
      }}
    >
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          all: "unset",
          boxSizing: "border-box",
          width: "100%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0.65rem 0.9rem",
          color: C.gray600,
          fontWeight: 500,
        }}
      >
        <Ico name="info" size={14} color={C.blue} />
        Como os indicadores são calculados
        <span style={{ marginLeft: "auto", display: "inline-flex", transform: aberto ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <Ico name="chevDown" size={14} />
        </span>
      </button>
      {aberto && (
        <div
          style={{
            padding: "0 0.9rem 0.9rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 12,
          }}
        >
          {itens.map(([sigla, nome, regra]) => (
            <div key={sigla} style={{ background: C.gray50, borderRadius: 8, padding: "0.65rem 0.75rem" }}>
              <div style={{ fontWeight: 650, color: C.gray900 }}>
                {sigla} <span style={{ fontWeight: 500, color: C.gray500 }}>· {nome}</span>
              </div>
              <div style={{ color: C.gray600, marginTop: 4, lineHeight: 1.5 }}>{regra}</div>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", color: C.gray600, lineHeight: 1.5 }}>
            Só OS <strong>corretivas</strong> contam como falha — preventivas e preditivas entram nos
            indicadores de gestão, não no MTBF/MTTF/MTTR. Sem data de entrada em operação no
            cadastro do equipamento, o tempo observado começa no início do período.
          </div>
        </div>
      )}
    </div>
  );
}

export function RelatoriosPage() {
  const [ordens, setOrdens] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [indicadoresPrev, setIndicadoresPrev] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dias, setDias] = useState(90);
  const [setor, setSetor] = useState("");

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [ordensData, equipamentosData] = await Promise.all([
          listOrdensServico(),
          listEquipamentos(),
        ]);
        if (!ativo) return;
        setOrdens(comoLista(ordensData));
        setEquipamentos(comoLista(equipamentosData));
      } catch (e) {
        if (ativo) setErro(parseApiError(e, "Não foi possível carregar os dados dos relatórios."));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Aderência ao plano preventivo vem pronta do backend.
  useEffect(() => {
    let ativo = true;
    getIndicadores({ dias, id_setor: setor })
      .then((data) => ativo && setIndicadoresPrev(data))
      .catch(() => ativo && setIndicadoresPrev(null));
    return () => {
      ativo = false;
    };
  }, [dias, setor]);

  const setores = useMemo(() => {
    const mapa = new Map();
    for (const e of equipamentos) if (e.id_setor) mapa.set(e.id_setor, e.setor_nome);
    return [...mapa.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [equipamentos]);

  const equipamentosFiltrados = useMemo(
    () => (setor ? equipamentos.filter((e) => String(e.id_setor) === setor) : equipamentos),
    [equipamentos, setor],
  );
  const ordensFiltradas = useMemo(() => {
    if (!setor) return ordens;
    const ids = new Set(equipamentosFiltrados.map((e) => e.id_equipamento));
    return ordens.filter((os) => ids.has(os.id_equipamento));
  }, [ordens, equipamentosFiltrados, setor]);

  const relatorio = useMemo(() => {
    const janela = janelaDoPeriodo(dias);
    const atual = calcularConfiabilidade(ordensFiltradas, equipamentosFiltrados, janela);
    const anterior = calcularConfiabilidade(ordensFiltradas, equipamentosFiltrados, janelaAnterior(janela));
    return {
      atual,
      anterior,
      gestao: calcularGestao(ordensFiltradas, janela),
      porPeriodo: ordensPorPeriodo(ordensFiltradas, janela, dias),
      porProblema: falhasPorTipoProblema(ordensFiltradas, janela, LABELS_PROBLEMA),
    };
  }, [ordensFiltradas, equipamentosFiltrados, dias]);

  const historico = useMemo(
    () => historicoParaML(ordensFiltradas, equipamentosFiltrados),
    [ordensFiltradas, equipamentosFiltrados],
  );

  const { atual, anterior, gestao } = relatorio;
  const frota = atual.frota;
  const periodoLabel = PERIODOS.find((p) => p.dias === dias)?.label.toLowerCase();

  const topFalhas = atual.linhas
    .filter((l) => l.falhas > 0)
    .sort((a, b) => b.falhas - a.falhas || (b.horasParado - a.horasParado))
    .slice(0, 8)
    .map((l) => ({
      chave: l.equipamento.id_equipamento,
      label: l.equipamento.nome,
      titulo: `${l.equipamento.tag} · ${l.equipamento.nome}`,
      valor: l.falhas,
      linha: l,
    }));

  const aderencia = indicadoresPrev?.aderencia;

  return (
    <div className="ceny-cq" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Cabeçalho + filtros */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "-0.02em", fontWeight: 700, color: C.gray900 }}>
            Relatórios
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: C.gray500 }}>
            Indicadores de confiabilidade e desempenho da manutenção da sua operação.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 180 }}>
            <Select label="Período" value={String(dias)} onChange={(e) => setDias(Number(e.target.value))}>
              {PERIODOS.map((p) => (
                <option key={p.dias} value={String(p.dias)}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select label="Setor" value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Todos os setores</option>
              {setores.map(([id, nome]) => (
                <option key={id} value={String(id)}>
                  {nome}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid #fecaca",
            color: C.redDark,
            background: C.redLight,
            fontSize: "0.8rem",
          }}
        >
          {erro}
        </div>
      )}

      {/* Confiabilidade */}
      <TituloSecao
        titulo="Confiabilidade dos ativos"
        descricao={`${equipamentosFiltrados.filter((e) => e.status !== "inativo").length} equipamentos ativos · ${frota.falhas} falha${frota.falhas === 1 ? "" : "s"} no período · comparado ao período anterior`}
      />
      <div className="ceny-grid-4">
        <CartaoIndicador
          sigla="MTBF"
          titulo="Tempo médio entre falhas"
          valor={frota.falhas ? formatarHoras(frota.mtbf) : "Sem falhas"}
          detalhe={frota.falhas ? "da frota no período" : "nenhuma OS corretiva no período"}
          icone="activity"
          cor={C.blue}
          fundo={C.blueLight}
          variacao={variacao(frota.mtbf, anterior.frota.mtbf)}
          carregando={carregando}
        />
        <CartaoIndicador
          sigla="MTTF"
          titulo="Tempo médio até a falha"
          valor={frota.falhas ? formatarHoras(frota.mttf) : "Sem falhas"}
          detalhe={frota.falhas ? "tempo em operação por falha" : "nenhuma OS corretiva no período"}
          icone="zap"
          cor={C.purple}
          fundo={C.purpleLight}
          variacao={variacao(frota.mttf, anterior.frota.mttf)}
          carregando={carregando}
        />
        <CartaoIndicador
          sigla="MTTR"
          titulo="Tempo médio de reparo"
          valor={formatarHoras(frota.mttr)}
          detalhe={frota.reparos ? `${frota.reparos} reparo${frota.reparos === 1 ? "" : "s"} concluído${frota.reparos === 1 ? "" : "s"}` : "nenhuma OS corretiva concluída"}
          icone="clock"
          cor={C.amberDark}
          fundo={C.amberLight}
          variacao={variacao(frota.mttr, anterior.frota.mttr)}
          melhorQuandoSobe={false}
          carregando={carregando}
        />
        <CartaoIndicador
          sigla="DISPONIBILIDADE"
          titulo="Tempo em operação"
          valor={formatarPercentual(frota.disponibilidade)}
          detalhe={`${formatarHoras(frota.horasParado)} de parada por falha`}
          icone="power"
          cor={corDisponibilidade(frota.disponibilidade)}
          fundo={frota.disponibilidade === null || frota.disponibilidade >= 0.97 ? "#f0fdf4" : frota.disponibilidade >= 0.9 ? C.amberLight : C.redLight}
          variacao={variacao(frota.disponibilidade, anterior.frota.disponibilidade)}
          carregando={carregando}
        />
      </div>
      <ComoCalculamos />

      {/* Gestão da manutenção */}
      <TituloSecao titulo="Gestão da manutenção" descricao="Planejamento, backlog e custos no período selecionado." />
      <div className="ceny-grid-4">
        <CartaoIndicador
          titulo="Aderência ao plano preventivo"
          valor={formatarPercentual(aderencia?.percentual, 0)}
          detalhe={
            aderencia?.avaliadas
              ? `${aderencia.no_prazo} de ${aderencia.avaliadas} no prazo`
              : "sem preventivas com prazo encerrado"
          }
          icone="check"
          cor={C.green}
          fundo="#f0fdf4"
          carregando={carregando}
        />
        <CartaoIndicador
          titulo="Manutenção planejada"
          valor={formatarPercentual(gestao.percentualPlanejada, 0)}
          detalhe={`preventiva + preditiva de ${gestao.totalPeriodo} OS · meta ≥ 80%`}
          icone="calendar"
          cor={C.blue}
          fundo={C.blueLight}
          carregando={carregando}
        />
        <CartaoIndicador
          titulo="Backlog de OS"
          valor={String(gestao.backlog)}
          detalhe={
            gestao.backlog
              ? `${gestao.backlogCriticas} crítica${gestao.backlogCriticas === 1 ? "" : "s"} · idade média ${Math.round(gestao.idadeMediaBacklog)} dia${Math.round(gestao.idadeMediaBacklog) === 1 ? "" : "s"}`
              : "nenhuma OS em aberto"
          }
          icone="ticket"
          cor={gestao.backlogCriticas ? C.red : C.gray600}
          fundo={gestao.backlogCriticas ? C.redLight : C.gray100}
          carregando={carregando}
        />
        <CartaoIndicador
          titulo="Custo de manutenção"
          valor={formatarMoeda(gestao.custo.total)}
          detalhe={`${formatarMoeda(gestao.custo.corretiva)} em corretivas`}
          icone="layers"
          cor={C.gray700}
          fundo={C.gray100}
          carregando={carregando}
        />
      </div>

      {/* Gráficos */}
      <div className="ceny-stack-mobile" style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "1rem" }}>
        <Painel
          titulo="Ordens de serviço por tipo"
          subtitulo={`Abertas por ${relatorio.porPeriodo.unidade} · ${periodoLabel}`}
        >
          <ColunasEmpilhadas
            baldes={relatorio.porPeriodo.baldes}
            series={TIPOS_MANUTENCAO}
            unidade={relatorio.porPeriodo.unidade}
          />
        </Painel>
        <Painel titulo="Equipamentos com mais falhas" subtitulo={`OS corretivas · ${periodoLabel}`}>
          <BarrasHorizontais
            itens={topFalhas}
            cor="#d97706"
            formatar={(v) => `${v} falha${v === 1 ? "" : "s"}`}
            vazio="Nenhuma falha registrada no período."
            detalhe={(item) => (
              <>
                <div style={{ fontWeight: 650 }}>{item.titulo}</div>
                <div>MTBF {formatarHoras(item.linha.mtbf)} · MTTR {formatarHoras(item.linha.mttr)}</div>
                <div>Disponibilidade {formatarPercentual(item.linha.disponibilidade)}</div>
              </>
            )}
          />
        </Painel>
      </div>

      <div className="ceny-stack-mobile" style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "1rem" }}>
        <Painel titulo="Custo por tipo de manutenção" subtitulo={`OS concluídas · ${periodoLabel}`}>
          <BarrasHorizontais
            itens={TIPOS_MANUTENCAO.filter((t) => gestao.custo[t.valor] > 0).map((t) => ({
              chave: t.valor,
              label: t.label,
              valor: gestao.custo[t.valor],
            }))}
            cor={C.gray600}
            formatar={formatarMoeda}
            vazio="Nenhum custo registrado nas OS concluídas do período."
          />
        </Painel>
        <Painel titulo="Falhas por tipo de problema" subtitulo="Classificação da triagem por IA">
          <BarrasHorizontais
            itens={relatorio.porProblema.map((p) => ({ chave: p.tipo, label: p.label, valor: p.valor }))}
            cor={C.blue}
            formatar={(v) => {
              const total = relatorio.porProblema.reduce((s, p) => s + p.valor, 0);
              return `${v} · ${formatarPercentual(v / total, 0)}`;
            }}
            vazio="Nenhuma falha registrada no período."
          />
        </Painel>
      </div>

      <TabelaConfiabilidade linhas={atual.linhas} carregando={carregando} periodoLabel={periodoLabel} />

      {/* Machine Learning */}
      <TituloSecao
        titulo="Análise preditiva"
        descricao="Base de dados para os modelos de machine learning, a partir do histórico completo de OS."
      />
      <RelatoriosML historico={historico} carregando={carregando} />
    </div>
  );
}
