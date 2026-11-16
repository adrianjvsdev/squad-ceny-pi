"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/lib/constants";
import { Badge, Btn, Ico, Input } from "@/app/components/ui";
import { CenyLogo, CenyWordmark } from "@/app/components/brand/CenyLogo";
import { registroRequest } from "@/lib/auth";

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
    name: "Mateus Fogagnoli",
    role: "Project Owner (PO)",
    area: "Responsável por definir a visão do produto, identificar necessidades dos usuários e garantir que o produto entregue valor ao negócio.",
  },
  {
    name: "Raoni Padovani",
    role: "Scrum Master / QA",
    area: "Responsável por facilitar os processos ágeis, remover impedimentos da equipe e garantir a qualidade do software por meio de testes e validações.",
  },
  {
    name: "Nelson Junior",
    role: "Backend Developer",
    area: "Desenvolvimento da lógica principal, APIs e integração do sistema.",
  },
  {
    name: "Lucas Andrade",
    role: "Engenheiro IA",
    area: "Responsável pelo desenvolvimento, implementação e integração de modelos de inteligência artificial em sistemas e aplicações.",
  },
  {
    name: "Nicolas Brentegani",
    role: "Engenheiro de Software",
    area: "Arquitetura do sistema, infraestrutura, organização técnica e suporte de engenharia.",
  },
  {
    name: "Adrian Vera",
    role: "Frontend Developer",
    area: "Responsável pelo design da interface, experiência do usuário.",
  },
];

const features = [
  {
    icon: "grid",
    title: "Dashboard Centralizado",
    desc: "Interface unificada para visualização de ordens de serviço, status de equipamentos e indicadores operacionais em tempo real.",
  },
  {
    icon: "activity",
    title: "Monitoramento IoT",
    desc: "Arquitetura preparada para integração com sensores industriais, captura de parâmetros críticos e processamento contínuo de dados.",
  },
  {
    icon: "zap",
    title: "Automação de Processos",
    desc: "Sistemas de roteamento inteligente de chamados, alocação automática de recursos e gestão proativa de ciclos de manutenção.",
  },
  {
    icon: "map",
    title: "Mapa de Risco",
    desc: "Visualização geoespacial das zonas operacionais com alertas contextualizados e rastreabilidade de eventos críticos.",
  },
  {
    icon: "shield",
    title: "Gestão de Acesso",
    desc: "Controle granular de permissões por função (RBAC), alocação de técnicos e acompanhamento de atividades operacionais.",
  },
  {
    icon: "chart",
    title: "Análise e Relatórios",
    desc: "Dashboard customizável com histórico de operações, análise de tendências e métricas estruturais de desempenho.",
  },
];

const passos = [
  {
    icon: "ticket",
    title: "Abertura do chamado",
    desc: "Operadores registram a falha em linguagem natural, direto do chão de fábrica.",
  },
  {
    icon: "sparkle",
    title: "Triagem com IA",
    desc: "A IA sugere prioridade, tipo de problema e um pré-diagnóstico das causas prováveis.",
  },
  {
    icon: "check",
    title: "Execução e histórico",
    desc: "O técnico executa, registra a causa confirmada e o plano preventivo é atualizado.",
  },
];

const destaques = [
  { icon: "users", label: "3 perfis de acesso", desc: "Admin, técnico e operador" },
  { icon: "sparkle", label: "IA integrada", desc: "Pré-diagnóstico" },
  { icon: "calendar", label: "Preventivas", desc: "Planos e agenda automática" },
  { icon: "lock", label: "LGPD", desc: "Dados protegidos" },
];

const FORM_VAZIO = {
  nome_empresa: "",
  cnpj: "",
  telefone: "",
  nome: "",
  email: "",
  senha: "",
};

