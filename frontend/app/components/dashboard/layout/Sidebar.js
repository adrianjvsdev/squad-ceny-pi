"use client";

import { C } from "@/lib/constants";
import { Ico } from "../../ui";
import { useState } from "react";
import { CenyLogo } from "../../brand/CenyLogo";

const PERFIL_NOMES = {
  admin: "Administrador",
  tecnico: "Técnico",
  operador: "Operador",
};

export function iniciais(nome) {
  return (nome || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({
  isOpen,
  menu,
  page,
  perfil,
  profile,
  onNavigate,
  onLogout,
  onToggle,
}) {
  const [isClosing, setIsClosing] = useState(false);

  const handleToggle = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onToggle();
    }, 180);
  };

  const perfilLabel = PERFIL_NOMES[perfil] ?? "Usuário";
  const displayName = profile?.nome || profile?.email || "Usuário";

  if (!isOpen && !isClosing) return null;

  return (
    <aside
      style={{
        width: 252,
        height: "100vh",
        position: "sticky",
        top: 0,
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

      {/* Marca */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 64,
          padding: "0 1rem 0 1.25rem",
          borderBottom: `1px solid ${C.gray100}`,
        }}
      >
        <CenyLogo size={30} />
        <div style={{ lineHeight: 1.15 }}>
          <div
            style={{
              fontSize: "0.98rem",
              fontWeight: 700,
              color: C.gray900,
              letterSpacing: "-0.02em",
            }}
          >
            Ceny
          </div>
          <div style={{ fontSize: "0.68rem", color: C.gray400, fontWeight: 500 }}>
            Gestão Industrial
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="ceny-icon-btn"
          title="Recolher menu"
          aria-label="Recolher menu"
          style={{ marginLeft: "auto", width: 30, height: 30, color: C.gray400 }}
        >
          <Ico name="panelLeft" size={16} />
        </button>
      </div>

      {/* Navegação */}
      <nav
        style={{
          flex: 1,
          padding: "1.1rem 0.75rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: "0.66rem",
            fontWeight: 600,
            color: C.gray400,
            letterSpacing: "0.08em",
            padding: "0 0.75rem 0.5rem",
          }}
        >
          MENU
        </div>
        {menu.map(({ label, icon, page: p }) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            className="ceny-nav-item"
            data-active={page === p}
            aria-current={page === p ? "page" : undefined}
          >
            <Ico name={icon} size={17} />
            {label}
          </button>
        ))}
      </nav>

      {/* Usuário */}
      <div style={{ padding: "0.75rem", borderTop: `1px solid ${C.gray100}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0.6rem",
            borderRadius: 10,
            background: C.gray50,
            border: `1px solid ${C.gray100}`,
          }}
        >
          <span
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
              flexShrink: 0,
            }}
          >
            {iniciais(displayName)}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: C.gray900,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={displayName}
            >
              {displayName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.7rem",
                color: C.gray500,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.green,
                  flexShrink: 0,
                }}
              />
              {perfilLabel}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="ceny-icon-btn"
            title="Sair do sistema"
            aria-label="Sair do sistema"
            style={{ width: 30, height: 30, color: C.gray400 }}
          >
            <Ico name="logout" size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
