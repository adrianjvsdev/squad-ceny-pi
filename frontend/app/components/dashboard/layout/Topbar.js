"use client";

import { C } from "@/lib/constants";
import { Ico } from "../../ui";

export function Topbar({
  pageLabel,
  onMenuToggle,
  onNotifToggle,
  notifOpen,
  notifications = [],
  onLogout,
}) {
  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <header
      style={{
        height: 52,
        background: C.white,
        borderBottom: `1px solid ${C.gray200}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onMenuToggle}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: "0.4rem",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "block",
                width: 18,
                height: 2,
                background: C.gray700,
                borderRadius: 2,
              }}
            />
          ))}
        </button>
        <span
          style={{ fontSize: "0.88rem", fontWeight: 600, color: C.gray900 }}
        >
          {pageLabel || "Dashboard"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[
          { icon: "bell", action: onNotifToggle, label: "Notificações" },
          { icon: "logout", action: onLogout, label: "Sair" },
        ].map(({ icon, action, label }, i) => (
          <button
            key={i}
            onClick={action}
            title={label}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              border: "none",
              background: "none",
              color: C.gray500,
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <Ico name={icon} size={17} />
            {icon === "bell" && unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: C.red,
                  border: `2px solid ${C.white}`,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </header>
  );
}
