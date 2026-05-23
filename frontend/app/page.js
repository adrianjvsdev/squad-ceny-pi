"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/lib/constants";
import { Btn, Ico, Input, Select } from "@/app/components/ui";

const tabs = [
  { id: "projeto", label: "O Projeto" },
  { id: "sobre", label: "Sobre Nós" },
  { id: "registro", label: "Registre sua Empresa" },
  { id: "faq", label: "Dúvidas Frequentes" },
];

const faqs = [
  {
    q: "O sistema funciona com qualquer tipo de indústria?",
    a: "Este protótipo foi desenvolvido com uma arquitetura flexível, permitindo adaptação para indústrias de manufatura, energia, petroquímica, alimentos e bebidas, e outros setores que necessitem gerenciar equipamentos e ordens de serviço.",
  },
  {
    q: "Como funciona o monitoramento IoT?",
    a: "O sistema foi projetado para receber dados de equipamentos compatíveis através de sensores conectados. O protótipo processa parâmetros como temperatura, RPM e pressão, gerando alertas quando valores saem dos limites configurados.",
  },
  {
    q: "Qual é a capacidade de usuários simultâneos?",
    a: "A arquitetura atual foi desenvolvida para suportar múltiplos usuários em diferentes funções. A escalabilidade depende dos requisitos de infraestrutura definidos durante a implementação em ambiente de produção.",
  },
  {
    q: "Como os dados são armazenados e protegidos?",
    a: "O protótipo segue práticas de segurança da indústria com arquitetura preparada para criptografia AES-256 e conformidade com regulamentações de dados. A implementação completa incluirá backup automático e auditoria de acesso.",
  },
  {
    q: "Este é um produto comercial?",
    a: "Não, este é um protótipo de conceito desenvolvido como projeto de pesquisa e inovação. Sua finalidade é demonstrar a viabilidade técnica de uma plataforma integrada de gestão industrial com tecnologias modernas.",
  },
];

const team = [
  {
    name: "Raoni Padovani",
    role: "Team Leader",
    area: "Liderança da equipe, coordenação geral do projeto e apoio multidisciplinar.",
  },
  {
    name: "Adrian Vera",
    role: "Frontend Developer",
    area: "Responsável pelo design da interface, experiência do usuário.",
  },
  {
    name: "Nelson Junior",
    role: "Backend Developer",
    area: "Desenvolvimento da lógica principal, APIs e integração do sistema.",
  },
  {
    name: "Lucas Andrade",
    role: "Backend QA",
    area: "Testes, validações, suporte backend e garantia de qualidade.",
  },
  {
    name: "Mateus Fogagnoli",
    role: "Engenheiro de Software",
    area: "Arquitetura do sistema, infraestrutura, organização técnica e suporte de engenharia.",
  },
  {
    name: "Nicolas Brentegani",
    role: "Database Administrator (DBA)",
    area: "Modelagem, gerenciamento, otimização e manutenção do banco de dados.",
  },
];

// Icon Components
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const MonitoringIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);

const AutomationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12a5 5 0 0 0 5 5m10 0a5 5 0 0 0 5-5m-5-5a5 5 0 0 0-5 5m10 0a5 5 0 0 0-5-5" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const MapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const TeamIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("projeto");
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [regForm, setRegForm] = useState({
    company: "",
    cnpj: "",
    segment: "",
    users: "",
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ minHeight: "100vh", fontFamily: font, background: C.white }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
      `}</style>

      {/* Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: scrolled ? C.white : "transparent",
          borderBottom: scrolled ? `1px solid ${C.gray200}` : "none",
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "1rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{ fontSize: "1.5rem", color: C.blue, fontWeight: 700 }}
            >
              ⬡
            </span>
            <span
              style={{ fontSize: "1.1rem", fontWeight: 700, color: C.gray800 }}
            >
              Ceny
            </span>
          </div>
          <div
            style={{ display: "flex", gap: "1.75rem", alignItems: "center" }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  color: activeTab === t.id ? C.blue : C.gray500,
                  padding: "0.3rem 0",
                  borderBottom: `2px solid ${activeTab === t.id ? C.blue : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => router.push("/login")}
              style={{
                padding: "0.55rem 1.1rem",
                background: C.blue,
                color: C.white,
                border: "none",
                borderRadius: 4,
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Acessar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Immersive Integrated Industrial IoT Background */}
      <section
        style={{
          backgroundImage:
            "url('/images/home.png'), linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.82) 50%, rgba(15, 23, 42, 0.88) 100%)",
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundBlendMode: "overlay",
          backgroundColor: "#0f172a",
          color: C.white,
          padding: "6rem 2rem",
          textAlign: "center",
          position: "relative",
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Subtle particle/network effect overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 800%22><defs><filter id=%22blur%22><feGaussianBlur in=%22SourceGraphic%22 stdDeviation=%222%22/></filter></defs><circle cx=%22100%22 cy=%22150%22 r=%225%22 fill=%22%2359b3fd%22 opacity=%220.4%22/><circle cx=%22300%22 cy=%22300%22 r=%223%22 fill=%22%2359b3fd%22 opacity=%220.3%22/><circle cx=%221100%22 cy=%22100%22 r=%224%22 fill=%22%2359b3fd%22 opacity=%220.35%22/><circle cx=%22150%22 cy=%22700%22 r=%226%22 fill=%22%2359b3fd%22 opacity=%220.25%22/><circle cx=%22800%22 cy=%22650%22 r=%224%22 fill=%22%2359b3fd%22 opacity=%220.3%22/><circle cx=%22600%22 cy=%22150%22 r=%223%22 fill=%22%2359b3fd%22 opacity=%220.28%22/><line x1=%22100%22 y1=%22150%22 x2=%22300%22 y2=%22300%22 stroke=%22%2359b3fd%22 stroke-width=%221%22 opacity=%220.15%22/><line x1=%22300%22 y1=%22300%22 x2=%221100%22 y2=%22100%22 stroke=%22%2359b3fd%22 stroke-width=%221%22 opacity=%220.12%22/><line x1=%22150%22 y1=%22700%22 x2=%22800%22 y2=%22650%22 stroke=%22%2359b3fd%22 stroke-width=%221%22 opacity=%220.1%22/></svg>')",
            backgroundSize: "100% 100%",
            opacity: 0.5,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Content - positioned above background effects */}
        <div
          style={{
            maxWidth: 700,
            animation: "fadeUp 0.6s ease",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 20,
              padding: "4px 14px",
              marginBottom: "1.5rem",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#38bdf8",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{ fontSize: "0.75rem", color: "#93c5fd", fontWeight: 600 }}
            >
              PROTÓTIPO DE PESQUISA
            </span>
          </div>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              margin: "0 0 1rem",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Plataforma Integrada de
            <br />
            Gestão Industrial
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#94a3b8",
              margin: "0 0 2rem",
              lineHeight: 1.7,
            }}
          >
            Protótipo conceitual que integra automação de ordens de serviço,
            monitoramento via IoT e gestão centralizada de operações industriais.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActiveTab("registro")}
              style={{
                padding: "0.875rem 2rem",
                background: C.blue,
                color: C.white,
                border: "none",
                borderRadius: 4,
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#1d4ed8";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = C.blue;
                e.target.style.transform = "translateY(0)";
              }}
            >
              Explorar Protótipo
            </button>
            <button
              onClick={() => router.push("/login")}
              style={{
                padding: "0.875rem 2rem",
                background: "transparent",
                color: C.white,
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 4,
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.target.borderColor = C.white;
                e.target.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.target.borderColor = "rgba(255,255,255,0.3)";
                e.target.style.background = "transparent";
              }}
            >
              Acessar Sistema
            </button>
          </div>
        </div>
      </section>

      {/* Tab Content */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "4rem 2rem",
          animation: "fadeUp 0.4s ease",
        }}
      >
        {/* O PROJETO */}
        {activeTab === "projeto" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: C.gray900,
                  margin: "0 0 0.75rem",
                }}
              >
                Sobre o Projeto
              </h2>
              <p
                style={{
                  color: C.gray500,
                  maxWidth: 700,
                  margin: "0 auto",
                  lineHeight: 1.7,
                }}
              >
                Protótipo desenvolvido como projeto de pesquisa que demonstra
                uma arquitetura integrada para gestão industrial moderna,
                combinando tecnologias de IoT, automação de processos e análise
                de dados em tempo real.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  icon: <DashboardIcon />,
                  title: "Dashboard Centralizado",
                  desc: "Interface unificada para visualização de ordens de serviço, status de equipamentos e indicadores operacionais em tempo real.",
                },
                {
                  icon: <MonitoringIcon />,
                  title: "Monitoramento IoT",
                  desc: "Arquitetura preparada para integração com sensores industriais, captura de parâmetros críticos e processamento contínuo de dados.",
                },
                {
                  icon: <AutomationIcon />,
                  title: "Automação de Processos",
                  desc: "Sistemas de roteamento inteligente de chamados, alocação automática de recursos e gestão proativa de ciclos de manutenção.",
                },
                {
                  icon: <MapIcon />,
                  title: "Mapa de Risco",
                  desc: "Visualização geoespacial das zonas operacionais com alertas contextualizados e rastreabilidade de eventos críticos.",
                },
                {
                  icon: <TeamIcon />,
                  title: "Gestão de Acesso",
                  desc: "Controle granular de permissões por função (RBAC), alocação de técnicos e acompanhamento de atividades operacionais.",
                },
                {
                  icon: <AnalyticsIcon />,
                  title: "Análise e Relatórios",
                  desc: "Dashboard customizável com histórico de operações, análise de tendências e métricas estruturais de desempenho.",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.gray200}`,
                    borderRadius: 8,
                    padding: "1.5rem",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.blue;
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(37, 99, 235, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.gray200;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#dbeafe",
                      borderRadius: 8,
                      marginBottom: "0.75rem",
                      color: C.blue,
                    }}
                  >
                    {icon}
                  </div>
                  <h3
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: C.gray900,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: C.gray500,
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOBRE NÓS */}
        {activeTab === "sobre" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: C.gray900,
                  margin: "0 0 0.75rem",
                }}
              >
                Equipe de Pesquisa
              </h2>
              <p
                style={{
                  color: C.gray500,
                  maxWidth: 650,
                  margin: "0 auto",
                  lineHeight: 1.7,
                }}
              >
                Grupo multidisciplinar de pesquisadores dedicados ao
                desenvolvimento de soluções inovadoras para otimização de
                processos industriais através de tecnologia integrada.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
                gap: "1.25rem",
                marginBottom: "3rem",
              }}
            >
              {team.map(({ name, role, area }) => (
                <div
                  key={name}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.gray200}`,
                    borderRadius: 8,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: C.blueLight,
                      color: C.blue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: C.gray900,
                        fontSize: "0.9rem",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: C.blue,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {role}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: C.gray400,
                        marginTop: 2,
                      }}
                    >
                      {area}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "#0f172a",
                borderRadius: 12,
                padding: "2.5rem",
                textAlign: "center",
                color: C.white,
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                }}
              >
                Objetivo de Pesquisa
              </h3>
              <p
                style={{
                  margin: "0 auto",
                  maxWidth: 600,
                  color: "#94a3b8",
                  lineHeight: 1.7,
                  fontSize: "1rem",
                }}
              >
                Desenvolver e validar uma arquitetura integrada de plataforma
                para gestão industrial que combine IoT, automação e análise de
                dados em tempo real, demonstrando viabilidade técnica e
                aplicabilidade em contextos operacionais reais.
              </p>
            </div>
          </div>
        )}

        {/* REGISTRO */}
        {activeTab === "registro" && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: C.gray900,
                  margin: "0 0 0.75rem",
                }}
              >
                Acesso ao Protótipo
              </h2>
              <p style={{ color: C.gray500 }}>
                Solicite acesso para explorar e avaliar o protótipo
              </p>
            </div>
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.gray200}`,
                borderRadius: 8,
                padding: "2rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1.25rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: C.gray700,
                  borderBottom: `1px solid ${C.gray200}`,
                  paddingBottom: "0.75rem",
                }}
              >
                DADOS DA INSTITUIÇÃO
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                  }}
                >
                  <Input
                    label="Instituição/Empresa"
                    placeholder="Ex: Indústrias Alfa Ltda"
                    value={regForm.company}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, company: e.target.value }))
                    }
                  />
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0001-00"
                    value={regForm.cnpj}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, cnpj: e.target.value }))
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                  }}
                >
                  <Select
                    label="Setor/Indústria"
                    value={regForm.segment}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, segment: e.target.value }))
                    }
                  >
                    <option value="">Selecione...</option>
                    <option>Manufatura</option>
                    <option>Petroquímica</option>
                    <option>Energia</option>
                    <option>Alimentos e Bebidas</option>
                    <option>Papel e Celulose</option>
                    <option>Mineração</option>
                    <option>Educação/Pesquisa</option>
                    <option>Outro</option>
                  </Select>
                  <Select
                    label="Usuários para teste"
                    value={regForm.users}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, users: e.target.value }))
                    }
                  >
                    <option value="">Selecione...</option>
                    <option>1–5 usuários</option>
                    <option>6–20 usuários</option>
                    <option>21–50 usuários</option>
                    <option>50+ usuários</option>
                  </Select>
                </div>
              </div>
              <h3
                style={{
                  margin: "0 0 1.25rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: C.gray700,
                  borderBottom: `1px solid ${C.gray200}`,
                  paddingBottom: "0.75rem",
                }}
              >
                RESPONSÁVEL PELO ACESSO
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  marginBottom: "1.5rem",
                }}
              >
                <Input
                  label="Nome completo"
                  placeholder="Seu nome"
                  value={regForm.name}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                  }}
                >
                  <Input
                    label="E-mail corporativo"
                    type="email"
                    placeholder="voce@empresa.com"
                    value={regForm.email}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-0000"
                    value={regForm.phone}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div
                style={{
                  padding: "0.85rem",
                  background: C.blueLight,
                  border: `1px solid #93c5fd`,
                  borderRadius: 6,
                  marginBottom: "1.25rem",
                  fontSize: "0.78rem",
                  color: "#1e40af",
                }}
              >
                ✓ Seus dados serão utilizados apenas para controle de acesso ao
                protótipo e fins de pesquisa, em conformidade com regulamentações
                de proteção de dados.
              </div>
              <Btn
                size="lg"
                onClick={() =>
                  alert(
                    "Solicitação recebida. Você receberá um e-mail com instruções de acesso em breve.",
                  )
                }
              >
                Solicitar Acesso
              </Btn>
            </div>
          </div>
        )}

        {/* FAQ */}
        {activeTab === "faq" && (
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: C.gray900,
                  margin: "0 0 0.75rem",
                }}
              >
                Perguntas Frequentes
              </h2>
              <p style={{ color: C.gray500 }}>
                Dúvidas sobre o protótipo e seu acesso
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    background: C.white,
                    border: `1px solid ${faqOpen === i ? C.blue : C.gray200}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    transition: "border-color 0.15s",
                  }}
                >
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem 1.25rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: C.gray800,
                      }}
                    >
                      {faq.q}
                    </span>
                    <span
                      style={{
                        color: C.gray400,
                        flexShrink: 0,
                        transform: faqOpen === i ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      <Ico name="chevDown" size={16} />
                    </span>
                  </button>
                  {faqOpen === i && (
                    <div
                      style={{
                        padding: "0 1.25rem 1rem",
                        borderTop: `1px solid ${C.gray100}`,
                      }}
                    >
                      <p
                        style={{
                          margin: "0.75rem 0 0",
                          fontSize: "0.85rem",
                          color: C.gray500,
                          lineHeight: 1.7,
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "2rem",
                padding: "1.5rem",
                background: C.gray50,
                borderRadius: 8,
                textAlign: "center",
                border: `1px solid ${C.gray200}`,
              }}
            >
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.9rem",
                  color: C.gray700,
                }}
              >
                Dúvida não respondida?
              </p>
              <Btn variant="secondary">Contatar Equipe →</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          background: C.gray800,
          color: C.white,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8rem", color: C.gray400 }}>
          © 2024–2026 Ceny · Protótipo de Pesquisa em Gestão Industrial ·{" "}
          <span style={{ color: C.blue }}>Termos de Uso</span> ·{" "}
          <span style={{ color: C.blue }}>Privacidade</span>
        </p>
      </footer>
    </div>
  );
}''