"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { C, font } from "@/lib/constants";
import { formatarData, hojeISO, somarDias } from "@/lib/datas";
import { listEquipamentos } from "@/lib/equipamentos";
import { parseApiError } from "@/lib/erros";
import {
  excluirPlano,
  executarPlanoAgora,
  getAgenda,
  getIndicadores,
  listPlanos,
  pausarPlano,
  pularProximaExecucao,
  retomarPlano,
} from "@/lib/planosManutencao";
import { SITUACAO_PLANO } from "@/lib/preventivas";
import { getSetores } from "@/lib/setores";
import { getUsuarioSetores } from "@/lib/usuarios";
import { Btn, Input, Select } from "@/app/components/ui";
import { AgendarManutencaoModal } from "../AgendarManutencaoModal";
import { ConfirmarAcaoModal } from "../ConfirmarAcaoModal";
import { AgendaPreventivas } from "../preventivas/AgendaPreventivas";
import { DetalhePlanoModal } from "../preventivas/DetalhePlanoModal";
import { CargaTecnicos, IndicadoresPreventivas } from "../preventivas/IndicadoresPreventivas";
import { PlanosPreventivas } from "../preventivas/PlanosPreventivas";

// A agenda busca também os últimos 90 dias, para mostrar as atrasadas e,
// sob demanda, o histórico recente.
const DIAS_PASSADOS_AGENDA = 90;
const JANELAS = [
  { dias: 28, label: "Próximas 4 semanas" },
  { dias: 90, label: "Próximos 3 meses" },
];
// Ordem da lista de planos: o que pede ação primeiro.
const ORDEM_SITUACAO = [
  "atrasado",
  "os_em_aberto",
  "vence_em_breve",
  "em_dia",
  "pausado",
  "equipamento_inativo",
];

function contem(texto, busca) {
  return String(texto ?? "").toLowerCase().includes(busca);
}

