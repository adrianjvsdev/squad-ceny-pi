"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/lib/constants";
import { Input } from "@/app/components/ui";
import { loginRequest, getUserProfile } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    // Impede qualquer submit/reload nativo do browser
    if (e) e.preventDefault();

    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginRequest(email, password);
      const profile = getUserProfile();
      console.log("Login OK — perfil:", profile);
      router.push("/dashboard");
    } catch (err) {
      // Loga o erro completo no console para debug
      console.error("Erro no login:", err);
      console.error("Response data:", err?.response?.data);
      console.error("Status:", err?.response?.status);

      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.non_field_errors?.[0] ??
        err?.response?.data?.email?.[0] ??
        err?.response?.data?.password?.[0] ??
        "Credenciais inválidas. Tente novamente.";

      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit(e);
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
      {/*
        Usamos <form> com onSubmit para capturar tanto o clique
        no botão quanto o Enter, prevenindo o reload nativo.
      */}
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          background: C.white,
          padding: "2.5rem 2rem",
          borderRadius: 4,
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 700,
              color: C.blue,
              letterSpacing: "-0.5px",
            }}
          >
            Ceny
          </h1>
          <p
            style={{
              margin: "0.25rem 0 1rem",
              fontSize: "0.7rem",
              color: C.gray400,
              letterSpacing: "0.08em",
            }}
          >
            SISTEMA DE GESTÃO INDUSTRIAL
          </p>
          <hr
            style={{
              border: "none",
              borderTop: `1px solid ${C.gray200}`,
              margin: 0,
            }}
          />
        </div>

        {/* Campos */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            marginBottom: "1rem",
          }}
          onKeyDown={handleKeyDown}
        >
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="seu@email.com"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="••••••••"
          />

          {error && (
            <p
              style={{
                color: C.red,
                fontSize: "0.82rem",
                textAlign: "center",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {/* type="submit" garante que o form captura o Enter nativamente */}
          <button
            type="submit"
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
              transition: "background 0.15s",
            }}
          >
            {loading ? "Entrando..." : "Acessar Sistema"}
          </button>
        </div>

        <p
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: C.gray400,
          }}
        >
          v4.2.1 — Ambiente de Produção
        </p>
      </form>
    </main>
  );
}
