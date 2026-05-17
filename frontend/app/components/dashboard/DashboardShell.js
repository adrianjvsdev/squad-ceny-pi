"use client";

import { useState } from "react";
import { C, font, adminMenu, techMenu } from "@/lib/constants";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";
import { NotificationPanel } from "@/app/components/layout/NotificationPanel";
import { OverviewPage } from "@/app/components/dashboard/pages/OverviewPage";
import { UsersPage } from "@/app/components/dashboard/pages/UsersPage";
import { InventoryPage } from "@/app/components/dashboard/pages/InventoryPage";
import { TicketsPage } from "@/app/components/dashboard/pages/TicketsPage";
import { RiskMapPage, ReportsPage, SettingsPage } from "@/app/components/dashboard/pages/OtherPages";

export function DashboardShell({ userType = "admin", onLogout }) {
  const [page, setPage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menu = userType === "admin" ? adminMenu : techMenu;

  const pageMap = {
    overview: <OverviewPage userType={userType} />,
    users: <UsersPage />,
    inventory: <InventoryPage userType={userType} />,
    tickets: <TicketsPage userType={userType} />,
    riskmap: <RiskMapPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  };

  const handleNavigate = (p) => {
    setPage(p);
    setSidebarOpen(false);
    setNotifOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: font,
        background: C.gray100,
        position: "relative",
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.gray200}; border-radius: 2px; }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
        }}
      >
        <Sidebar
          menu={menu}
          page={page}
          userType={userType}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: 0 }}>
        <Topbar
          pageLabel={menu.find((m) => m.page === page)?.label}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onNotifToggle={() => { setNotifOpen((v) => !v); }}
          notifOpen={notifOpen}
        />
        <main style={{ flex: 1, padding: "1.5rem", animation: "fadeIn 0.2s ease" }}>
          {pageMap[page] || <OverviewPage userType={userType} />}
        </main>
      </div>

      {/* Notification Panel */}
      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
}