function Alerta({ tipo, children, onFechar }) {
  const erro = tipo === "erro";
  return (
    <div
      role={erro ? "alert" : "status"}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "0.7rem 1rem",
        background: erro ? C.redLight : C.greenLight,
        border: `1px solid ${erro ? C.red : C.green}`,
        borderRadius: 6,
        color: erro ? C.redDark : C.greenDark,
        fontSize: "0.8rem",
      }}
    >
      <span>{children}</span>
      {onFechar && (
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar aviso"
          style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontSize: "1rem" }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function Alternador({ opcoes, valor, onChange, rotulo }) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      style={{ display: "inline-flex", border: `1px solid ${C.gray300}`, borderRadius: 6, overflow: "hidden" }}
    >
      {opcoes.map(([chave, label]) => {
        const ativo = valor === chave;
        return (
          <button
            key={chave}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(chave)}
            style={{
              padding: "0.45rem 0.95rem",
              border: "none",
              background: ativo ? C.blue : C.white,
              color: ativo ? C.white : C.gray600,
              fontWeight: 600,
              fontSize: "0.8rem",
              fontFamily: font,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: C.gray600, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function PreventivasPage({ userType }) {
  const isAdmin = userType === "admin";
  const hoje = hojeISO();

  // ─── Filtros e visão ────────────────────────────────────────────────────
  const [visao, setVisao] = useState("agenda");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [somenteMinhas, setSomenteMinhas] = useState(false);
  const [janela, setJanela] = useState(JANELAS[0].dias);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");

  // ─── Dados ──────────────────────────────────────────────────────────────
  const [indicadores, setIndicadores] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [setores, setSetores] = useState([]);

  // ─── Modais e feedback ──────────────────────────────────────────────────
  const [agendar, setAgendar] = useState({ open: false, plano: null });
  const [planoDetalhe, setPlanoDetalhe] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { acao, plano }
  const [processandoId, setProcessandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const timerAviso = useRef(null);
  const ultimaRequisicao = useRef(0);

  const carregarRecursos = useCallback(async () => {
    try {
      const [equipamentosData, setoresData, vinculos = []] = await Promise.all([
        listEquipamentos(),
        getSetores(),
        ...(isAdmin ? [getUsuarioSetores()] : []),
      ]);
      setEquipamentos(equipamentosData);
      setSetores(setoresData);
      setTecnicos(vinculos);
    } catch (e) {
      setErro(parseApiError(e, "Não foi possível carregar equipamentos e setores."));
    }
  }, [isAdmin]);

  const carregarDados = useCallback(async () => {
    const requisicao = ++ultimaRequisicao.current;
    const filtros = {
      id_setor: filtroSetor,
      tecnico: somenteMinhas ? "me" : undefined,
    };
    const dataHoje = hojeISO();
    setCarregando(true);
    setErro(null);
    try {
      const [indicadoresData, planosData, agendaData] = await Promise.all([
        getIndicadores(filtros),
        listPlanos(filtros),
        getAgenda({
          ...filtros,
          inicio: somarDias(dataHoje, -DIAS_PASSADOS_AGENDA),
          fim: somarDias(dataHoje, janela),
        }),
      ]);
      // Ignora respostas de filtros que já foram trocados.
      if (requisicao !== ultimaRequisicao.current) return;
      setIndicadores(indicadoresData);
      setPlanos(planosData);
      setAgenda(agendaData);
    } catch (e) {
      if (requisicao !== ultimaRequisicao.current) return;
      setErro(parseApiError(e, "Não foi possível carregar as preventivas."));
    } finally {
      if (requisicao === ultimaRequisicao.current) setCarregando(false);
    }
  }, [filtroSetor, somenteMinhas, janela]);

  useEffect(() => {
    carregarRecursos();
  }, [carregarRecursos]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => () => clearTimeout(timerAviso.current), []);

  function mostrarAviso(texto) {
    clearTimeout(timerAviso.current);
    setAviso(texto);
    timerAviso.current = setTimeout(() => setAviso(null), 6000);
  }

  // ─── Ações ──────────────────────────────────────────────────────────────

  async function alternarPausa(plano) {
    setProcessandoId(plano.id_plano);
    setErro(null);
    try {
      if (plano.ativo) {
        await pausarPlano(plano.id_plano);
        mostrarAviso(`Plano pausado: ${plano.equipamento_tag} não gera mais OS automática até ser retomado.`);
      } else {
        const retomado = await retomarPlano(plano.id_plano);
        mostrarAviso(`Plano retomado. Próxima execução em ${formatarData(retomado.proxima_execucao)}.`);
      }
      await carregarDados();
    } catch (e) {
      setErro(parseApiError(e, "Não foi possível alterar o plano."));
    } finally {
      setProcessandoId(null);
    }
  }

  async function confirmarAcao() {
    const { acao, plano } = confirmacao;
    if (acao === "executar") {
      const resposta = await executarPlanoAgora(plano.id_plano);
      mostrarAviso(resposta.detail);
    } else if (acao === "pular") {
      const atualizado = await pularProximaExecucao(plano.id_plano);
      mostrarAviso(`Execução pulada. Próxima em ${formatarData(atualizado.proxima_execucao)}.`);
    } else if (acao === "excluir") {
      await excluirPlano(plano.id_plano);
      mostrarAviso("Plano excluído. As OS já geradas continuam em Chamados.");
    }
    await carregarDados();
  }

  function aoSalvarPlano(salvo) {
    const editando = Boolean(agendar.plano);
    setAgendar({ open: false, plano: null });
    mostrarAviso(
      editando
        ? "Plano atualizado."
        : `Manutenção agendada para ${salvo.equipamento_tag}. Primeira execução em ${formatarData(salvo.proxima_execucao)}.`,
    );
    carregarDados();
  }

  const acoes = {
    abrir: setPlanoDetalhe,
    editar: (plano) => setAgendar({ open: true, plano }),
    pausar: alternarPausa,
    retomar: alternarPausa,
    executar: (plano) => setConfirmacao({ acao: "executar", plano }),
    pular: (plano) => setConfirmacao({ acao: "pular", plano }),
    excluir: (plano) => setConfirmacao({ acao: "excluir", plano }),
  };

  // ─── Filtros locais ─────────────────────────────────────────────────────

  const termo = busca.trim().toLowerCase();
  const casaBusca = (item) =>
    !termo ||
    contem(item.equipamento_tag, termo) ||
    contem(item.equipamento_nome, termo) ||
    contem(item.descricao, termo);

  const planosVisiveis = planos
    .filter((p) => casaBusca(p) && (!filtroSituacao || p.situacao === filtroSituacao))
    .sort(
      (a, b) =>
        ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao) ||
        a.proxima_execucao.localeCompare(b.proxima_execucao),
    );
  const agendaVisivel = agenda.filter(casaBusca);

  const textoConfirmacao = confirmacao && {
    executar: {
      titulo: "Gerar a OS agora?",
      rotulo: "Gerar OS",
      variante: "primary",
      corpo: (
        <>
          A OS preventiva de <strong>{confirmacao.plano.equipamento_tag}</strong> é criada agora e fica
          aguardando aprovação em Chamados. O calendário do plano avança para a execução seguinte.
        </>
      ),
    },
    pular: {
      titulo: "Pular a próxima execução?",
      rotulo: "Pular",
      variante: "primary",
      corpo: (
        <>
          A execução de <strong>{formatarData(confirmacao.plano.proxima_execucao)}</strong> fica registrada como
          pulada pelo administrador (não conta na aderência) e a próxima passa para{" "}
          <strong>
            {formatarData(somarDias(confirmacao.plano.proxima_execucao, confirmacao.plano.periodicidade_dias))}
          </strong>
          .
        </>
      ),
    },
    excluir: {
      titulo: "Excluir o plano?",
      rotulo: "Excluir",
      variante: "danger",
      corpo: (
        <>
          O plano <strong>{confirmacao.plano.descricao}</strong> e o histórico de execuções dele serão apagados.
          As OS já geradas continuam em Chamados. Para só interromper o plano, use <strong>Pausar</strong>.
        </>
      ),
    },
  }[confirmacao.acao];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.gray900 }}>
            Manutenções Preventivas
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}>
            {isAdmin
              ? "Planeje as preventivas, acompanhe o que vence e meça se o plano está sendo cumprido."
              : "Acompanhe as preventivas dos seus setores. Só administradores agendam e alteram planos."}
          </p>
        </div>
        {isAdmin && (
          <Btn icon="calendar" onClick={() => setAgendar({ open: true, plano: null })}>
            Agendar manutenção
          </Btn>
        )}
      </div>

      {aviso && (
        <Alerta tipo="sucesso" onFechar={() => setAviso(null)}>
          {aviso}
        </Alerta>
      )}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <IndicadoresPreventivas
        indicadores={indicadores}
        onVerAtrasadas={() => {
          setVisao("agenda");
          setFiltroSituacao("");
        }}
      />
      {isAdmin && <CargaTecnicos carga={indicadores?.carga_tecnicos} />}

      {/* Barra de visão e filtros */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <Alternador
          rotulo="Visão"
          valor={visao}
          onChange={setVisao}
          opcoes={[
            ["agenda", "Agenda"],
            ["planos", `Planos (${planos.length})`],
          ]}
        />
        <div style={{ minWidth: 180 }}>
          <Select label="Setor" value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s.id_setor} value={String(s.id_setor)}>
                {s.nome}
              </option>
            ))}
          </Select>
        </div>
        {visao === "agenda" ? (
          <div style={{ minWidth: 180 }}>
            <Select label="Período" value={String(janela)} onChange={(e) => setJanela(Number(e.target.value))}>
              {JANELAS.map((j) => (
                <option key={j.dias} value={String(j.dias)}>
                  {j.label}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div style={{ minWidth: 180 }}>
            <Select label="Situação" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
              <option value="">Todas</option>
              {ORDEM_SITUACAO.map((s) => (
                <option key={s} value={s}>
                  {SITUACAO_PLANO[s].label}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            label="Buscar"
            placeholder="TAG, equipamento ou descrição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: -8 }}>
        {userType === "tecnico" && (
          <Checkbox checked={somenteMinhas} onChange={setSomenteMinhas}>
            Só as preventivas em que sou o técnico sugerido
          </Checkbox>
        )}
        {visao === "agenda" && (
          <Checkbox checked={mostrarHistorico} onChange={setMostrarHistorico}>
            Mostrar também as concluídas e puladas (últimos {DIAS_PASSADOS_AGENDA} dias)
          </Checkbox>
        )}
      </div>

      {carregando && !indicadores ? (
        <div style={{ color: C.gray500, fontSize: "0.85rem" }}>Carregando preventivas...</div>
      ) : visao === "agenda" ? (
        <AgendaPreventivas
          itens={agendaVisivel}
          hoje={hoje}
          mostrarHistorico={mostrarHistorico}
          onAbrirPlano={(idPlano) => setPlanoDetalhe(planos.find((p) => p.id_plano === idPlano) ?? null)}
        />
      ) : (
        <PlanosPreventivas
          planos={planosVisiveis}
          hoje={hoje}
          isAdmin={isAdmin}
          processandoId={processandoId}
          acoes={acoes}
        />
      )}

      <AgendarManutencaoModal
        open={agendar.open}
        plano={agendar.plano}
        equipamentos={equipamentos}
        tecnicos={tecnicos}
        onClose={() => setAgendar({ open: false, plano: null })}
        onSalvo={aoSalvarPlano}
      />

      <DetalhePlanoModal
        plano={planoDetalhe}
        onClose={() => setPlanoDetalhe(null)}
        onEditar={
          isAdmin
            ? (plano) => {
                setPlanoDetalhe(null);
                setAgendar({ open: true, plano });
              }
            : undefined
        }
      />

      <ConfirmarAcaoModal
        open={Boolean(confirmacao)}
        onClose={() => setConfirmacao(null)}
        titulo={textoConfirmacao?.titulo}
        rotuloConfirmar={textoConfirmacao?.rotulo}
        variante={textoConfirmacao?.variante}
        onConfirmar={confirmarAcao}
      >
        {textoConfirmacao?.corpo}
      </ConfirmarAcaoModal>
    </div>
  );
}