function maskCNPJ(value) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskTelefone(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function iniciais(nome) {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

// ─── Blocos de layout ──────────────────────────────────────────────────────

const container = { maxWidth: 1180, margin: "0 auto", padding: "0 1.5rem" };

function Eyebrow({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: C.blue,
        marginBottom: "0.85rem",
      }}
    >
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, subtitle, align = "center" }) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: 680,
        margin: align === "center" ? "0 auto 3.5rem" : "0 0 2rem",
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        style={{
          fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
          fontWeight: 700,
          color: C.gray900,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          margin: "0 0 1rem",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: C.gray500, lineHeight: 1.7, fontSize: "1.02rem" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function IconChip({ name, size = 44 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: C.blueLight,
        border: "1px solid #dbe6fe",
        color: C.blue,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Ico name={name} size={Math.round(size * 0.45)} />
    </span>
  );
}

// Prévia ilustrativa do painel, montada em HTML (sem imagem).
function ProductPreview() {
  const barras = [42, 58, 35, 70, 52, 84, 63, 76, 48, 90, 68, 80];
  const ordens = [
    { id: "OS-104", equip: "Bomba Centrífuga A-1", status: "Em Execução", cor: "blue" },
    { id: "OS-103", equip: "Compressor B-3", status: "Planejado", cor: "amber" },
    { id: "OS-102", equip: "Motor Elétrico C-5", status: "Concluído", cor: "green" },
  ];
  return (
    <div style={{ position: "relative" }}>
      {/* Brilho atrás */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "8% -6% -10% 6%",
          background:
            "radial-gradient(closest-side, rgba(43,92,230,0.28), transparent)",
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "relative",
          background: C.white,
          borderRadius: 16,
          border: `1px solid ${C.gray200}`,
          boxShadow:
            "0 30px 60px -20px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15,23,42,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Barra da janela */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0.7rem 1rem",
            borderBottom: `1px solid ${C.gray100}`,
            background: C.gray50,
          }}
        >
          {["#f87171", "#fbbf24", "#34d399"].map((c) => (
            <span
              key={c}
              style={{ width: 9, height: 9, borderRadius: "50%", background: c }}
            />
          ))}
          <span
            style={{
              marginLeft: 12,
              fontSize: "0.7rem",
              color: C.gray400,
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 6,
              padding: "2px 10px",
            }}
          >
            app.ceny.com.br/dashboard
          </span>
        </div>

        <div style={{ display: "flex" }}>
          {/* Mini sidebar */}
          <div
            style={{
              width: 52,
              borderRight: `1px solid ${C.gray100}`,
              padding: "0.9rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CenyLogo size={24} />
            {["monitor", "ticket", "db", "calendar", "map"].map((i, idx) => (
              <span
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: idx === 0 ? C.blue : C.gray400,
                  background: idx === 0 ? C.blueLight : "transparent",
                }}
              >
                <Ico name={i} size={14} />
              </span>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, padding: "1rem", minWidth: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {[
                ["Ordens ativas", "24", C.blue],
                ["Em execução", "9", C.green],
                ["Alertas", "3", C.red],
              ].map(([l, v, cor]) => (
                <div
                  key={l}
                  style={{
                    border: `1px solid ${C.gray100}`,
                    borderRadius: 10,
                    padding: "0.6rem 0.7rem",
                  }}
                >
                  <div style={{ fontSize: "0.62rem", color: C.gray400 }}>{l}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: C.gray900,
                    }}
                  >
                    {v}
                    <span
                      style={{ width: 6, height: 6, borderRadius: "50%", background: cor }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                border: `1px solid ${C.gray100}`,
                borderRadius: 10,
                padding: "0.7rem",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.66rem",
                  color: C.gray500,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: C.gray700 }}>
                  Ordens concluídas
                </span>
                <span>Últimos 12 meses</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 5,
                  height: 70,
                }}
              >
                {barras.map((h, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      borderRadius: "3px 3px 0 0",
                      background:
                        i === barras.length - 3
                          ? C.blue
                          : "linear-gradient(180deg, #c7d7fd, #e4ecfe)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${C.gray100}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {ordens.map((o, i) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.5rem 0.7rem",
                    borderTop: i ? `1px solid ${C.gray100}` : "none",
                    fontSize: "0.68rem",
                  }}
                >
                  <span style={{ fontWeight: 700, color: C.blue }}>{o.id}</span>
                  <span
                    style={{
                      flex: 1,
                      color: C.gray600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.equip}
                  </span>
                  <Badge color={o.cor}>{o.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cartão flutuante: triagem IA */}
      <div
        className="ceny-hide-mobile"
        style={{
          position: "absolute",
          left: -28,
          bottom: -24,
          alignItems: "center",
          gap: 10,
          background: C.white,
          border: `1px solid ${C.gray200}`,
          borderRadius: 12,
          padding: "0.7rem 0.9rem",
          boxShadow: C.shadowMd,
          zIndex: 2,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: C.purpleLight,
            color: C.purple,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ico name="sparkle" size={16} />
        </span>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.gray900 }}>
            Triagem por IA
          </div>
          <div style={{ fontSize: "0.66rem", color: C.gray500 }}>
            Possível erro: <strong style={{ color: C.redDark }}>Sugestão</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("projeto");
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  const [regForm, setRegForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Destaca no menu a seção visível.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id.replace("section-", ""));
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    tabs.forEach((t) => {
      const el = document.getElementById(`section-${t.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Links externos como /#registro (ex.: vindo do login).
  useEffect(() => {
    const alvo = window.location.hash.replace("#", "");
    if (tabs.some((t) => t.id === alvo)) {
      setTimeout(() => irPara(alvo), 50);
    }
  }, []);

  function irPara(id) {
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ─── Registro ────────────────────────────────────────────────────────────

  async function handleRegistro() {
    setErros({});
    setErroGeral(null);

    // Validação mínima no frontend
    const novosErros = {};
    if (!regForm.nome_empresa.trim()) novosErros.nome_empresa = "Obrigatório.";
    if (!regForm.cnpj.trim()) novosErros.cnpj = "Obrigatório.";
    if (!regForm.telefone.trim()) novosErros.telefone = "Obrigatório.";
    if (!regForm.nome.trim()) novosErros.nome = "Obrigatório.";
    if (!regForm.email.trim()) novosErros.email = "Obrigatório.";
    if (!regForm.senha.trim()) novosErros.senha = "Obrigatório.";
    if (regForm.senha.length > 0 && regForm.senha.length < 6)
      novosErros.senha = "Mínimo 6 caracteres.";

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    setSalvando(true);
    try {
      await registroRequest(regForm);
      router.push("/dashboard");
    } catch (e) {
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const campoMap = {
          nome_empresa: "nome_empresa",
          cnpj: "cnpj",
          telefone: "telefone",
          nome: "nome",
          email: "email",
          senha: "senha",
        };
        const errosCampo = {};
        let temCampo = false;
        for (const [campo, chave] of Object.entries(campoMap)) {
          if (detail[chave]) {
            errosCampo[campo] = Array.isArray(detail[chave])
              ? detail[chave].join(" ")
              : detail[chave];
            temCampo = true;
          }
        }
        if (temCampo) {
          setErros(errosCampo);
        } else {
          setErroGeral("Erro ao cadastrar. Tente novamente.");
        }
      } else {
        setErroGeral("Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  }

  function campo(key, value) {
    setRegForm((f) => ({ ...f, [key]: value }));
    if (erros[key]) setErros((e) => ({ ...e, [key]: undefined }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const sectionBase = { scrollMarginTop: 72, padding: "6rem 0" };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: font,
        background: C.white,
        color: C.gray900,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
          backdropFilter: scrolled ? "saturate(180%) blur(10px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(180%) blur(10px)" : "none",
          borderBottom: `1px solid ${scrolled ? C.gray200 : "transparent"}`,
          transition: "background 0.25s, border-color 0.25s",
        }}
      >
        <div
          style={{
            ...container,
            height: 68,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            aria-label="Ceny — voltar ao topo"
          >
            <CenyWordmark size={32} />
          </button>

          <div
            className="ceny-hide-mobile"
            style={{ gap: "2rem", alignItems: "center" }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => irPara(t.id)}
                className="ceny-link"
                data-active={activeTab === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn variant="ghost" onClick={() => router.push("/login")}>
              Entrar
            </Btn>
            <span className="ceny-hide-mobile">
              <Btn onClick={() => irPara("registro")}>Começar grátis</Btn>
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header
        style={{
          position: "relative",
          marginTop: -68,
          paddingTop: 68,
          overflow: "hidden",
          background:
            "radial-gradient(900px 500px at 85% 10%, rgba(43,92,230,0.12), transparent 70%), radial-gradient(700px 400px at 0% 0%, rgba(91,139,255,0.10), transparent 70%), linear-gradient(180deg, #f7f9ff 0%, #ffffff 100%)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(43,92,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(43,92,230,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
        />
        <div
          className="ceny-stack-mobile"
          style={{
            ...container,
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
            alignItems: "center",
            gap: "4rem",
            padding: "5.5rem 1.5rem 6.5rem",
          }}
        >
          <div style={{ animation: "fadeUp 0.6s ease" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: C.white,
                border: `1px solid ${C.blueLight2}`,
                boxShadow: C.shadowCard,
                borderRadius: 999,
                padding: "5px 14px 5px 6px",
                marginBottom: "1.5rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: C.gray700,
              }}
            >
              <span
                style={{
                  background: C.blue,
                  color: C.white,
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: "0.68rem",
                  letterSpacing: "0.04em",
                }}
              >
                NOVO
              </span>
              Pré-diagnóstico de falhas com IA
            </span>
            <h1
              style={{
                fontSize: "clamp(2.3rem, 4.6vw, 3.6rem)",
                fontWeight: 800,
                margin: "0 0 1.25rem",
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                color: C.gray900,
              }}
            >
              Plataforma integrada de{" "}
              <span
                style={{
                  background: `linear-gradient(120deg, ${C.blue} 0%, #5b8bff 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                gestão industrial
              </span>
            </h1>
            <p
              style={{
                fontSize: "1.12rem",
                color: C.gray500,
                margin: "0 0 2.25rem",
                lineHeight: 1.7,
                maxWidth: 540,
              }}
            >
              Automação de ordens de serviço, monitoramento via IoT e gestão
              centralizada de manutenção — do chamado aberto no chão de fábrica
              ao histórico completo do equipamento.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn size="lg" onClick={() => irPara("registro")}>
                Explorar protótipo <Ico name="arrowRight" size={16} />
              </Btn>
              <Btn size="lg" variant="ghost" onClick={() => router.push("/login")}>
                Acessar sistema
              </Btn>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem 1.5rem",
                marginTop: "2rem",
                fontSize: "0.85rem",
                color: C.gray500,
              }}
            >
              {["30 dias gratuitos", "Sem cartão de crédito", "Onboarding incluído"].map(
                (t) => (
                  <span
                    key={t}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: C.green, display: "flex" }}>
                      <Ico name="check" size={15} />
                    </span>
                    {t}
                  </span>
                ),
              )}
            </div>
          </div>

          <div style={{ animation: "fadeUp 0.8s ease 0.1s both" }}>
            <ProductPreview />
          </div>
        </div>
      </header>

      {/* Faixa de destaques */}
      <div
        style={{
          borderTop: `1px solid ${C.gray100}`,
          borderBottom: `1px solid ${C.gray100}`,
          background: C.white,
        }}
      >
        <div
          style={{
            ...container,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
            padding: "2rem 1.5rem",
          }}
        >
          {destaques.map(({ icon, label, desc }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconChip name={icon} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: C.gray900 }}>
                  {label}
                </div>
                <div style={{ fontSize: "0.82rem", color: C.gray500 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* O PROJETO */}
      <section id="section-projeto" style={sectionBase}>
        <div style={container}>
          <SectionHeader
            eyebrow="O PROJETO"
            title="Tudo o que a manutenção industrial precisa, integrado"
            subtitle="Protótipo desenvolvido como projeto de pesquisa que demonstra uma arquitetura integrada para gestão industrial moderna, combinando tecnologias de IoT, automação de processos e análise de dados em tempo real."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="ceny-feature-card"
                style={{
                  background: C.white,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: 16,
                  padding: "1.75rem",
                  boxShadow: C.shadowCard,
                }}
              >
                <IconChip name={icon} />
                <h3
                  style={{
                    margin: "1.25rem 0 0.5rem",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: C.gray900,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: C.gray500,
                    lineHeight: 1.65,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Como funciona */}
          <div
            style={{
              marginTop: "5rem",
              background: `linear-gradient(180deg, ${C.gray50}, #f3f7ff)`,
              border: `1px solid ${C.gray200}`,
              borderRadius: 20,
              padding: "3rem 2rem",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <Eyebrow>COMO FUNCIONA</Eyebrow>
              <h3
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: C.gray900,
                }}
              >
                Do chamado à causa raiz em três etapas
              </h3>
            </div>
            <div
              className="ceny-stack-mobile"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1.5rem",
              }}
            >
              {passos.map(({ icon, title, desc }, i) => (
                <div key={title} style={{ textAlign: "center", padding: "0 0.5rem" }}>
                  <div
                    style={{
                      position: "relative",
                      width: 56,
                      height: 56,
                      margin: "0 auto 1rem",
                      borderRadius: 16,
                      background: C.white,
                      border: `1px solid ${C.blueLight2}`,
                      boxShadow: C.shadowMd,
                      color: C.blue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ico name={icon} size={22} />
                    <span
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: C.blue,
                        color: C.white,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${C.white}`,
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: C.gray900,
                      marginBottom: 6,
                    }}
                  >
                    {title}
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: C.gray500, lineHeight: 1.6 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE NÓS */}
      <section
        id="section-sobre"
        style={{ ...sectionBase, background: C.gray50, borderTop: `1px solid ${C.gray100}` }}
      >
        <div style={container}>
          <SectionHeader
            eyebrow="SOBRE NÓS"
            title="Equipe de pesquisa"
            subtitle="Grupo multidisciplinar de pesquisadores dedicados ao desenvolvimento de soluções inovadoras para otimização de processos industriais através de tecnologia integrada."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
              marginBottom: "3rem",
            }}
          >
            {team.map(({ name, role, area }) => (
              <div
                key={name}
                className="ceny-feature-card"
                style={{
                  background: C.white,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: 16,
                  padding: "1.5rem",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  boxShadow: C.shadowCard,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${C.blue}, #5b8bff)`,
                    color: C.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: "0 6px 14px -6px rgba(43,92,230,0.6)",
                  }}
                >
                  {iniciais(name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.gray900, fontSize: "0.98rem" }}>
                    {name}
                  </div>
                  <div style={{ margin: "6px 0 8px" }}>
                    <Badge color="blue">{role}</Badge>
                  </div>
                  <p
                    style={{
                      fontSize: "0.84rem",
                      color: C.gray500,
                      lineHeight: 1.55,
                    }}
                  >
                    {area}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Objetivo de pesquisa */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              padding: "3.5rem 2rem",
              textAlign: "center",
              color: C.white,
              backgroundColor: C.blueDark,
              backgroundImage:
                "linear-gradient(135deg, rgba(43,92,230,0.94) 0%, rgba(26,58,156,0.96) 100%), url('/images/home.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 24px 48px -20px rgba(26,58,156,0.55)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div style={{ position: "relative" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <Ico name="layers" size={22} />
              </span>
              <h3
                style={{
                  margin: "0 0 0.85rem",
                  fontSize: "1.65rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Objetivo de pesquisa
              </h3>
              <p
                style={{
                  margin: "0 auto",
                  maxWidth: 640,
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.75,
                  fontSize: "1.02rem",
                }}
              >
                Desenvolver e validar uma arquitetura integrada de plataforma
                para gestão industrial que combine IoT, automação e análise de
                dados em tempo real, demonstrando viabilidade técnica e
                aplicabilidade em contextos operacionais reais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REGISTRO */}
      <section id="section-registro" style={sectionBase}>
        <div
          className="ceny-stack-mobile"
          style={{
            ...container,
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
            gap: "4rem",
            alignItems: "start",
          }}
        >
          <div style={{ position: "sticky", top: 110 }}>
            <SectionHeader
              align="left"
              eyebrow="REGISTRE SUA EMPRESA"
              title="Comece a usar a Ceny hoje mesmo"
              subtitle="Cadastre sua empresa e o responsável pela conta. Você já entra direto no painel como administrador."
            />
            <ul style={{ listStyle: "none", display: "grid", gap: 14 }}>
              {[
                ["30 dias gratuitos", "Teste todas as funcionalidades sem compromisso."],
                ["Sem cartão de crédito", "Nenhum dado de pagamento é solicitado."],
                ["Onboarding incluído", "Apoio da equipe para configurar setores e equipamentos."],
              ].map(([t, d]) => (
                <li key={t} style={{ display: "flex", gap: 12 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: C.green,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Ico name="check" size={13} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: C.gray900, fontSize: "0.95rem" }}>
                      {t}
                    </div>
                    <div style={{ fontSize: "0.86rem", color: C.gray500, marginTop: 2 }}>
                      {d}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              background: C.white,
              border: `1px solid ${C.gray200}`,
              borderRadius: 20,
              padding: "2.25rem",
              boxShadow: "0 24px 48px -24px rgba(15, 23, 42, 0.18)",
            }}
          >
            {/* Dados da empresa */}
            <FormSection icon="building" title="Dados da empresa" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <Input
                label="Razão Social"
                placeholder="Ex: Indústrias Alfa Ltda"
                value={regForm.nome_empresa}
                onChange={(e) => campo("nome_empresa", e.target.value)}
                error={erros.nome_empresa}
              />
              <div
                className="ceny-stack-mobile"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <Input
                  label="CNPJ"
                  placeholder="00.000.000/0001-00"
                  value={regForm.cnpj}
                  onChange={(e) => campo("cnpj", maskCNPJ(e.target.value))}
                  maxLength={18}
                  inputMode="numeric"
                  error={erros.cnpj}
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-0000"
                  value={regForm.telefone}
                  onChange={(e) =>
                    campo("telefone", maskTelefone(e.target.value))
                  }
                  maxLength={15}
                  inputMode="numeric"
                  error={erros.telefone}
                />
              </div>
            </div>

            {/* Responsável */}
            <FormSection icon="user" title="Responsável pelo cadastro" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "1.75rem",
              }}
            >
              <Input
                label="Nome completo"
                placeholder="Seu nome"
                value={regForm.nome}
                onChange={(e) => campo("nome", e.target.value)}
                error={erros.nome}
              />
              <div
                className="ceny-stack-mobile"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={regForm.email}
                  onChange={(e) => campo("email", e.target.value)}
                  error={erros.email}
                />
                <Input
                  label="Senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={regForm.senha}
                  onChange={(e) => campo("senha", e.target.value)}
                  error={erros.senha}
                />
              </div>
            </div>

            {/* LGPD */}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "0.85rem 1rem",
                background: C.blueLight,
                border: "1px solid #dbe6fe",
                borderRadius: 10,
                marginBottom: "1.25rem",
                fontSize: "0.8rem",
                lineHeight: 1.5,
                color: C.blueDark,
              }}
            >
              <span style={{ display: "flex", flexShrink: 0, marginTop: 1 }}>
                <Ico name="shield" size={15} />
              </span>
              Ao registrar, você concorda com os Termos de Uso e a Política de
              Privacidade. Seus dados são protegidos pela LGPD.
            </div>

            {erroGeral && (
              <div
                role="alert"
                style={{
                  margin: "0 0 1rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: 8,
                  background: C.redLight,
                  border: "1px solid #fecaca",
                  fontSize: "0.82rem",
                  color: C.redDark,
                }}
              >
                {erroGeral}
              </div>
            )}

            <Btn
              size="lg"
              onClick={handleRegistro}
              disabled={salvando}
              style={{ width: "100%" }}
            >
              {salvando ? "Cadastrando..." : "Iniciar período gratuito"}
              {!salvando && <Ico name="arrowRight" size={16} />}
            </Btn>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="section-faq"
        style={{ ...sectionBase, background: C.gray50, borderTop: `1px solid ${C.gray100}` }}
      >
        <div style={{ ...container, maxWidth: 820 }}>
          <SectionHeader
            eyebrow="DÚVIDAS FREQUENTES"
            title="Perguntas frequentes"
            subtitle="Dúvidas sobre o protótipo e seu acesso."
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {faqs.map((faq, i) => {
              const aberto = faqOpen === i;
              return (
                <div
                  key={i}
                  style={{
                    background: C.white,
                    border: `1px solid ${aberto ? "#bcd0fb" : C.gray200}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: aberto ? C.shadowMd : C.shadowCard,
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                >
                  <button
                    onClick={() => setFaqOpen(aberto ? null : i)}
                    aria-expanded={aberto}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.15rem 1.35rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 600,
                        color: C.gray900,
                      }}
                    >
                      {faq.q}
                    </span>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: aberto ? C.blue : C.gray100,
                        color: aberto ? C.white : C.gray500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transform: aberto ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s, background 0.2s",
                      }}
                    >
                      <Ico name="chevDown" size={15} />
                    </span>
                  </button>
                  {aberto && (
                    <p
                      style={{
                        padding: "0 1.35rem 1.25rem",
                        fontSize: "0.92rem",
                        color: C.gray500,
                        lineHeight: 1.75,
                        animation: "fadeIn 0.2s ease",
                      }}
                    >
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem 1.75rem",
              background: C.white,
              borderRadius: 16,
              border: `1px solid ${C.gray200}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <IconChip name="mail" size={44} />
              <div>
                <div style={{ fontWeight: 700, color: C.gray900 }}>
                  Dúvida não respondida?
                </div>
                <div style={{ fontSize: "0.86rem", color: C.gray500 }}>
                  Fale com a equipe do projeto.
                </div>
              </div>
            </div>
            <Btn variant="secondary">
              Contatar equipe <Ico name="arrowRight" size={15} />
            </Btn>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: "5rem 0" }}>
        <div style={container}>
          <div
            className="ceny-stack-mobile"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: "2rem",
              padding: "3rem",
              borderRadius: 20,
              background:
                "radial-gradient(600px 300px at 100% 0%, rgba(91,139,255,0.5), transparent 70%), linear-gradient(135deg, #2b5ce6 0%, #1a3a9c 100%)",
              color: C.white,
              boxShadow: "0 24px 48px -20px rgba(26,58,156,0.55)",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  marginBottom: 8,
                }}
              >
                Pronto para organizar sua manutenção?
              </h3>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem" }}>
                Registre sua empresa e acesse o painel em poucos minutos.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn
                size="lg"
                variant="ghost"
                onClick={() => irPara("registro")}
                style={{ border: "none", color: C.blue }}
              >
                Registrar empresa
              </Btn>
              <Btn
                size="lg"
                onClick={() => router.push("/login")}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow: "none",
                }}
              >
                Acessar sistema
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.gray200}`, background: C.white }}>
        <div
          className="ceny-stack-mobile"
          style={{
            ...container,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))",
            gap: "2.5rem",
            padding: "3.5rem 1.5rem 2.5rem",
          }}
        >
          <div>
            <CenyWordmark size={32} subtitle="Gestão Industrial" />
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.88rem",
                color: C.gray500,
                lineHeight: 1.65,
                maxWidth: 340,
              }}
            >
              Protótipo de pesquisa em gestão industrial: ordens de serviço,
              manutenção preventiva e monitoramento integrados.
            </p>
          </div>
          <div>
            <FooterTitle>Navegação</FooterTitle>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => irPara(t.id)}
                className="ceny-link"
                style={{ display: "block", fontSize: "0.88rem" }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <FooterTitle>Plataforma</FooterTitle>
            <button
              onClick={() => router.push("/login")}
              className="ceny-link"
              style={{ display: "block", fontSize: "0.88rem" }}
            >
              Acessar sistema
            </button>
            <span className="ceny-link" style={{ display: "block", fontSize: "0.88rem" }}>
              Termos de Uso
            </span>
            <span className="ceny-link" style={{ display: "block", fontSize: "0.88rem" }}>
              Privacidade
            </span>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.gray100}` }}>
          <p
            style={{
              ...container,
              padding: "1.25rem 1.5rem",
              fontSize: "0.8rem",
              color: C.gray400,
            }}
          >
            © 2024–2026 Ceny · Protótipo de Pesquisa em Gestão Industrial
          </p>
        </div>
      </footer>
    </div>
  );
}

function FormSection({ icon, title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 0 1.25rem",
        paddingBottom: "0.85rem",
        borderBottom: `1px solid ${C.gray100}`,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: C.blueLight,
          color: C.blue,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ico name={icon} size={15} />
      </span>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: C.gray900 }}>
        {title}
      </h3>
    </div>
  );
}

function FooterTitle({ children }) {
  return (
    <div
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: C.gray900,
        textTransform: "uppercase",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </div>
  );
}
