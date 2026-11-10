"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { parseApiError } from "@/lib/erros";
import { Btn, Modal } from "@/app/components/ui";

// Confirmação de ação com efeito (no lugar do confirm() do navegador): mostra
// o que vai acontecer, trava enquanto processa e exibe o erro da API.
// onConfirmar: função async; se lançar, o erro aparece e o modal continua aberto.
export function ConfirmarAcaoModal({
  open,
  onClose,
  titulo,
  children,
  rotuloConfirmar = "Confirmar",
  variante = "primary",
  onConfirmar,
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  function fechar() {
    setErro(null);
    onClose();
  }

  async function confirmar() {
    setProcessando(true);
    setErro(null);
    try {
      await onConfirmar();
      onClose();
    } catch (e) {
      setErro(parseApiError(e, "Não foi possível concluir a ação. Tente novamente."));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={titulo}
      width={440}
      bloquearFechamento={processando}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.85rem", color: C.gray700, lineHeight: 1.5 }}>
          {children}
        </div>
        {erro && (
          <div
            role="alert"
            style={{
              padding: "0.6rem 0.8rem",
              background: C.redLight,
              border: `1px solid ${C.red}`,
              borderRadius: 6,
              color: C.redDark,
              fontSize: "0.8rem",
            }}
          >
            {erro}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={fechar} disabled={processando}>
            Cancelar
          </Btn>
          <Btn variant={variante} onClick={confirmar} disabled={processando}>
            {processando ? "Processando..." : rotuloConfirmar}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
