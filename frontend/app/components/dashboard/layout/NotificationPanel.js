"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Badge, Ico } from "../../ui";

const TIPO_CONFIG = {
  os_aberta: { color: "blue", symbol: "i" },
  os_atualizada: { color: "amber", symbol: "↻" },
  os_concluida: { color: "green", symbol: "✓" },
  plano_vencendo: { color: "red", symbol: "⚠" },
};

function tipoColor(tipo) {
  return TIPO_CONFIG[tipo]?.color ?? "gray";
}
function tipoSymbol(tipo) {
  return TIPO_CONFIG[tipo]?.symbol ?? "i";
}

function formatTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d} dia${d > 1 ? "s" : ""} atrás`;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
}) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  if (!isOpen && !isClosing) return null;

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <div
      style={{
        position: "fixed",
        top: 52,
        right: 0,
        width: 360,
        height: "calc(100vh - 52px)",
        background: C.white,
        borderLeft: `1px solid ${C.gray200}`,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        willChange: "transform, opacity",
        animation: isClosing
          ? "slideOutRight 0.18s cubic-bezier(0.55, 0, 1, 0.45) forwards"
          : "slideInRight 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
      `}</style>

      {/* ── Cabeçalho ── */}
      <div
        style={{
          padding: "1rem",
          borderBottom: `1px solid ${C.gray200}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: C.gray900,
            }}
          >
            Notificações
          </h3>
          <span style={{ fontSize: 12, color: C.gray400 }}>
            {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            style={{
              border: "none",
              background: "none",
              cursor: unreadCount === 0 ? "default" : "pointer",
              fontSize: 12,
              color: unreadCount === 0 ? C.gray300 : C.blue,
              transition: "color 0.15s",
            }}
          >
            Marcar todas
          </button>
          <button
            onClick={handleClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: C.gray400,
              display: "flex",
            }}
          >
            <Ico name="x" size={16} />
          </button>
        </div>
      </div>

      {/* ── Lista ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: C.gray400,
              marginTop: "2.5rem",
              fontSize: "0.82rem",
            }}
          >
            Nenhuma notificação
          </p>
        )}

        {notifications.map((n) => (
          <div
            key={n.id_notificacao}
            onClick={() => !n.lida && onMarkRead(n.id_notificacao)}
            style={{
              padding: "0.85rem 1rem",
              borderBottom: `1px solid ${C.gray100}`,
              background: n.lida ? C.white : C.blueLight,
              cursor: n.lida ? "default" : "pointer",
              display: "flex",
              gap: 12,
              transition: "background 0.15s",
            }}
          >
            {/* Bolinha */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: n.lida ? "transparent" : C.blue,
                marginTop: 6,
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                {/* titulo vindo direto do banco */}
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: C.gray800,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {n.titulo}
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <Badge color={tipoColor(n.tipo)}>{tipoSymbol(n.tipo)}</Badge>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id_notificacao);
                    }}
                    title="Excluir"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: C.gray400,
                      display: "flex",
                      alignItems: "center",
                      padding: 2,
                      borderRadius: 3,
                      lineHeight: 1,
                    }}
                  >
                    <Ico name="x" size={13} />
                  </button>
                </div>
              </div>

              {/* mensagem vindo direto do banco */}
              {n.mensagem && (
                <p
                  style={{
                    margin: "2px 0 4px",
                    fontSize: "0.78rem",
                    color: C.gray500,
                  }}
                >
                  {n.mensagem}
                </p>
              )}

              <span style={{ fontSize: "0.72rem", color: C.gray400 }}>
                {formatTime(n.timestamp_envio)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
