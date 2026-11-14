"use client";

import { C } from "@/lib/constants";
import { formatarHoras, formatarPercentual } from "@/lib/preventivas";
import { Ico } from "@/app/components/ui";

const cartao = {
  background: C.white,
  border: `1px solid ${C.gray200}`,
  borderRadius: 8,
  padding: "1rem 1.1rem",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  textAlign: "left",
};

// Cor da aderência: meta de referência de 85% (bom) e 70% (atenção).
function corAderencia(percentual) {
  if (percentual === null || percentual === undefined) return C.gray600;
  if (percentual >= 0.85) return C.green;
  if (percentual >= 0.7) return C.amber;
  return C.red;
}

function Cartao({ titulo, valor, cor, icone, detalhe, onClick, rotuloAcao }) {
  const conteudo = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: C.gray500 }}>
          {titulo.toUpperCase()}
        </span>
        <Ico name={icone} size={16} color={cor} />
      </div>
      <div style={{ fontSize: "1.9rem", fontWeight: 700, color: cor, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: "0.72rem", color: C.gray500, lineHeight: 1.4 }}>{detalhe}</div>
      {onClick && (
        <span style={{ fontSize: "0.72rem", color: C.blue, fontWeight: 600 }}>{rotuloAcao} →</span>
      )}
    </>
  );
  if (!onClick) return <div style={cartao}>{conteudo}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...cartao, cursor: "pointer", font: "inherit" }}
    >
      {conteudo}
    </button>
  );
}

export function IndicadoresPreventivas({ indicadores, onVerAtrasadas }) {
  if (!indicadores) return null;
  const { aderencia, manutencao_planejada: planejada } = indicadores;
  const periodo = `últimos ${indicadores.periodo_dias} dias`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "0.75rem",
      }}
    >
      <Cartao
        titulo="Aderência ao plano"
        valor={formatarPercentual(aderencia.percentual)}
        cor={corAderencia(aderencia.percentual)}
        icone="check"
        detalhe={
          aderencia.avaliadas
            ? `${aderencia.no_prazo} de ${aderencia.avaliadas} preventivas concluídas no prazo (até ${indicadores.tolerancia_dias} dias de tolerância) · ${periodo}`
            : `Ainda não há preventivas com prazo encerrado nos ${periodo}.`
        }
      />
      <Cartao
        titulo="Atrasadas"
        valor={indicadores.atrasadas}
        cor={indicadores.atrasadas ? C.red : C.green}
        icone="alert"
        detalhe={
          indicadores.atrasadas
            ? "Preventivas com a data vencida e ainda não concluídas."
            : "Nenhuma preventiva vencida em aberto."
        }
        onClick={indicadores.atrasadas ? onVerAtrasadas : undefined}
        rotuloAcao="Ver na agenda"
      />
      <Cartao
        titulo="Próximos 7 dias"
        valor={indicadores.proximos_7_dias}
        cor={C.blue}
        icone="calendar"
        detalhe="Preventivas previstas para esta semana, incluindo as OS já geradas."
      />
      <Cartao
        titulo="Preventiva x corretiva"
        valor={formatarPercentual(planejada.percentual_preventiva)}
        cor={C.purple}
        icone="chart"
        detalhe={`${planejada.preventivas} preventivas e ${planejada.corretivas} corretivas abertas · ${periodo}. Quanto maior, menos a manutenção é reativa.`}
      />
    </div>
  );
}

// Horas estimadas por técnico sugerido nas próximas 4 semanas.
export function CargaTecnicos({ carga }) {
  if (!carga?.length) return null;
  const maior = Math.max(...carga.map((linha) => linha.horas), 1);

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.gray200}`,
        borderRadius: 8,
        padding: "1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: C.gray900 }}>
          Carga das próximas 4 semanas
        </h3>
        <span style={{ fontSize: "0.72rem", color: C.gray400 }}>
          pela duração estimada dos planos
        </span>
      </div>
      {carga.map((linha) => (
        <div
          key={linha.id_tecnico ?? "sem"}
          style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr auto", gap: 10, alignItems: "center" }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: linha.id_tecnico ? C.gray700 : C.gray500,
              fontStyle: linha.id_tecnico ? "normal" : "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {linha.nome}
          </span>
          <div style={{ height: 8, background: C.gray100, borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(linha.horas / maior) * 100}%`,
                height: "100%",
                background: linha.id_tecnico ? C.blue : C.gray400,
                borderRadius: 4,
              }}
            />
          </div>
          <span style={{ fontSize: "0.75rem", color: C.gray600, whiteSpace: "nowrap" }}>
            {formatarHoras(linha.horas)} · {linha.ocorrencias}{" "}
            {linha.ocorrencias === 1 ? "preventiva" : "preventivas"}
            {linha.sem_estimativa ? ` (${linha.sem_estimativa} sem estimativa)` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
