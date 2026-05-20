"use client";

import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { useAuth } from "@/app/hooks/useAuth";
import { logout } from "@/lib/auth";
import { C, font } from "@/lib/constants";

export default function DashboardPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.gray50,
          fontFamily: font,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${C.gray200}`,
              borderTopColor: C.blue,
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: "0.82rem", color: C.gray400 }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      perfil={profile?.perfil ?? "operador"}
      profile={profile}
      onLogout={logout}
    />
  );
}
