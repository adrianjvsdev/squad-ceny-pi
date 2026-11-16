"use client";

import { useId } from "react";

// Marca da Ceny: hexágono (peça/porca industrial) sobre o quadrado azul.
export function CenyLogo({ size = 32 }) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#3b6cf0" />
          <stop offset="1" stopColor="#1f47c4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <path
        d="M16 6.5l8.2 4.75v9.5L16 25.5l-8.2-4.75v-9.5z"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.2" fill="#fff" />
    </svg>
  );
}

// Logo + nome, para cabeçalhos.
export function CenyWordmark({ size = 32, dark = false, subtitle }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <CenyLogo size={size} />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: size * 0.56,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: dark ? "#ffffff" : "#0f172a",
          }}
        >
          Ceny
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 500,
              color: dark ? "rgba(255,255,255,0.7)" : "#8593a8",
            }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
