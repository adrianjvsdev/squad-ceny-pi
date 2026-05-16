"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";

export default function DashboardPage() {
  const router = useRouter();
  const [userType, setUserType] = useState("admin");

  useEffect(() => {
    const stored = sessionStorage.getItem("userType");
    if (stored) setUserType(stored);
  }, []);

  function handleLogout() {
    sessionStorage.removeItem("userType");
    router.push("/");
  }

  return <DashboardShell userType={userType} onLogout={handleLogout} />;
}