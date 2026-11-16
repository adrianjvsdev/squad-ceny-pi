"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Ico } from "../../ui";
import { TOPBAR_HEIGHT } from "./Topbar";

const TIPO_CONFIG = {
  os_aberta: { icon: "ticket", bg: C.blueLight, fg: C.blue },
  os_atualizada: { icon: "activity", bg: C.amberLight, fg: "#d97706" },
  os_concluida: { icon: "check", bg: "#f0fdf4", fg: C.green },
  plano_vencendo: { icon: "alert", bg: C.redLight, fg: C.red },
};

function tipoConfig(tipo) {
  return TIPO_CONFIG[tipo] ?? { icon: "info", bg: C.gray100, fg: C.gray500 };
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
        top: TOPBAR_HEIGHT,
        right: 0,
        width: 380,
        maxWidth: "100vw",
        height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
        background: C.white,
        borderLeft: `1px solid ${C.gray200}`,
        boxShadow: "-12px 0 32px -12px rgba(15, 23, 42, 0.18)",
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
          padding: "1rem 1.1rem",
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
              fontSize: "0.95rem",
              fontWeight: 700,
              color: C.gray900,
              letterSpacing: "-0.01em",
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
              background: unreadCount === 0 ? "none" : C.blueLight,
              cursor: unreadCount === 0 ? "default" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              padding: "0.35rem 0.65rem",
              borderRadius: 6,
              color: unreadCount === 0 ? C.gray300 : C.blue,
              transition: "color 0.15s",
            }}
          >
            Marcar todas
          </button>
          <button
            onClick={handleClose}
            className="ceny-icon-btn"
            aria-label="Fechar notificações"
            style={{ width: 30, height: 30, color: C.gray400 }}
          >
            <Ico name="x" size={16} />
          </button>
        </div>
      </div>

      {/* ── Lista ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              marginTop: "3.5rem",
              color: C.gray400,
              fontSize: "0.85rem",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: C.gray50,
                border: `1px solid ${C.gray200}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ico name="bell" size={20} />
            </span>
            Tudo em dia por aqui
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id_notificacao}
            onClick={() => !n.lida && onMarkRead(n.id_notificacao)}
            style={{
              padding: "0.9rem 1.1rem",
              borderBottom: `1px solid ${C.gray100}`,
              background: n.lida ? C.white : "#f7f9ff",
              cursor: n.lida ? "default" : "pointer",
              display: "flex",
              gap: 12,
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            {/* Indicador de não lida */}
            {!n.lida && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: C.blue,
                }}
              />
            )}
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: tipoConfig(n.tipo).bg,
                color: tipoConfig(n.tipo).fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ico name={tipoConfig(n.tipo).icon} size={15} />
            </span>

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
                    fontSize: "0.83rem",
                    fontWeight: n.lida ? 500 : 650,
                    color: C.gray900,
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id_notificacao);
                    }}
                    title="Excluir"
                    aria-label="Excluir notificação"
                    className="ceny-icon-btn"
                    style={{ width: 24, height: 24, color: C.gray400 }}
                  >
                    <Ico name="x" size={13} />
                  </button>
                </div>
              </div>

              {/* mensagem vindo direto do banco */}
              {n.mensagem && (
                <p
                  style={{
                    margin: "2px 0 6px",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
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
