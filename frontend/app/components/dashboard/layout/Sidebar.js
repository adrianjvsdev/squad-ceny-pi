"use client";

import { C } from "@/lib/constants";
import { Ico } from "../../ui";
import { PERFIL_LABELS } from "@/lib/auth";
import { useState } from "react";

export function Sidebar({
  isOpen, // 👈 prop nova
  menu,
  page,
  perfil,
  profile,
  onNavigate,
  onLogout,
  onToggle,
}) {
  const [isClosing, setIsClosing] = useState(false); // 👈 estado novo

  const handleToggle = () => {
    // 👈 função nova
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onToggle();
    }, 180);
  };

  const perfilLabel = PERFIL_LABELS[perfil] ?? "USUÁRIO";
  const displayName = profile?.nome || profile?.email || "Usuário";

  if (!isOpen && !isClosing) return null; // 👈 controle de montagem

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: C.white,
        borderRight: `1px solid ${C.gray200}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        willChange: "transform, opacity",
        animation: isClosing
          ? "slideOutLeft 0.18s cubic-bezier(0.55, 0, 1, 0.45) forwards"
          : "slideInLeft 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
      }}
    >
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0);     opacity: 1; }
          to   { transform: translateX(-100%); opacity: 0; }
        }
      `}</style>

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "1rem",
          borderBottom: `1px solid ${C.gray200}`,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: C.blue,
            color: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          S
        </span>
        <span
          style={{ fontSize: "0.82rem", fontWeight: 600, color: C.gray900 }}
        >
          Industrial Dashboard
        </span>
        <button
          onClick={handleToggle} // 👈 era onToggle
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.gray400,
            display: "flex",
            alignItems: "center",
            padding: 4,
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          <Ico name="close" size={15} />
        </button>
      </div>

      {/* Info do usuário */}
      <div
        style={{ padding: "0.5rem", borderBottom: `1px solid ${C.gray200}` }}
      >
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: C.blueLight,
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.blue }}>
            {perfilLabel}
          </div>
          <div style={{ fontSize: "0.78rem", color: C.gray700, marginTop: 2 }}>
            {displayName}
          </div>
          {profile?.email && profile?.nome && (
            <div
              style={{ fontSize: "0.68rem", color: C.gray400, marginTop: 1 }}
            >
              {profile.email}
            </div>
          )}
        </div>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: "0.5rem 0", overflowY: "auto" }}>
        {menu.map(({ label, icon, page: p }) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0.55rem 1rem",
              fontSize: "0.82rem",
              fontWeight: page === p ? 500 : 400,
              color: page === p ? C.blue : C.gray500,
              background: page === p ? C.blueLight : "none",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              transition: "all 0.12s",
            }}
          >
            <span
              style={{
                color: page === p ? C.blue : C.gray400,
                display: "flex",
              }}
            >
              <Ico name={icon} size={15} />
            </span>
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{ padding: "0.85rem 1rem", borderTop: `1px solid ${C.gray200}` }}
      >
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: C.gray500,
            fontSize: "0.78rem",
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          <Ico name="logout" size={14} /> Sair do sistema
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: C.green,
            }}
          />
          <span style={{ fontSize: "0.68rem", color: C.gray400 }}>
            Sistema Online
          </span>
        </div>
      </div>
    </aside>
  );
}
