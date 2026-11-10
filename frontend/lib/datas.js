// Datas "só dia" (AAAA-MM-DD) vindas de DateField do backend.
//
// new Date("2026-10-20") interpreta a string como meia-noite UTC, o que no
// Brasil vira 19/10 às 21h — por isso essas datas aparecem um dia antes se
// formatadas direto. Aqui elas são sempre tratadas como data local.

const SO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

// "AAAA-MM-DD" → Date local à meia-noite; datetime ISO → Date normal.
export function parseData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (SO_DIA.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(valor, vazio = "—") {
  const data = parseData(valor);
  return data ? data.toLocaleDateString("pt-BR") : vazio;
}

// Date → "AAAA-MM-DD" no fuso local.
export function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function hojeISO() {
  return paraISO(new Date());
}

export function somarDias(valor, dias) {
  const data = parseData(valor);
  return paraISO(new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias));
}

// Dias de `de` até `ate` (negativo se `ate` já passou). Arredonda para
// absorver a hora a mais/a menos do horário de verão.
export function diasEntre(de, ate) {
  const inicio = parseData(de);
  const fim = parseData(ate);
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((b - a) / DIA_MS);
}

export function diasAte(valor, hoje = hojeISO()) {
  return diasEntre(hoje, valor);
}

// "hoje", "amanhã", "ontem", "em 5 dias", "há 3 dias".
export function descreverPrazo(dias) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`;
}

// Mesma regra de manutencao/services.py::proximas_datas: a série
// primeira + k × periodicidade é ancorada na primeira data.
export function proximasDatas(primeira, periodicidade, quantidade, aPartirDe = primeira) {
  if (!primeira || !(periodicidade > 0) || !(quantidade > 0)) return [];
  const atraso = diasEntre(primeira, aPartirDe);
  const saltos = atraso > 0 ? Math.ceil(atraso / periodicidade) : 0;
  return Array.from({ length: quantidade }, (_, i) =>
    somarDias(primeira, (saltos + i) * periodicidade),
  );
}
