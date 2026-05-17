"use client";

import { useState } from "react";
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
    blue: { bg: C.blueLight2, text: "#1e40af", border: "#93c5fd" },
    green: { bg: C.greenLight, text: C.greenDark, border: "#86efac" },
    amber: { bg: C.amberLight, text: C.amberDark, border: "#fcd34d" },
    red: { bg: C.redLight, text: C.redDark, border: "#fca5a5" },
    purple: { bg: C.purpleLight, text: C.purpleDark, border: "#c4b5fd" },
    gray: { bg: C.gray100, text: C.gray600, border: C.gray300 },
  };
  const s = map[color] || map.blue;
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
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
        background: "#0f172a",
        color: "#38bdf8",
        border: "1px solid #0ea5e9",
        borderRadius: 4,
        padding: "2px 7px",
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
          background: "#38bdf8",
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
            background: C.gray800,
            color: C.white,
            padding: "6px 10px",
            borderRadius: 6,
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
              borderTop: `5px solid ${C.gray800}`,
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
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 8,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 600,
              color: C.gray900,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: C.gray400,
              display: "flex",
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
export function Input({ label, type = "text", placeholder, value, onChange, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.gray700,
            letterSpacing: "0.05em",
          }}
        >
          {label.toUpperCase()}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
        style={{
          padding: "0.6rem 0.85rem",
          border: `1px solid ${C.gray300}`,
          borderRadius: 4,
          fontSize: "0.9rem",
          color: C.gray900,
          outline: "none",
          fontFamily: font,
          background: C.white,
          ...props.style,
        }}
      />
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================
export function Select({ label, children, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.gray700,
            letterSpacing: "0.05em",
          }}
        >
          {label.toUpperCase()}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        style={{
          padding: "0.6rem 0.85rem",
          border: `1px solid ${C.gray300}`,
          borderRadius: 4,
          fontSize: "0.9rem",
          color: C.gray900,
          outline: "none",
          fontFamily: font,
          background: C.white,
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ============================================================
// BTN
// ============================================================
export function Btn({ children, onClick, variant = "primary", size = "md", icon, disabled }) {
  const base = {
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 4,
    fontFamily: font,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
    opacity: disabled ? 0.55 : 1,
  };
  const sizes = {
    sm: { padding: "0.4rem 0.8rem", fontSize: "0.78rem" },
    md: { padding: "0.6rem 1.1rem", fontSize: "0.88rem" },
    lg: { padding: "0.8rem 1.5rem", fontSize: "0.95rem" },
  };
  const variants = {
    primary: { background: C.blue, color: C.white },
    secondary: { background: "transparent", color: C.blue, border: `1px solid ${C.blue}` },
    danger: { background: C.red, color: C.white },
    ghost: { background: "transparent", color: C.gray600, border: `1px solid ${C.gray200}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
    >
      {icon && <Ico name={icon} size={14} />}
      {children}
    </button>
  );
}