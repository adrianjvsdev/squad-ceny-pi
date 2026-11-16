"use client";

import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { CenyLogo } from "@/app/components/brand/CenyLogo";
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
          background: C.appBg,
          fontFamily: font,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ animation: "pulse 1.6s ease-in-out infinite" }}>
            <CenyLogo size={44} />
          </div>
          <div
            style={{
              width: 120,
              height: 3,
              borderRadius: 999,
              background: C.gray200,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "40%",
                borderRadius: 999,
                background: C.blue,
                animation: "cenyLoad 1.1s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`@keyframes cenyLoad { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
          <p style={{ margin: 0, fontSize: "0.82rem", color: C.gray500 }}>
            Carregando seu ambiente...
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
