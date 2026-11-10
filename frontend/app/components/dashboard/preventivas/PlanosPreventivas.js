"use client";

import { C } from "@/lib/constants";
import { descreverPrazo, diasAte, formatarData } from "@/lib/datas";
import { descreverPeriodicidade, SITUACAO_PLANO } from "@/lib/preventivas";
import { Badge, Btn } from "@/app/components/ui";

const th = {
  padding: "0.6rem 0.9rem",
  textAlign: "left",
  color: C.gray500,
  fontWeight: 600,
  fontSize: "0.7rem",
  letterSpacing: "0.05em",
  borderBottom: `1px solid ${C.gray200}`,
  whiteSpace: "nowrap",
};
const td = { padding: "0.7rem 0.9rem", verticalAlign: "top" };

function BotaoIcone({ icone, rotulo, onClick, disabled, variante = "ghost" }) {
  return (
    <Btn
      variant={variante}
      size="sm"
      icon={icone}
      onClick={onClick}
      disabled={disabled}
      title={rotulo}
      aria-label={rotulo}
      style={{ padding: "0.35rem 0.5rem" }}
    />
  );
}

// acoes: { abrir, editar, pausar, retomar, executar, pular, excluir } (planos => void)
export function PlanosPreventivas({ planos, hoje, isAdmin, processandoId, acoes }) {
  if (!planos.length) {
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
        Nenhum plano encontrado com esses filtros.
      </div>
    );
  }

  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr style={{ background: C.gray50 }}>
            {["Equipamento", "O que é feito", "Próxima", "Técnico", "Situação", "Ações"].map((h) => (
              <th key={h} style={th}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planos.map((plano) => {
            const situacao = SITUACAO_PLANO[plano.situacao] ?? { label: plano.situacao, cor: "gray" };
            const ocupado = processandoId === plano.id_plano;
            const automatico = plano.ativo && plano.situacao !== "equipamento_inativo";
            return (
              <tr key={plano.id_plano} style={{ borderTop: `1px solid ${C.gray100}` }}>
                <td style={td}>
                  <div style={{ fontWeight: 600, color: C.blue }}>{plano.equipamento_tag}</div>
                  <div style={{ color: C.gray600 }}>{plano.equipamento_nome}</div>
                  <div style={{ color: C.gray400, fontSize: "0.72rem" }}>{plano.setor_nome ?? "—"}</div>
                </td>
                <td style={{ ...td, maxWidth: 320 }}>
                  <div style={{ color: C.gray800 }}>{plano.descricao}</div>
                  <div style={{ color: C.gray400, fontSize: "0.72rem" }}>
                    {descreverPeriodicidade(plano.periodicidade_dias)}
                    {plano.dias_antecedencia
                      ? ` · OS ${plano.dias_antecedencia} dia(s) antes`
                      : ""}
                    {plano.ultima_manutencao
                      ? ` · última em ${formatarData(plano.ultima_manutencao)}`
                      : ""}
                  </div>
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <div style={{ color: C.gray800 }}>{formatarData(plano.proxima_execucao)}</div>
                  {automatico && (
                    <div style={{ color: C.gray400, fontSize: "0.72rem" }}>
                      {descreverPrazo(diasAte(plano.proxima_execucao, hoje))}
                    </div>
                  )}
                </td>
                <td style={{ ...td, color: plano.tecnico_nome ? C.gray700 : C.gray400 }}>
                  {plano.tecnico_nome ?? "—"}
                </td>
                <td style={td}>
                  <Badge color={situacao.cor}>{situacao.label}</Badge>
                  {plano.id_os_em_aberto && (
                    <div style={{ color: C.gray500, fontSize: "0.72rem", marginTop: 4 }}>
                      OS #{plano.id_os_em_aberto}
                    </div>
                  )}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <BotaoIcone icone="eye" rotulo="Ver plano e histórico" onClick={() => acoes.abrir(plano)} />
                    {isAdmin && (
                      <>
                        <BotaoIcone icone="edit" rotulo="Editar" onClick={() => acoes.editar(plano)} disabled={ocupado} />
                        {plano.ativo ? (
                          <BotaoIcone icone="pause" rotulo="Pausar" onClick={() => acoes.pausar(plano)} disabled={ocupado} />
                        ) : (
                          <BotaoIcone icone="play" rotulo="Retomar" onClick={() => acoes.retomar(plano)} disabled={ocupado} />
                        )}
                        <BotaoIcone
                          icone="zap"
                          rotulo={
                            plano.id_os_em_aberto
                              ? `Já existe a OS #${plano.id_os_em_aberto} em aberto`
                              : "Gerar a OS agora"
                          }
                          onClick={() => acoes.executar(plano)}
                          disabled={ocupado || !automatico || Boolean(plano.id_os_em_aberto)}
                        />
                        <BotaoIcone
                          icone="skip"
                          rotulo="Pular a próxima execução"
                          onClick={() => acoes.pular(plano)}
                          disabled={ocupado}
                        />
                        <BotaoIcone icone="trash" rotulo="Excluir" onClick={() => acoes.excluir(plano)} disabled={ocupado} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
