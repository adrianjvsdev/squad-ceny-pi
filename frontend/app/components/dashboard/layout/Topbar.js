"use client";

import { C } from "@/lib/constants";
import { Ico } from "../../ui";
import { CenyLogo } from "../../brand/CenyLogo";
import { iniciais } from "./Sidebar";

export const TOPBAR_HEIGHT = 64;

function dataHoje() {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function Topbar({
  pageLabel,
  sidebarOpen,
  onMenuToggle,
  onNotifToggle,
  notifOpen,
  notifications = [],
  profile,
  onLogout,
}) {
  const unreadCount = notifications.filter((n) => !n.lida).length;
  const displayName = profile?.nome || profile?.email || "Usuário";

  return (
    <header
      style={{
        height: TOPBAR_HEIGHT,
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "saturate(180%) blur(8px)",
        WebkitBackdropFilter: "saturate(180%) blur(8px)",
        borderBottom: `1px solid ${C.gray200}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 1.5rem 0 1rem",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {!sidebarOpen && (
          <>
            <button
              onClick={onMenuToggle}
              className="ceny-icon-btn"
              title="Abrir menu"
              aria-label="Abrir menu"
            >
              <Ico name="menu" size={18} />
            </button>
            <CenyLogo size={26} />
          </>
        )}
        <nav
          aria-label="Você está em"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.85rem",
            minWidth: 0,
            paddingLeft: sidebarOpen ? 8 : 2,
          }}
        >
          <span style={{ color: C.gray400, fontWeight: 500 }}>Ceny</span>
          <span style={{ color: C.gray300, display: "flex" }}>
            <Ico name="chevRight" size={14} />
          </span>
          <span
            style={{
              color: C.gray900,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pageLabel || "Dashboard"}
          </span>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          className="ceny-hide-mobile"
          style={{
            alignItems: "center",
            gap: 6,
            fontSize: "0.78rem",
            color: C.gray500,
            padding: "0 0.75rem",
            height: 32,
            borderRadius: 8,
            background: C.gray50,
            border: `1px solid ${C.gray100}`,
            marginRight: 6,
          }}
        >
          <Ico name="calendar" size={13} />
          {dataHoje()}
        </span>

        <button
          onClick={onNotifToggle}
          className="ceny-icon-btn"
          data-active={notifOpen}
          title="Notificações"
          aria-label={
            unreadCount > 0
              ? `Notificações (${unreadCount} não lidas)`
              : "Notificações"
          }
        >
          <Ico name="bell" size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 3,
                right: 2,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: C.red,
                color: C.white,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: "16px",
                textAlign: "center",
                border: `2px solid ${C.white}`,
                boxSizing: "content-box",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onLogout}
          className="ceny-icon-btn"
          title="Sair"
          aria-label="Sair"
        >
          <Ico name="logout" size={17} />
        </button>

        <span
          style={{ width: 1, height: 24, background: C.gray200, margin: "0 6px" }}
        />

        <span
          title={displayName}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.blue}, #5b8bff)`,
            color: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            boxShadow: `0 0 0 2px ${C.white}, 0 0 0 3px ${C.blueLight2}`,
          }}
        >
          {iniciais(displayName)}
        </span>
      </div>
    </header>
  );
}
