"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Lembrar de alterar depois
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!response.ok) {
        throw new Error("Email ou senha inválidos");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.container}>
      {/* Gradiente de fundo sutil */}
      <div style={styles.backgroundGradient}></div>

      <div style={styles.wrapper}>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Entrar</h1>
            <p style={styles.subtitle}>Digite suas credenciais para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Email Field */}
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="nome@empresa.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Digite sua senha"
                required
                disabled={loading}
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={styles.controls}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  style={styles.checkbox}
                />
                <span>Lembrar-me</span>
              </label>
              <a href="/forgot-password" style={styles.link}>
                Esqueceu a senha?
              </a>
            </div>

            {/* Error Message */}
            {error && <p style={styles.error}>{error}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>Novo por aqui?</span>
          </div>

          {/* Sign Up Link */}
          <p style={styles.signUpText}>
            Não tem uma conta?{" "}
            <a href="/signup" style={styles.signUpLink}>
              Criar uma
            </a>
          </p>
        </div>

        {/* Info Section */}
        <div style={styles.infoSection}>
          <div style={styles.infoBadge}>
            <span style={styles.infoBadgeIcon}>✓</span>
            <p style={styles.infoBadgeText}>Secure authentication</p>
          </div>
          <div style={styles.infoBadge}>
            <span style={styles.infoBadgeIcon}>✓</span>
            <p style={styles.infoBadgeText}>Enterprise-grade security</p>
          </div>
          <div style={styles.infoBadge}>
            <span style={styles.infoBadgeIcon}>✓</span>
            <p style={styles.infoBadgeText}>24/7 support available</p>
          </div>
        </div>
      </div>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
  },

  backgroundGradient: {
    position: "absolute",
    top: "-50%",
    right: "-10%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(46, 120, 204, 0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  wrapper: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: "4rem",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem",
    width: "100%",
  },

  card: {
    backgroundColor: "#fff",
    padding: "3rem",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    width: "100%",
    maxWidth: "420px",
    border: "1px solid #e3e7ea",
  },

  header: {
    marginBottom: "2rem",
    textAlign: "center",
  },

  title: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "#1b1d1e",
    margin: "0 0 0.5rem 0",
    letterSpacing: "-0.01em",
  },

  subtitle: {
    fontSize: "0.95rem",
    color: "#2e78cc",
    margin: 0,
    fontWeight: "500",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#343a40",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  input: {
    padding: "0.75rem 1rem",
    border: "1.5px solid #ced4da",
    borderRadius: "8px",
    fontSize: "0.95rem",
    color: "#1b1d1e",
    backgroundColor: "#f8f9fa",
    transition: "all 0.3s ease",
    outline: "none",
    fontFamily: "inherit",
  },

  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    fontSize: "0.875rem",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#343a40",
    cursor: "pointer",
    userSelect: "none",
    fontWeight: "500",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accent: "#2e78cc",
  },

  link: {
    color: "#2e78cc",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.2s ease",
  },

  button: {
    padding: "0.875rem 1rem",
    backgroundColor: "#2e78cc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginTop: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  error: {
    color: "#e53e3e",
    fontSize: "0.875rem",
    padding: "0.75rem",
    backgroundColor: "rgba(229, 62, 62, 0.1)",
    borderRadius: "6px",
    textAlign: "center",
    margin: "0.5rem 0 0 0",
    border: "1px solid rgba(229, 62, 62, 0.2)",
  },

  divider: {
    position: "relative",
    margin: "2rem 0",
    textAlign: "center",
  },

  dividerText: {
    fontSize: "0.875rem",
    color: "#ced4da",
    backgroundColor: "#fff",
    padding: "0 0.75rem",
    position: "relative",
    zIndex: 1,
  },

  signUpText: {
    fontSize: "0.875rem",
    color: "#343a40",
    textAlign: "center",
    margin: 0,
  },

  signUpLink: {
    color: "#2e78cc",
    textDecoration: "none",
    fontWeight: "700",
    transition: "color 0.2s ease",
  },

  infoSection: {
    display: "none",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
    maxWidth: "300px",
  },

  infoBadge: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1.25rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #e3e7ea",
  },

  infoBadgeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    minWidth: "32px",
    borderRadius: "50%",
    backgroundColor: "#2e78cc",
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
  },

  infoBadgeText: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#343a40",
    fontWeight: "500",
    lineHeight: "1.4",
  },

  "@media (min-width: 768px)": {
    infoSection: {
      display: "flex",
    },
  },
};