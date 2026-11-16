"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { C, font } from "@/lib/constants";
import { Ico, Input } from "@/app/components/ui";
import { CenyLogo, CenyWordmark } from "@/app/components/brand/CenyLogo";
import { loginRequest, getUserProfile } from "@/lib/auth";

const DESTAQUES = [
  { icon: "ticket", text: "Ordens de serviço com triagem por IA" },
  { icon: "calendar", text: "Planos de manutenção preventiva" },
  { icon: "map", text: "Mapa de risco por setor em tempo real" },
];

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

  return (
    <main
      className="ceny-stack-mobile"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        background: C.white,
        fontFamily: font,
      }}
    >
      {/* Painel da marca */}
      <section
        className="ceny-hide-mobile"
        style={{
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem 3rem",
          color: C.white,
          background:
            "radial-gradient(1200px 600px at 0% 0%, #3d6ef5 0%, transparent 60%), linear-gradient(160deg, #2b5ce6 0%, #1a3a9c 100%)",
        }}
      >
        {/* Grade decorativa */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
          }}
        />

        <Link href="/" style={{ position: "relative", width: "fit-content" }}>
          <CenyWordmark size={34} dark subtitle="Gestão Industrial" />
        </Link>

        <div style={{ position: "relative", maxWidth: 440 }}>
          <h2
            style={{
              fontSize: "2.1rem",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
            }}
          >
            Toda a manutenção da sua planta em um só lugar.
          </h2>
          <p
            style={{
              fontSize: "0.98rem",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.78)",
              marginBottom: "2rem",
            }}
          >
            Centralize chamados, equipamentos e planos preventivos com
            visibilidade de ponta a ponta.
          </p>
          <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
            {DESTAQUES.map(({ icon, text }) => (
              <li
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ico name={icon} size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p
          style={{
            position: "relative",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          © {new Date().getFullYear()} Ceny · Protótipo de pesquisa
        </p>
      </section>

      {/* Formulário */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.5rem 1.5rem",
          background: C.white,
        }}
      >
        {/*
          Usamos <form> com onSubmit para capturar tanto o clique
          no botão quanto o Enter, prevenindo o reload nativo.
        */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ width: "100%", maxWidth: 380, animation: "fadeUp 0.4s ease" }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <CenyLogo size={40} />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.65rem",
                fontWeight: 700,
                color: C.gray900,
                letterSpacing: "-0.03em",
              }}
            >
              Bem-vindo de volta
            </h1>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.9rem", color: C.gray500 }}>
              Entre com suas credenciais para acessar o painel.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="seu@empresa.com"
              style={{ height: 44 }}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              style={{ height: 44 }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.65rem 0.8rem",
                  borderRadius: 8,
                  background: C.redLight,
                  border: "1px solid #fecaca",
                  color: C.redDark,
                  fontSize: "0.83rem",
                }}
              >
                <Ico name="info" size={15} />
                {error}
              </div>
            )}

            {/* type="submit" garante que o form captura o Enter nativamente */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: C.blue,
                color: C.white,
                border: "none",
                borderRadius: 8,
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: font,
                boxShadow: "0 4px 14px -4px rgba(43, 92, 230, 0.55)",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: C.white,
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar sistema <Ico name="arrowRight" size={16} />
                </>
              )}
            </button>
          </div>

          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: `1px solid ${C.gray100}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem",
              color: C.gray500,
            }}
          >
            <span>Ainda não tem conta?</span>
            <Link
              href="/#registro"
              style={{ color: C.blue, fontWeight: 600 }}
            >
              Registrar empresa
            </Link>
          </div>

          <p
            style={{
              marginTop: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.72rem",
              color: C.gray400,
            }}
          >
            <Ico name="lock" size={12} /> Conexão segura · v4.2.1
          </p>
        </form>
      </section>
    </main>
  );
}
