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
  const [authState] = useState(() => {
    const valid = isTokenValid();
    return {
      valid,
      profile: valid ? getUserProfile() : null,
    };
  });

  useEffect(() => {
    if (!authState.valid) {
      clearTokens();
      router.replace("/login");
    }
  }, [authState.valid, router]);

  return { profile: authState.profile, loading: !authState.valid };
}
