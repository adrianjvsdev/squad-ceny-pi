"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout, getAccessToken } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Se não há token, redireciona para login imediatamente
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    // Busca dados da rota protegida do backend
    apiFetch("/api/dashboard/")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar dados");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Dashboard</h1>

        {error && <p style={styles.error}>{error}</p>}

        {data ? (
          <div>
            <p style={styles.message}>{data.message}</p>
            <p style={styles.user}>
              Logado como: <strong>{data.user}</strong>
            </p>
          </div>
        ) : (
          !error && <p>Carregando...</p>
        )}

        <button onClick={logout} style={styles.button}>
          Sair
        </button>
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
    backgroundColor: "#f0f2f5",
  },
  card: {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "500px",
  },
  title: { color: "#333", marginBottom: "1.5rem" },
  message: { fontSize: "1.1rem", color: "#2d7a2d", marginBottom: "0.5rem" },
  user: { color: "#555", marginBottom: "1.5rem" },
  button: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#e53e3e",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  error: { color: "#e53e3e" },
};
