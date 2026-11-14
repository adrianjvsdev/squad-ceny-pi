"use client";

import { C } from "@/lib/constants";
import { descreverPrazo, diasAte, formatarData } from "@/lib/datas";
import { Badge } from "@/app/components/ui";

const DIAS_EM_BREVE = 7;

// Data da próxima manutenção com destaque: Atrasada (vermelho), Hoje e
// "em N dias" até uma semana (âmbar). Equipamento inativo mostra só a data.
export function PrazoManutencao({ iso, inativo = false }) {
  if (!iso) return <span style={{ color: C.gray300, fontSize: "0.72rem" }}>—</span>;

  const dias = diasAte(iso);
  const destaque =
    inativo || dias > DIAS_EM_BREVE
      ? null
      : dias < 0
        ? { cor: "red", texto: "Atrasada" }
        : { cor: "amber", texto: dias === 0 ? "Hoje" : descreverPrazo(dias) };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
      <span style={{ color: C.gray500, fontSize: "0.75rem" }}>{formatarData(iso)}</span>
      {destaque && <Badge color={destaque.cor}>{destaque.texto}</Badge>}
    </div>
  );
}
