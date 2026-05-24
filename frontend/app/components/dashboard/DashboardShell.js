"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { NotificationPanel } from "./layout/NotificationPanel";
import { OverviewPage } from "./pages/OverviewPage";
import { InventoryPage } from "./pages/InventoryPage";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";
import { RiskMapPage, ReportsPage, SettingsPage } from "./pages/OtherPages";
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
    label: "Mapa de Risco",
    icon: "map",
    page: "riskmap",
    roles: ["admin", "tecnico", "operador"],
  },
  {
    label: "Relatórios",
    icon: "chart",
    page: "reports",
    roles: ["admin", "tecnico"],
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
  riskmap: "Mapa de Risco",
  reports: "Relatórios",
  users: "Usuários",
  settings: "Configurações",
};

function PageContent({ page, perfil }) {
  switch (page) {
    case "overview":
      return <OverviewPage userType={perfil} />;
    case "tickets":
      return <TicketsPage userType={perfil} />;
    case "inventory":
      return <InventoryPage userType={perfil} />;
    case "riskmap":
      return <RiskMapPage />;
    case "reports":
      return <ReportsPage />;
    case "users":
      return <UsersPage />;
    case "settings":
      return <SettingsPage />;
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

  // Carrega notificações reais ao montar o shell
  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch((err) => console.error("Erro ao carregar notificações:", err));
  }, []);

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
        background: "#f5f6f8",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        menu={menu}
        page={safePage}
        perfil={perfil}
        profile={profile}
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
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onNotifToggle={() => setNotifOpen((v) => !v)}
          notifOpen={notifOpen}
          notifications={notifications}
        />
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <PageContent page={safePage} perfil={perfil} />
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
