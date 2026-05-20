"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isTokenValid, getUserProfile, clearTokens } from "@/lib/auth";

/**
 * useAuth
 *
 * Verifica se há token válido no localStorage.
 * Se não houver, redireciona para /login.
 * Retorna { profile, loading } para o componente pai.
 *
 * profile = { id, role, email, name }
 * role    = "admin" | "tecnico" | "operador"
 */
export function useAuth() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTokenValid()) {
      clearTokens();
      router.replace("/login");
      return;
    }

    const p = getUserProfile();
    setProfile(p);
    setLoading(false);
  }, [router]);

  return { profile, loading };
}
