"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/lib/constants";
import { Btn, Ico, Input, Select } from "@/app/components/ui";
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
    a: "Sim! O Ceny é projetado para indústrias de manufatura, energia, petroquímica, alimentos e bebidas, e qualquer setor que precise gerenciar equipamentos e ordens de serviço.",
  },
  {
    q: "Como funciona o monitoramento IoT?",
    a: "Equipamentos compatíveis enviam dados em tempo real via sensores conectados. O sistema processa temperatura, RPM, pressão e outros parâmetros, gerando alertas automáticos quando os valores saem dos limites configurados.",
  },
  {
    q: "Quantos usuários posso ter no sistema?",
    a: "O número de usuários depende do plano contratado. Oferecemos planos a partir de 5 usuários até corporativo com usuários ilimitados.",
  },
  {
    q: "Os dados ficam seguros? Onde são armazenados?",
    a: "Todos os dados são armazenados com criptografia AES-256 em servidores certificados ISO 27001. Fazemos backup automático a cada 4 horas e cumprimos integralmente a LGPD.",
  },
  {
    q: "Existe período de teste gratuito?",
    a: "Sim! Oferecemos 30 dias de acesso completo sem necessidade de cartão de crédito. Nossa equipe faz o onboarding e configuração inicial sem custo adicional.",
  },
];

const team = [
  {
    name: "Marina Lopes",
    role: "CEO & Co-fundadora",
    area: "Engenharia Industrial",
  },
  { name: "Rafael Torres", role: "CTO", area: "Sistemas Embarcados & IoT" },
  { name: "Camila Ferreira", role: "Head de Produto", area: "UX & Operações" },
  {
    name: "André Souza",
    role: "Engenheiro de Software",
    area: "Backend & Infraestrutura",
  },
];

const FORM_VAZIO = {
  nome_empresa: "",
  cnpj: "",
  telefone: "",
  nome: "",
  email: "",
  senha: "",
};

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
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

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
        // Mapeia erros de campo vindos do serializer
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

  return (
    <div style={{ minHeight: "100vh", fontFamily: font, background: C.white }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
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

      {/* Hero */}
      <section
        style={{
          background: "#0f172a",
          color: C.white,
          padding: "6rem 2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            animation: "fadeUp 0.6s ease",
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
              PLATAFORMA INDUSTRIAL IoT
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
            Gestão Industrial
            <br />
            Integrada e Inteligente
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#94a3b8",
              margin: "0 0 2rem",
              lineHeight: 1.7,
            }}
          >
            Sistema unificado para automação de ordens de serviço, monitoramento
            de equipamentos via IoT e gestão completa de operações industriais.
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
              }}
            >
              Registrar empresa
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
              }}
            >
              Já tenho acesso
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
        {/* O PROJETO — inalterado */}
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
              <p style={{ color: C.gray500, maxWidth: 600, margin: "0 auto" }}>
                Protótipo de conceito para plataforma de gestão industrial
                moderna, focada em eficiência operacional e rastreabilidade.
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
                  icon: "📊",
                  title: "Dashboard Centralizado",
                  desc: "Visualização em tempo real de todas as ordens de serviço, equipamentos e KPIs operacionais em um único painel.",
                },
                {
                  icon: "📡",
                  title: "Monitoramento IoT",
                  desc: "Integração com sensores industriais para acompanhamento contínuo de temperatura, RPM, pressão e outros parâmetros críticos.",
                },
                {
                  icon: "🔄",
                  title: "Automação de Processos",
                  desc: "Roteamento inteligente de chamados com alertas automáticos e gestão proativa de manutenções preventivas.",
                },
                {
                  icon: "🗺️",
                  title: "Mapa de Risco",
                  desc: "Visualização geoespacial das zonas de risco da planta com alertas em tempo real e rastreabilidade de incidentes.",
                },
                {
                  icon: "👥",
                  title: "Gestão de Equipes",
                  desc: "Controle de permissões por função (RBAC), alocação de técnicos e acompanhamento de produtividade.",
                },
                {
                  icon: "📈",
                  title: "Relatórios e Análises",
                  desc: "Dashboards customizáveis com histórico completo de ordens, tendências e métricas de desempenho operacional.",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    background: C.gray50,
                    border: `1px solid ${C.gray200}`,
                    borderRadius: 8,
                    padding: "1.5rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
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

        {/* SOBRE NÓS — inalterado */}
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
                Quem Somos
              </h2>
              <p
                style={{
                  color: C.gray500,
                  maxWidth: 650,
                  margin: "0 auto",
                  lineHeight: 1.7,
                }}
              >
                A Ceny nasceu da frustração com sistemas industriais
                desatualizados. Somos um time de engenheiros e desenvolvedores
                que acreditam que a indústria brasileira merece tecnologia de
                ponta, acessível e fácil de usar.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
                Nossa Missão
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
                Democratizar a transformação digital na indústria brasileira,
                oferecendo uma plataforma integrada que une IoT, automação e
                inteligência de dados para maximizar a eficiência operacional.
              </p>
            </div>
          </div>
        )}

        {/* REGISTRO — integrado */}
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
                Registre sua Empresa
              </h2>
              <p style={{ color: C.gray500 }}>
                30 dias gratuitos · Sem cartão de crédito · Onboarding incluído
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
              {/* Dados da empresa */}
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
                DADOS DA EMPRESA
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
                  label="Razão Social"
                  placeholder="Ex: Indústrias Alfa Ltda"
                  value={regForm.nome_empresa}
                  onChange={(e) => campo("nome_empresa", e.target.value)}
                  error={erros.nome_empresa}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                  }}
                >
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0001-00"
                    value={regForm.cnpj}
                    onChange={(e) => campo("cnpj", e.target.value)}
                    error={erros.cnpj}
                  />
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-0000"
                    value={regForm.telefone}
                    onChange={(e) => campo("telefone", e.target.value)}
                    error={erros.telefone}
                  />
                </div>
              </div>

              {/* Responsável */}
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
                RESPONSÁVEL PELO CADASTRO
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
                  value={regForm.nome}
                  onChange={(e) => campo("nome", e.target.value)}
                  error={erros.nome}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
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
                  padding: "0.85rem",
                  background: C.blueLight,
                  border: `1px solid #93c5fd`,
                  borderRadius: 6,
                  marginBottom: "1.25rem",
                  fontSize: "0.78rem",
                  color: "#1e40af",
                }}
              >
                ✓ Ao registrar, você concorda com os Termos de Uso e a Política
                de Privacidade. Seus dados são protegidos pela LGPD.
              </div>

              {erroGeral && (
                <p
                  style={{
                    margin: "0 0 1rem",
                    fontSize: "0.78rem",
                    color: "red",
                  }}
                >
                  {erroGeral}
                </p>
              )}

              <Btn size="lg" onClick={handleRegistro} disabled={salvando}>
                {salvando ? "Cadastrando..." : "Iniciar período gratuito"}
              </Btn>
            </div>
          </div>
        )}

        {/* FAQ — inalterado */}
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
                Dúvidas Frequentes
              </h2>
              <p style={{ color: C.gray500 }}>
                Encontre respostas para as perguntas mais comuns sobre o Ceny.
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
                Não encontrou sua resposta?
              </p>
              <Btn variant="secondary">Entre em contato →</Btn>
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
          © 2026 Ceny · Plataforma de Gestão Industrial ·{" "}
          <span style={{ color: C.blue }}>Termos de Uso</span> ·{" "}
          <span style={{ color: C.blue }}>Privacidade</span>
        </p>
      </footer>
    </div>
  );
}
