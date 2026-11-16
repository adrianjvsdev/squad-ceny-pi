"use client";

import { useEffect, useState } from "react";
import { C } from "@/lib/constants";
import { formatarData } from "@/lib/datas";
import { parseApiError } from "@/lib/erros";
import { listPlanos } from "@/lib/planosManutencao";
import { descreverPeriodicidade, SITUACAO_PLANO } from "@/lib/preventivas";
import { Badge, Btn } from "@/app/components/ui";

// Seção "Manutenções agendadas" do detalhe do equipamento no Inventário.
// Para recarregar depois de salvar, quem usa troca a `key` do componente.
export function PlanosDoEquipamento({ idEquipamento, podeAgendar, onAgendar, onEditar }) {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    listPlanos({ id_equipamento: idEquipamento })
      .then((dados) => ativo && setPlanos(dados))
      .catch((e) => ativo && setErro(parseApiError(e, "Não foi possível carregar os agendamentos.")))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [idEquipamento]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: C.gray400, letterSpacing: "0.05em" }}>
          MANUTENÇÕES AGENDADAS
        </span>
        {onAgendar && (
          <Btn
            size="sm"
            variant="secondary"
            icon="calendar"
            onClick={onAgendar}
            disabled={!podeAgendar}
            title={podeAgendar ? undefined : "Equipamento inativo não gera OS automática"}
          >
            Agendar
          </Btn>
        )}
      </div>

      {carregando ? (
        <span style={{ fontSize: "0.8rem", color: C.gray500 }}>Carregando...</span>
      ) : erro ? (
        <span style={{ fontSize: "0.8rem", color: C.redDark }}>{erro}</span>
      ) : !planos.length ? (
        <span style={{ fontSize: "0.8rem", color: C.gray500 }}>
          Nenhuma manutenção preventiva agendada para este equipamento.
        </span>
      ) : (
        planos.map((plano) => {
          const situacao = SITUACAO_PLANO[plano.situacao] ?? { label: plano.situacao, cor: "gray" };
          return (
            <div
              key={plano.id_plano}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0.6rem 0.8rem",
                background: C.gray50,
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", color: C.gray800, fontWeight: 500 }}>{plano.descricao}</div>
                <div style={{ fontSize: "0.72rem", color: C.gray500 }}>
                  {descreverPeriodicidade(plano.periodicidade_dias)} · próxima em{" "}
                  {formatarData(plano.proxima_execucao)}
                  {plano.tecnico_nome ? ` · ${plano.tecnico_nome}` : ""}
                </div>
              </div>
              <Badge color={situacao.cor}>{situacao.label}</Badge>
              {onEditar && (
                <Btn
                  size="sm"
                  variant="ghost"
                  icon="edit"
                  onClick={() => onEditar(plano)}
                  title="Editar agendamento"
                  aria-label={`Editar agendamento: ${plano.descricao}`}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
