"use client";

import { useState } from "react";
import { C } from "@/lib/constants";
import { Badge, Ico } from "@/app/components/ui";
import { mockNotifications } from "@/lib/constants";

export function NotificationPanel({ onClose }) {
  const [notifs, setNotifs] = useState(mockNotifications);
  const markAll = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  const typeColor = (t) =>
    t === "alert" ? "red" : t === "success" ? "green" : "blue";

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
        animation: "slideInRight 0.2s ease",
      }}
    >
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

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
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: C.gray900 }}>
            Notificações
          </h3>
          <span style={{ fontSize: 12, color: C.gray400 }}>
            {notifs.filter((n) => !n.read).length} não lidas
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={markAll}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: C.blue }}
          >
            Marcar todas
          </button>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: C.gray400, display: "flex" }}
          >
            <Ico name="x" size={16} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifs.map((n) => (
          <div
            key={n.id}
            onClick={() =>
              setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
            }
            style={{
              padding: "0.85rem 1rem",
              borderBottom: `1px solid ${C.gray100}`,
              background: n.read ? C.white : C.blueLight,
              cursor: "pointer",
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: n.read ? "transparent" : C.blue,
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.gray800 }}>
                  {n.title}
                </span>
                <Badge color={typeColor(n.type)}>
                  {n.type === "alert" ? "⚠" : n.type === "success" ? "✓" : "i"}
                </Badge>
              </div>
              <p style={{ margin: "2px 0 4px", fontSize: "0.78rem", color: C.gray500 }}>{n.desc}</p>
              <span style={{ fontSize: "0.72rem", color: C.gray400 }}>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}