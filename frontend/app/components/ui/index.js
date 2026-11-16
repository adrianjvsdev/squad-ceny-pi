"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { C, font, Icons } from "@/lib/constants";

// ============================================================
// ICO
// ============================================================
export function Ico({ name, size = 16, color }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {Icons[name]}
    </svg>
  );
}

// ============================================================
// BADGE
// ============================================================
export function Badge({ children, color = "blue" }) {
  const map = {
    blue: { bg: C.blueLight, text: C.blueDark, border: "#c7d7fd" },
    green: { bg: "#f0fdf4", text: C.greenDark, border: "#bbf7d0" },
    amber: { bg: C.amberLight, text: C.amberDark, border: "#fde68a" },
    red: { bg: C.redLight, text: C.redDark, border: "#fecaca" },
    purple: { bg: C.purpleLight, text: C.purpleDark, border: "#ddd6fe" },
    gray: { bg: C.gray50, text: C.gray600, border: C.gray200 },
  };
  const s = map[color] || map.blue;
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 999,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: "16px",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}

// ============================================================
// IOT BADGE
// ============================================================
export function IoTBadge() {
  return (
    <span
      style={{
        background: "#ecfeff",
        color: "#0e7490",
        border: "1px solid #a5f3fc",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#06b6d4",
          animation: "pulse 1.5s infinite",
        }}
      />
      IoT Live
    </span>
  );
}

// ============================================================
// TOOLTIP
// ============================================================
export function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: C.gray900,
            color: C.white,
            padding: "6px 10px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 12,
            whiteSpace: "nowrap",
            zIndex: 200,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `5px solid ${C.gray900}`,
            }}
          />
        </div>
      )}
    </span>
  );
}

// ============================================================
// MODAL
// ============================================================
// Modais abertos, do mais antigo ao do topo: o Esc fecha só o do topo.
const pilhaModais = [];

// bloquearFechamento: ignora Esc, clique fora e o X (ex.: enquanto salva).
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 520,
  bloquearFechamento = false,
}) {
  const caixaRef = useRef(null);
  const fecharRef = useRef(null);

  const fechar = useCallback(() => {
    if (!bloquearFechamento) onClose?.();
  }, [bloquearFechamento, onClose]);

  useEffect(() => {
    fecharRef.current = fechar;
  }, [fechar]);

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol("modal");
    pilhaModais.push(id);
    function onKeyDown(e) {
      if (e.key === "Escape" && pilhaModais[pilhaModais.length - 1] === id) {
        fecharRef.current?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      pilhaModais.splice(pilhaModais.indexOf(id), 1);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    caixaRef.current
      ?.querySelector(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      )
      ?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.15s ease",
      }}
      onClick={fechar}
    >
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        style={{
          background: C.white,
          borderRadius: 16,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          border: `1px solid ${C.gray200}`,
          boxShadow: C.shadowLg,
          animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            margin: "-0.25rem 0 1.25rem",
            paddingBottom: "1rem",
            borderBottom: `1px solid ${C.gray100}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.05rem",
              fontWeight: 650,
              color: C.gray900,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            disabled={bloquearFechamento}
            className="ceny-icon-btn"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              cursor: bloquearFechamento ? "not-allowed" : "pointer",
              color: C.gray400,
            }}
          >
            <Ico name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// INPUT
// ============================================================
const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: C.gray700,
};

const fieldStyle = (error) => ({
  height: 40,
  padding: "0 0.8rem",
  border: `1px solid ${error ? C.red : C.gray300}`,
  borderRadius: 8,
  fontSize: "0.9rem",
  color: C.gray900,
  outline: "none",
  fontFamily: font,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
});

function FieldError({ children }) {
  return (
    <span style={{ fontSize: "0.75rem", color: C.red, fontWeight: 500 }}>
      {children}
    </span>
  );
}
export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  ...props
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label style={labelStyle}>{label}</label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
        style={{
          ...fieldStyle(error),
          background: C.white,
          ...props.style,
        }}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================
export function Select({
  label,
  children,
  value,
  onChange,
  disabled,
  error,
  ...props
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label style={labelStyle}>{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
        style={{
          ...fieldStyle(error),
          background: disabled ? C.gray100 : C.white,
          cursor: disabled ? "not-allowed" : undefined,
          ...props.style,
        }}
      >
        {children}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

// ============================================================
// BTN
// ============================================================
export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  // Repassados ao <button>: type, title, aria-label, style...
  ...props
}) {
  const [hover, setHover] = useState(false);
  const ativo = hover && !disabled;
  const { onMouseEnter, onMouseLeave, ...rest } = props;

  const base = {
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 8,
    fontFamily: font,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    transition:
      "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
    opacity: disabled ? 0.55 : 1,
  };
  const sizes = {
    sm: { minHeight: 32, padding: "0.35rem 0.75rem", fontSize: "0.78rem" },
    md: { minHeight: 38, padding: "0.5rem 1rem", fontSize: "0.85rem" },
    lg: { minHeight: 46, padding: "0.7rem 1.4rem", fontSize: "0.95rem" },
  };
  const variants = {
    primary: {
      background: ativo ? C.blueHover : C.blue,
      color: C.white,
      boxShadow: ativo
        ? "0 4px 12px -2px rgba(43, 92, 230, 0.45)"
        : "0 1px 2px rgba(43, 92, 230, 0.3)",
    },
    secondary: {
      background: ativo ? C.blueLight : C.white,
      color: C.blue,
      border: `1px solid ${ativo ? C.blue : "#b9cbfa"}`,
    },
    danger: {
      background: ativo ? C.redDark : C.red,
      color: C.white,
      boxShadow: "0 1px 2px rgba(220, 38, 38, 0.3)",
    },
    ghost: {
      background: ativo ? C.gray50 : C.white,
      color: ativo ? C.gray900 : C.gray700,
      border: `1px solid ${ativo ? C.gray300 : C.gray200}`,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
      style={{ ...base, ...sizes[size], ...variants[variant], ...props.style }}
    >
      {icon && <Ico name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}
