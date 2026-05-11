"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Immersive Carousel Component
function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [transitionActive, setTransitionActive] = useState(false);

  const slides = [
    {
      id: 1,
      bgColor: "#1a3a4a",
      title: "Plataforma Integrada de Gestão Industrial",
      subtitle: "Sistema unificado para automação de ordens de serviço e gestão de equipamentos",
      description: "Controle completo das operações em tempo real",
    },
    {
      id: 2,
      bgColor: "#0f2a3a",
      title: "Automação Inteligente de Processos",
      subtitle: "Otimização de fluxos operacionais com IA e análise de dados",
      description: "Aumente a eficiência operacional em até 40%",
    },
    {
      id: 3,
      bgColor: "#1a2a3a",
      title: "Monitoramento em Tempo Real",
      subtitle: "Dashboard interativo com visualização de todos os equipamentos e ordens",
      description: "Visibilidade completa de suas operações",
    },
  ];

  const nextSlide = () => {
    setTransitionActive(true);
    setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
      setTransitionActive(false);
    }, 300);
  };

  const prevSlide = () => {
    setTransitionActive(true);
    setTimeout(() => {
      setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setTransitionActive(false);
    }, 300);
  };

  const goToSlide = (index) => {
    setTransitionActive(true);
    setTimeout(() => {
      setActiveSlide(index);
      setTransitionActive(false);
    }, 300);
  };

  const currentSlide = slides[activeSlide];

  return (
    <section style={carouselStyles.section}>
      <div
        style={{
          ...carouselStyles.carousel,
          backgroundColor: currentSlide.bgColor,
          opacity: transitionActive ? 0.8 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Background Pattern Grid */}
        <div style={carouselStyles.bgPattern}>
          <svg
            viewBox="0 0 100 100"
            style={carouselStyles.svgPattern}
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.03)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient Overlay */}
        <div style={carouselStyles.gradientOverlay}></div>

        {/* Content Container */}
        <div style={carouselStyles.contentContainer}>
          <div style={carouselStyles.textContent}>
            <div
              style={{
                ...carouselStyles.textFade,
                opacity: transitionActive ? 0 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <h1 style={carouselStyles.title}>{currentSlide.title}</h1>
              <p style={carouselStyles.subtitle}>{currentSlide.subtitle}</p>
              <p style={carouselStyles.description}>{currentSlide.description}</p>

              <div style={carouselStyles.ctaContainer}>
                <Link href="/signup" style={carouselStyles.ctaPrimary}>
                  Explorar Protótipo
                </Link>
                <button style={carouselStyles.ctaSecondary}>
                  Ver Documentação
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Navigation */}
        <button
          onClick={prevSlide}
          style={carouselStyles.navButtonLeft}
          aria-label="Slide anterior"
        >
          ‹
        </button>
        <button
          onClick={nextSlide}
          style={carouselStyles.navButtonRight}
          aria-label="Próximo slide"
        >
          ›
        </button>

        {/* Bottom Indicators */}
        <div style={carouselStyles.indicatorsContainer}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={{
                ...carouselStyles.indicator,
                backgroundColor:
                  index === activeSlide ? "#3b82f6" : "rgba(255, 255, 255, 0.3)",
                transform: index === activeSlide ? "scale(1.3)" : "scale(1)",
                transition: "all 0.3s ease",
              }}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function IndustrialSaaSLandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main style={styles.main}>
      {/* Navigation */}
      <nav
        style={{
          ...styles.navbar,
          borderBottom: scrolled ? "1px solid #e5e7eb" : "none",
          backgroundColor: scrolled ? "#ffffff" : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
        }}
      >
        <div style={styles.navContainer}>
          <div style={styles.logo}>
            <div style={styles.logoMark}>⬡</div>
            <span style={styles.logoText}>Ceny</span>
          </div>
          <ul style={styles.navLinks}>
            <li>
              <a href="#overview" style={styles.navLink}>
                Visão Geral
              </a>
            </li>
            <li>
              <a href="#features" style={styles.navLink}>
                Recursos
              </a>
            </li>
            <li>
              <a href="#dashboard" style={styles.navLink}>
                Interface
              </a>
            </li>
            <li>
              <a href="#specs" style={styles.navLink}>
                Especificações
              </a>
            </li>
          </ul>
          <Link href="/login" style={styles.loginBtn}>
            Iniciar já
          </Link>
        </div>
      </nav>

      {/* Immersive Hero Carousel */}
      <HeroCarousel />

      {/* Overview Section */}
      <section id="overview" style={styles.overview}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Sobre o Projeto</h2>
            <p style={styles.sectionSubtitle}>
              Protótipo de conceito para plataforma de gestão industrial moderna
            </p>
          </div>

          <div style={styles.overviewGrid}>
            <div style={styles.overviewCard}>
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>Análise de Dados Industrial</h3>
              <p style={styles.cardText}>
                Dashboard centralizado com visualização em tempo real de todas as
                operações, equipamentos e ordens de serviço. Integração de dados
                de múltiplas fontes para análise holística.
              </p>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.cardIcon}>🔄</div>
              <h3 style={styles.cardTitle}>Automação de Processos</h3>
              <p style={styles.cardText}>
                Sistema inteligente de roteamento de ordens com algoritmos de
                otimização. Alocação automática de recursos baseada em
                disponibilidade e competência técnica.
              </p>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.cardIcon}>📡</div>
              <h3 style={styles.cardTitle}>Conectividade IoT</h3>
              <p style={styles.cardText}>
                Integração com sensores e dispositivos industriais para
                monitoramento contínuo. Alertas em tempo real para anomalias e
                manutenção preventiva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.features}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Funcionalidades Principais</h2>
            <p style={styles.sectionSubtitle}>
              Elementos-chave do sistema de gestão integrado
            </p>
          </div>

          <div style={styles.featuresGrid}>
            {[
              {
                icon: "✓",
                title: "Gestão de Ordens",
                desc: "Ciclo completo de vida de ordens",
              },
              {
                icon: "✓",
                title: "Monitoramento de Equipamentos",
                desc: "Acompanhamento de desempenho em tempo real",
              },
              {
                icon: "✓",
                title: "Alocação de Recursos",
                desc: "Distribuição inteligente de técnicos e materiais",
              },
              {
                icon: "✓",
                title: "Relatórios e Análises",
                desc: "Dashboard com KPIs e métricas customizáveis",
              },
              {
                icon: "✓",
                title: "Controle de Acesso",
                desc: "Gerenciamento de permissões por função",
              },
              {
                icon: "✓",
                title: "Integração com Terceiros",
                desc: "APIs abertas para extensibilidade",
              },
            ].map((feature, idx) => (
              <div key={idx} style={styles.featureItem}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h4 style={styles.featureTitle}>{feature.title}</h4>
                <p style={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" style={styles.dashboardSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Interface do Sistema</h2>
            <p style={styles.sectionSubtitle}>
              Visualização da tela principal de gestão de ordens
            </p>
          </div>

          <div style={styles.dashboardPreview}>
            <svg viewBox="0 0 1000 600" style={{ width: "100%", height: "100%" }}>
              {/* Background */}
              <rect width="1000" height="600" fill="#f9fafb" />
              <rect x="1" y="1" width="998" height="598" fill="white" stroke="#e5e7eb" strokeWidth="1" />

              {/* Header */}
              <rect x="0" y="0" width="1000" height="80" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
              <text x="30" y="50" fontSize="18" fill="#1f2937" fontWeight="700">
                Dashboard de Ordens de Serviço
              </text>

              {/* Left Sidebar */}
              <rect x="0" y="80" width="200" height="520" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
              <rect x="20" y="110" width="160" height="40" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="1" rx="4" />
              <text x="40" y="137" fontSize="12" fill="#4f46e5" fontWeight="600">
                Ordens
              </text>
              <rect x="20" y="170" width="160" height="30" fill="transparent" stroke="none" />
              <text x="40" y="192" fontSize="11" fill="#6b7280">
                Equipamentos
              </text>
              <rect x="20" y="220" width="160" height="30" fill="transparent" stroke="none" />
              <text x="40" y="242" fontSize="11" fill="#6b7280">
                Técnicos
              </text>

              {/* Main Content */}
              {/* Metrics */}
              <rect x="220" y="110" width="220" height="120" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" rx="4" />
              <text x="240" y="135" fontSize="11" fill="#6b7280" fontWeight="600">
                Total de Ordens
              </text>
              <text x="240" y="170" fontSize="32" fill="#2563eb" fontWeight="700">
                342
              </text>
              <text x="240" y="195" fontSize="10" fill="#9ca3af">
                +15% em relação ao mês anterior
              </text>

              <rect x="460" y="110" width="220" height="120" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" rx="4" />
              <text x="480" y="135" fontSize="11" fill="#6b7280" fontWeight="600">
                Em Execução
              </text>
              <text x="480" y="170" fontSize="32" fill="#059669" fontWeight="700">
                87
              </text>
              <text x="480" y="195" fontSize="10" fill="#9ca3af">
                Requer atenção em 3
              </text>

              <rect x="700" y="110" width="220" height="120" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" rx="4" />
              <text x="720" y="135" fontSize="11" fill="#6b7280" fontWeight="600">
                Equipamentos Ativos
              </text>
              <text x="720" y="170" fontSize="32" fill="#7c3aed" fontWeight="700">
                156
              </text>
              <text x="720" y="195" fontSize="10" fill="#9ca3af">
                98% de disponibilidade
              </text>

              {/* Table */}
              <rect x="220" y="260" width="700" height="320" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4" />

              {/* Table Header */}
              <rect x="220" y="260" width="700" height="50" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" rx="4" />
              <text x="240" y="292" fontSize="11" fill="#6b7280" fontWeight="700">
                ID
              </text>
              <text x="320" y="292" fontSize="11" fill="#6b7280" fontWeight="700">
                Equipamento
              </text>
              <text x="500" y="292" fontSize="11" fill="#6b7280" fontWeight="700">
                Técnico
              </text>
              <text x="650" y="292" fontSize="11" fill="#6b7280" fontWeight="700">
                Status
              </text>
              <text x="800" y="292" fontSize="11" fill="#6b7280" fontWeight="700">
                Progresso
              </text>

              {/* Table Rows */}
              <line x1="220" y1="310" x2="920" y2="310" stroke="#f3f4f6" strokeWidth="1" />
              <text x="240" y="338" fontSize="11" fill="#374151">
                OS-001
              </text>
              <text x="320" y="338" fontSize="11" fill="#374151">
                Bomba A-1
              </text>
              <text x="500" y="338" fontSize="11" fill="#374151">
                João Silva
              </text>
              <rect x="650" y="325" width="90" height="20" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" rx="2" />
              <text x="665" y="340" fontSize="10" fill="#1e40af" fontWeight="600">
                Em Progresso
              </text>
              <rect x="800" y="330" width="100" height="8" fill="#e5e7eb" stroke="none" rx="2" />
              <rect x="800" y="330" width="65" height="8" fill="#3b82f6" stroke="none" rx="2" />

              <line x1="220" y1="355" x2="920" y2="355" stroke="#f3f4f6" strokeWidth="1" />
              <text x="240" y="383" fontSize="11" fill="#374151">
                OS-002
              </text>
              <text x="320" y="383" fontSize="11" fill="#374151">
                Motor C-5
              </text>
              <text x="500" y="383" fontSize="11" fill="#374151">
                Maria Santos
              </text>
              <rect x="650" y="370" width="90" height="20" fill="#dcfce7" stroke="#86efac" strokeWidth="1" rx="2" />
              <text x="665" y="385" fontSize="10" fill="#15803d" fontWeight="600">
                Concluído
              </text>
              <rect x="800" y="375" width="100" height="8" fill="#e5e7eb" stroke="none" rx="2" />
              <rect x="800" y="375" width="100" height="8" fill="#10b981" stroke="none" rx="2" />

              <line x1="220" y1="400" x2="920" y2="400" stroke="#f3f4f6" strokeWidth="1" />
              <text x="240" y="428" fontSize="11" fill="#374151">
                OS-003
              </text>
              <text x="320" y="428" fontSize="11" fill="#374151">
                Compressor B-3
              </text>
              <text x="500" y="428" fontSize="11" fill="#374151">
                Carlos Oliveira
              </text>
              <rect x="650" y="415" width="90" height="20" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" rx="2" />
              <text x="665" y="430" fontSize="10" fill="#92400e" fontWeight="600">
                Planejado
              </text>
              <rect x="800" y="420" width="100" height="8" fill="#e5e7eb" stroke="none" rx="2" />
              <rect x="800" y="420" width="30" height="8" fill="#f59e0b" stroke="none" rx="2" />

              <line x1="220" y1="445" x2="920" y2="445" stroke="#f3f4f6" strokeWidth="1" />
              <text x="240" y="473" fontSize="11" fill="#374151">
                OS-004
              </text>
              <text x="320" y="473" fontSize="11" fill="#374151">
                Válvula D-7
              </text>
              <text x="500" y="473" fontSize="11" fill="#374151">
                Ana Costa
              </text>
              <rect x="650" y="460" width="90" height="20" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" rx="2" />
              <text x="665" y="475" fontSize="10" fill="#1e40af" fontWeight="600">
                Em Execução
              </text>
              <rect x="800" y="465" width="100" height="8" fill="#e5e7eb" stroke="none" rx="2" />
              <rect x="800" y="465" width="45" height="8" fill="#3b82f6" stroke="none" rx="2" />
            </svg>
          </div>
        </div>
      </section>

      {/* Specifications Section */}
      <section id="specs" style={styles.specsSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Especificações Técnicas</h2>
            <p style={styles.sectionSubtitle}>
              Detalhes da arquitetura e tecnologias utilizadas
            </p>
          </div>

          <div style={styles.specsGrid}>
            <div style={styles.specCard}>
              <h4 style={styles.specTitle}>Frontend</h4>
              <ul style={styles.specList}>
                <li style={styles.specItem}>React 18+ com Next.js 13</li>
                <li style={styles.specItem}>TypeScript para tipagem estática</li>
                <li style={styles.specItem}>Tailwind CSS + CSS Modules</li>
                <li style={styles.specItem}>State Management com Zustand</li>
              </ul>
            </div>

            <div style={styles.specCard}>
              <h4 style={styles.specTitle}>Backend</h4>
              <ul style={styles.specList}>
                <li style={styles.specItem}>Node.js com Express.js</li>
                <li style={styles.specItem}>PostgreSQL para persistência</li>
                <li style={styles.specItem}>GraphQL API</li>
                <li style={styles.specItem}>Autenticação com JWT</li>
              </ul>
            </div>

            <div style={styles.specCard}>
              <h4 style={styles.specTitle}>Infraestrutura</h4>
              <ul style={styles.specList}>
                <li style={styles.specItem}>Docker para containerização</li>
                <li style={styles.specItem}>Kubernetes para orquestração</li>
                <li style={styles.specItem}>CI/CD com GitHub Actions</li>
                <li style={styles.specItem}>AWS ou GCP deployment</li>
              </ul>
            </div>

            <div style={styles.specCard}>
              <h4 style={styles.specTitle}>Segurança</h4>
              <ul style={styles.specList}>
                <li style={styles.specItem}>HTTPS/TLS encryption</li>
                <li style={styles.specItem}>Rate limiting e DDoS protection</li>
                <li style={styles.specItem}>RBAC (Role-Based Access Control)</li>
                <li style={styles.specItem}>Audit logging completo</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section style={styles.metricsSection}>
        <div style={styles.container}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricNumber}>98.5%</div>
              <div style={styles.metricLabel}>Disponibilidade</div>
              <div style={styles.metricBar}>
                <div style={{ ...styles.metricFill, width: "98.5%" }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricNumber}>&lt; 100ms</div>
              <div style={styles.metricLabel}>Latência Média</div>
              <div style={styles.metricBar}>
                <div style={{ ...styles.metricFill, width: "95%" }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricNumber}>500+</div>
              <div style={styles.metricLabel}>Ordens/Dia</div>
              <div style={styles.metricBar}>
                <div style={{ ...styles.metricFill, width: "85%" }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricNumber}>24h</div>
              <div style={styles.metricLabel}>Suporte</div>
              <div style={styles.metricBar}>
                <div style={{ ...styles.metricFill, width: "100%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <div style={styles.ctaInner}>
            <h2 style={styles.ctaTitle}>Explorar o Protótipo</h2>
            <p style={styles.ctaText}>
              Acesse a plataforma e experimente todas as funcionalidades do
              sistema de gestão industrial
            </p>
            <div style={styles.ctaActions}>
              <Link href="/signup" style={styles.ctaButtonPrimary}>
                Acessar Sistema
              </Link>
              <button style={styles.ctaButtonSecondary}>
                Documentação
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerContent}>
            <div style={styles.footerSection}>
              <div style={styles.footerLogo}>
                <div style={styles.logoMark}>⬡</div>
                <span>Ceny</span>
              </div>
              <p style={styles.footerDesc}>
                Plataforma de gestão industrial para o futuro
              </p>
            </div>

            <div style={styles.footerLinks}>
              <div>
                <h4 style={styles.footerTitle}>Produto</h4>
                <ul style={styles.footerList}>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      Recursos
                    </a>
                  </li>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      Documentação
                    </a>
                  </li>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      API
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={styles.footerTitle}>Projeto</h4>
                <ul style={styles.footerList}>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      Sobre
                    </a>
                  </li>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="#" style={styles.footerLink}>
                      Contato
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <p style={styles.footerCopy}>
              © 2026 Ceny. Projeto de conceito para gestão industrial
              integrada.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Carousel Styles
const carouselStyles = {
  section: {
    width: "100%",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    zIndex: 10,
  },

  carousel: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  bgPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
    zIndex: 1,
  },

  svgPattern: {
    width: "100%",
    height: "100%",
  },

  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.5) 100%)",
    zIndex: 2,
  },

  contentContainer: {
    position: "relative",
    zIndex: 3,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  textContent: {
    maxWidth: "700px",
    paddingX: "2rem",
    textAlign: "center",
    color: "#ffffff",
  },

  textFade: {
    transition: "opacity 0.3s ease",
  },

  title: {
    fontSize: "3.5rem",
    fontWeight: 700,
    margin: "0 0 1.25rem 0",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },

  subtitle: {
    fontSize: "1.375rem",
    fontWeight: 500,
    margin: "0 0 1rem 0",
    lineHeight: 1.5,
    opacity: 0.9,
  },

  description: {
    fontSize: "1rem",
    margin: "0 0 2rem 0",
    lineHeight: 1.6,
    opacity: 0.8,
  },

  ctaContainer: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  ctaPrimary: {
    padding: "0.875rem 2rem",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    textDecoration: "none",
    border: "1px solid #3b82f6",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "inline-block",
  },

  ctaSecondary: {
    padding: "0.875rem 2rem",
    backgroundColor: "transparent",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  navButtonLeft: {
    position: "absolute",
    left: "2rem",
    top: "50%",
    transform: "translateY(-50%)",
    width: "48px",
    height: "48px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    fontSize: "1.75rem",
    fontWeight: "300",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  navButtonRight: {
    position: "absolute",
    right: "2rem",
    top: "50%",
    transform: "translateY(-50%)",
    width: "48px",
    height: "48px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    fontSize: "1.75rem",
    fontWeight: "300",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  indicatorsContainer: {
    position: "absolute",
    bottom: "2rem",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "0.75rem",
    zIndex: 5,
  },

  indicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};

// Main Styles
const styles = {
  main: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    color: "#1f2937",
  },

  // Navigation
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    transition: "all 0.3s ease",
  },

  navContainer: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "2rem",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    cursor: "pointer",
  },

  logoMark: {
    fontSize: "1.5rem",
    color: "#2563eb",
    fontWeight: 700,
  },

  logoText: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1f2937",
    letterSpacing: "-0.5px",
  },

  navLinks: {
    display: "flex",
    gap: "2rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
    flex: 1,
  },

  navLink: {
    color: "#6b7280",
    textDecoration: "none",
    fontSize: "0.9375rem",
    fontWeight: 500,
    transition: "color 0.3s ease",
    cursor: "pointer",
  },

  loginBtn: {
    padding: "0.625rem 1.25rem",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    border: "1px solid #2563eb",
    transition: "all 0.3s ease",
    cursor: "pointer",
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  // Container
  container: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 2rem",
  },

  // Sections
  overview: {
    padding: "5rem 2rem",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  sectionHeader: {
    textAlign: "center",
    marginBottom: "3.5rem",
  },

  sectionTitle: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: "0 0 0.75rem 0",
    letterSpacing: "-0.01em",
  },

  sectionSubtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    margin: 0,
  },

  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "2rem",
  },

  overviewCard: {
    padding: "2.5rem 2rem",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    transition: "all 0.3s ease",
  },

  cardIcon: {
    fontSize: "2.5rem",
  },

  cardTitle: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: 0,
  },

  cardText: {
    fontSize: "0.9375rem",
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.6,
  },

  // Features
  features: {
    padding: "5rem 2rem",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },

  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
  },

  featureItem: {
    padding: "2rem",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },

  featureIcon: {
    fontSize: "1.5rem",
    color: "#2563eb",
    fontWeight: "bold",
  },

  featureTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: 0,
  },

  featureDesc: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: 0,
  },

  // Dashboard Section
  dashboardSection: {
    padding: "5rem 2rem",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  dashboardPreview: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
  },

  // Specs Section
  specsSection: {
    padding: "5rem 2rem",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },

  specsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
  },

  specCard: {
    padding: "2rem",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
  },

  specTitle: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: "0 0 1.25rem 0",
  },

  specList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },

  specItem: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: 0,
    paddingLeft: "1.5rem",
    position: "relative",
  },

  // Metrics Section
  metricsSection: {
    padding: "5rem 2rem",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "2rem",
  },

  metricCard: {
    padding: "2.5rem 2rem",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    textAlign: "center",
  },

  metricNumber: {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#2563eb",
    margin: "0 0 0.5rem 0",
  },

  metricLabel: {
    fontSize: "0.875rem",
    color: "#6b7280",
    fontWeight: 600,
    margin: "0 0 1rem 0",
  },

  metricBar: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    overflow: "hidden",
  },

  metricFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "3px",
    transition: "width 0.5s ease",
  },

  // CTA Section
  ctaSection: {
    padding: "5rem 2rem",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },

  ctaInner: {
    textAlign: "center",
  },

  ctaTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: "0 0 1rem 0",
  },

  ctaText: {
    fontSize: "1.0625rem",
    color: "#6b7280",
    margin: "0 0 2rem 0",
    maxWidth: "600px",
    marginLeft: "auto",
    marginRight: "auto",
  },

  ctaActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  ctaButtonPrimary: {
    padding: "0.875rem 2rem",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    textDecoration: "none",
    border: "1px solid #2563eb",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "inline-block",
  },

  ctaButtonSecondary: {
    padding: "0.875rem 2rem",
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  // Footer
  footer: {
    backgroundColor: "#1f2937",
    color: "#f3f4f6",
    padding: "4rem 2rem 2rem",
    borderTop: "1px solid #374151",
  },

  footerContent: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "4rem",
    marginBottom: "3rem",
    alignItems: "start",
  },

  footerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1.125rem",
    fontWeight: 700,
  },

  footerDesc: {
    fontSize: "0.875rem",
    color: "#d1d5db",
    margin: 0,
    maxWidth: "300px",
  },

  footerLinks: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "3rem",
  },

  footerTitle: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 1rem 0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  footerList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },

  footerLink: {
    color: "#d1d5db",
    textDecoration: "none",
    fontSize: "0.875rem",
    transition: "color 0.3s ease",
    cursor: "pointer",
  },

  footerBottom: {
    maxWidth: "1280px",
    margin: "0 auto",
    paddingTop: "2rem",
    borderTop: "1px solid #374151",
  },

  footerCopy: {
    fontSize: "0.875rem",
    color: "#d1d5db",
    margin: 0,
    textAlign: "center",
  },
};