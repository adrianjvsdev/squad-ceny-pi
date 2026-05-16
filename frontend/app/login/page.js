"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/lib/constants";
import { Input } from "@/app/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("admin");

  function handleSubmit() {
    if (!username || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Persist userType so dashboard can read it
      if (typeof window !== "undefined") {
        sessionStorage.setItem("userType", userType);
      }
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e8eaed",
        fontFamily: font,
      }}
    >
      <div
        style={{
          background: C.white,
          padding: "2.5rem 2rem",
          borderRadius: 4,
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: C.blue, letterSpacing: "-0.5px" }}>
            Ceny
          </h1>
          <p style={{ margin: "0.25rem 0 1rem", fontSize: "0.7rem", color: C.gray400, letterSpacing: "0.08em" }}>
            SISTEMA DE GESTÃO INDUSTRIAL
          </p>
          <hr style={{ border: "none", borderTop: `1px solid ${C.gray200}`, margin: 0 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
          <Input
            label="E-mail"
            type="email"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="seu@email.com"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
          />

          {/* Demo: choose user type */}
          <div style={{ padding: "0.65rem 0.85rem", background: C.blueLight, border: `1px solid #93c5fd`, borderRadius: 4 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#1e40af", marginBottom: 6 }}>
              MODO DEMO — ENTRAR COMO:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["admin", "Administrador"], ["tecnico", "Técnico"]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setUserType(v)}
                  style={{
                    flex: 1,
                    padding: "0.4rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    border: `1px solid ${userType === v ? C.blue : C.gray300}`,
                    background: userType === v ? C.blue : C.white,
                    color: userType === v ? C.white : C.gray600,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: C.red, fontSize: "0.82rem", textAlign: "center", margin: 0 }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "0.85rem",
              background: loading ? C.gray300 : C.blue,
              color: C.white,
              border: "none",
              borderRadius: 4,
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: font,
            }}
          >
            {loading ? "Entrando..." : "Acessar Sistema"}
          </button>
        </div>

        <p style={{ marginTop: "1.75rem", textAlign: "center", fontSize: "0.75rem", color: C.gray400 }}>
          v4.2.1 — Ambiente de Produção
        </p>
      </div>
    </main>
  );
}