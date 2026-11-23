"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { NotificationPanel } from "./layout/NotificationPanel";
import { OverviewPage } from "./pages/OverviewPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PreventivasPage } from "./pages/PreventivasPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";
import { RiskMapPage, SettingsPage } from "./pages/OtherPages";
import { C, font } from "@/lib/constants";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/notifications";

const ALL_MENU = [
  {
    label: "Visão Geral",
    icon: "monitor",
    page: "overview",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Chamados",
    icon: "ticket",
    page: "tickets",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Inventário",
    icon: "db",
    page: "inventory",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Preventivas",
    icon: "calendar",
    page: "preventivas",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Relatórios",
    icon: "chart",
    page: "reports",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Mapa de Risco",
    icon: "map",
    page: "riskmap",
    roles: ["admin", "tecnico", "operador"],
  },
  { label: "Usuários", icon: "users", page: "users", roles: ["admin"] },
  {
    label: "Configurações",
    icon: "settings",
    page: "settings",
    roles: ["admin", "tecnico", "operador"],
  },
];

const PAGE_LABELS = {
  overview: "Visão Geral",
  tickets: "Chamados",
  inventory: "Inventário",
  preventivas: "Manutenções Preventivas",
  riskmap: "Mapa de Risco",
  reports: "Relatórios",
  users: "Usuários",
  settings: "Configurações",
};

function PageContent({ page, perfil, profile, onProfileUpdate }) {
  switch (page) {
    case "overview":
      return <OverviewPage userType={perfil} />;
    case "tickets":
      return <TicketsPage userType={perfil} profile={profile} />;
    case "inventory":
      return <InventoryPage userType={perfil} />;
    case "preventivas":
      return <PreventivasPage userType={perfil} />;
    case "reports":
      return <RelatoriosPage />;
    case "riskmap":
      return <RiskMapPage userType={perfil} />;
    case "users":
      return <UsersPage />;
    case "settings":
      return <SettingsPage onProfileUpdate={onProfileUpdate} />;
    default:
      return <OverviewPage userType={perfil} />;
  }
}

export function DashboardShell({ perfil = "operador", profile, onLogout }) {
  const menu = ALL_MENU.filter((item) => item.roles.includes(perfil));

  const [page, setPage] = useState(menu[0]?.page ?? "overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleProfileUpdate = useCallback((updatedProfile) => {
    setLocalProfile(updatedProfile);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    }
  }, []);

  // Carrega notificações e mantém atualização automática.
  useEffect(() => {
    const intervalId = setInterval(refreshNotifications, 3000);
    const timeoutId = setTimeout(refreshNotifications, 0);

    const onFocus = () => refreshNotifications();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshNotifications();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshNotifications]);

  const handleNotifToggle = () => {
    setNotifOpen((prev) => {
      const next = !prev;
      if (next) refreshNotifications();
      return next;
    });
  };

  // Marcar uma como lida — atualização otimista com rollback em falha
  const handleMarkRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id_notificacao === id ? { ...n, lida: true } : n)),
    );
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
      setNotifications((prev) =>
        prev.map((n) => (n.id_notificacao === id ? { ...n, lida: false } : n)),
      );
    }
  };

  // Marcar todas como lidas — otimista; recarga em falha
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    try {
      await markAllAsRead();
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
      getNotifications().then(setNotifications).catch(console.error);
    }
  };

  // Excluir — otimista; recarga em falha
  const handleDelete = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id_notificacao !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("Erro ao excluir notificação:", err);
      getNotifications().then(setNotifications).catch(console.error);
    }
  };

  const safePage = menu.some((m) => m.page === page) ? page : menu[0]?.page;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.appBg,
        fontFamily: font,
        color: C.gray900,
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        menu={menu}
        page={safePage}
        perfil={perfil}
        profile={localProfile}
        onNavigate={(p) => {
          setPage(p);
          setNotifOpen(false);
        }}
        onLogout={onLogout}
        onToggle={() => setSidebarOpen(false)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Topbar
          pageLabel={PAGE_LABELS[safePage]}
          sidebarOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onNotifToggle={handleNotifToggle}
          notifOpen={notifOpen}
          notifications={notifications}
          profile={localProfile}
          onLogout={onLogout}
        />
        <main style={{ flex: 1, padding: "1.75rem 2rem 2.5rem", overflowY: "auto" }}>
          <div
            key={safePage}
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              // Só opacidade: transform aqui viraria referência dos modais fixed.
              animation: "fadeIn 0.25s ease",
            }}
          >
            <PageContent page={safePage} perfil={perfil} profile={localProfile} onProfileUpdate={handleProfileUpdate} />
          </div>
        </main>
      </div>

      <NotificationPanel
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDelete}
      />
    </div>
  );
}
