import React, { useEffect, useState, useRef, useCallback } from "react";
import "./landingpage.css";
import uinerveImg from "../../assets/uinarve.jpeg";
import clipImg from "../../assets/clip.png";
import petirImg from "../../assets/petir.png";
import logoImg from "../../assets/logo.png";

/* ===== Floating Particles Component ===== */
function FloatingParticles() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    const count = 40;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = performance.now() * 0.001;

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulse = Math.sin(t * p.pulseSpeed * 10 + p.pulsePhase) * 0.15 + 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity * pulse})`;
        ctx.fill();
      });

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-particles-canvas" />;
}

/* ===== Animated Counter Component ===== */
function AnimatedCounter({ target, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="landing-counter-value">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ===== Custom Hook: Intersection Observer Reveal ===== */
function useRevealOnScroll(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

export default function LandingNerve({ onPindahKeLogin, onPindahKeRegister }) {
  const [loaded, setLoaded] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 3D Tilt Effect state for Hero Image
  const heroImageRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});

  // Mouse spotlight state for feature cards
  const featureGridRef = useRef(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });

  // Section reveal refs
  const [trustedRef, trustedVisible] = useRevealOnScroll();
  const [featuresRef, featuresVisible] = useRevealOnScroll();
  const [stepsRef, stepsVisible] = useRevealOnScroll();
  const [ctaRef, ctaVisible] = useRevealOnScroll();
  const [statsRef, statsVisible] = useRevealOnScroll();

  // Auto-advance steps
  const stepIntervalRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Navbar scroll effect + scroll-to-top
  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 60);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-advance steps when section is visible
  useEffect(() => {
    if (!stepsVisible) return;
    stepIntervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 3000);
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, [stepsVisible]);

  // Pause auto-advance on manual click
  const handleStepClick = (num) => {
    setActiveStep(num);
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    // Restart after 6 seconds of inactivity
    stepIntervalRef.current = setTimeout(() => {
      stepIntervalRef.current = setInterval(() => {
        setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
      }, 3000);
    }, 6000);
  };

  // Smooth scroll for nav links
  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle Mouse Move for 3D Tilt Effect on Editor Screenshot
  const handleMouseMove = (e) => {
    if (!heroImageRef.current) return;
    const rect = heroImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s ease",
    });
  };

  // Mouse spotlight on feature cards
  const handleFeatureGridMouseMove = useCallback((e) => {
    if (!featureGridRef.current) return;
    const rect = featureGridRef.current.getBoundingClientRect();
    setSpotlightPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  // Close demo modal on Escape
  useEffect(() => {
    if (!showDemoModal) return;
    const onKey = (e) => { if (e.key === "Escape") setShowDemoModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDemoModal]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showDemoModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showDemoModal]);

  const featuresList = [
    {
      id: 1,
      title: "Potong & Gabung",
      desc: "Potong, trim, dan gabungkan klip dengan mudah dan presisi.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: 2,
      title: "Putar Video",
      desc: "Putar video 90°, 180°, atau bebas sesuai kebutuhanmu.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      ),
    },
    {
      id: 3,
      title: "Tambah Teks",
      desc: "Tambahkan teks dan judul ke dalam videomu.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="9" y1="20" x2="15" y2="20" />
        </svg>
      ),
    },
    {
      id: 4,
      title: "Filter & Efek",
      desc: "Berikan sentuhan kreatif dengan filter dan efek.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 4-2 2 2 2 2-2-2-2Z" />
          <path d="m18 13-1.5 1.5 1.5 1.5 1.5-1.5-1.5-1.5Z" />
          <path d="M2 22l10-10" />
          <path d="M12 2v4" />
          <path d="M4 12H2" />
        </svg>
      ),
    },
    {
      id: 5,
      title: "Ekspor Cepat",
      desc: "Ekspor video berkualitas tinggi dengan cepat.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          <path d="M12 13v6" />
          <path d="m9 16 3 3 3-3" />
        </svg>
      ),
    },
  ];

  const stepsList = [
    {
      num: 1,
      title: "Unggah",
      desc: "Unggah video dari perangkatmu.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          <path d="M12 13V7" />
          <path d="m9 10 3-3 3 3" />
        </svg>
      ),
    },
    {
      num: 2,
      title: "Edit",
      desc: "Potong, tambah teks, efek, dan lainnya.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      num: 3,
      title: "Ekspor",
      desc: "Ekspor video dengan kualitas terbaik.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      num: 4,
      title: "Unduh",
      desc: "Unduh dan bagikan videomu ke mana saja.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
  ];

  const statsList = [
    { value: 10000, suffix: "+", label: "Kreator Aktif" },
    { value: 500000, suffix: "+", label: "Video Diekspor" },
    { value: 99, suffix: "%", label: "Uptime Server" },
    { value: 4.9, suffix: "/5", label: "Rating Pengguna", isDecimal: true },
  ];

  return (
    <div className="landing-page">
      {/* ===== FLOATING PARTICLES ===== */}
      <FloatingParticles />

      {/* ===== NAVBAR ===== */}
      <nav className={`landing-navbar ${navScrolled ? "scrolled" : ""}`}>
        <div className="landing-navbar-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="landing-navbar-icon-wrap">
            <img src={petirImg} alt="NERVE Logo" className="landing-brand-img" />
          </div>
          <span className="landing-navbar-logo-text">NERVE</span>
        </div>

        <ul className={`landing-navbar-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <li><a href="#fitur" onClick={(e) => handleNavClick(e, "fitur")}>Fitur</a></li>
          <li><a href="#cara-kerja" onClick={(e) => handleNavClick(e, "cara-kerja")}>Cara Kerja</a></li>
          <li><a href="#blog" onClick={(e) => handleNavClick(e, "blog")}>Blog</a></li>
          <li><a href="#bantuan" onClick={(e) => handleNavClick(e, "bantuan")}>Bantuan</a></li>
        </ul>

        <div className="landing-navbar-actions">
          <button className="landing-btn-masuk" onClick={onPindahKeLogin}>
            Masuk
          </button>
          <button className="landing-btn-daftar" onClick={onPindahKeRegister}>
            Daftar
          </button>
          {/* Mobile Hamburger */}
          <button
            className={`landing-hamburger ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="landing-hero">
        {/* LEFT: Text Content */}
        <div className="landing-hero-left">
          <div className={`landing-badge ${loaded ? "landing-anim-fade-up landing-anim-delay-1" : ""}`}>
            <span className="landing-badge-icon">✦</span>
            Editor Video Online untuk Kreator
          </div>

          <h1 className={`landing-hero-title ${loaded ? "landing-anim-fade-up landing-anim-delay-2" : ""}`}>
            <span className="landing-hero-title-line">Edit Video</span>
            <span className="landing-hero-title-line landing-hero-title-gradient">Jadi Lebih Mudah</span>
            <span className="landing-hero-title-line">dan Profesional</span>
          </h1>

          <p className={`landing-hero-desc ${loaded ? "landing-anim-fade-up landing-anim-delay-3" : ""}`}>
            Potong, gabungkan, tambahkan efek, dan ekspor video berkualitas tinggi langsung dari browser. Tanpa instalasi, tanpa ribet.
          </p>

          <div className={`landing-hero-cta ${loaded ? "landing-anim-fade-up landing-anim-delay-4" : ""}`}>
            <button className="landing-btn-primary landing-btn-pulse" onClick={onPindahKeRegister}>
              <span>Mulai Mengedit</span>
              <span className="landing-btn-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
            <button className="landing-btn-outline" onClick={() => setShowDemoModal(true)}>
              <span className="landing-btn-play-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </span>
              Lihat Demo
            </button>
          </div>

          <div className={`landing-hero-features ${loaded ? "landing-anim-fade-up landing-anim-delay-5" : ""}`}>
            <div className="landing-feature-item">
              <span className="landing-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </span>
              Tanpa Watermark
            </div>
            <div className="landing-feature-item">
              <span className="landing-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" />
                </svg>
              </span>
              100% Gratis Untuk Memulai
            </div>
          </div>
        </div>

        {/* RIGHT: Editor Screenshot */}
        <div className={`landing-hero-right ${loaded ? "landing-anim-slide-right" : ""}`}>
          <div
            className="landing-mockup-img-wrap"
            ref={heroImageRef}
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setShowDemoModal(true)}
            title="Klik untuk memperbesar preview"
          >
            <img
              src={uinerveImg}
              alt="NERVE Video Editor Interface"
              className="landing-mockup-img"
            />
            <div className="landing-mockup-glow"></div>
            <div className="landing-mockup-shine"></div>
            <div className="landing-mockup-expand-badge">
              <span>🔍 Klik untuk Demo</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY SECTION ===== */}
      <section className={`landing-trusted ${trustedVisible ? "landing-reveal" : "landing-reveal-hidden"}`} ref={trustedRef}>
        <p className="landing-trusted-title">Dipercaya oleh kreator dari berbagai platform</p>
        <div className="landing-trusted-logos">
          {["Google", "YouTube", "Binance", "Discord", "TikTok"].map((name, i) => (
            <div className="landing-logo-item" key={name} style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="landing-logo-text">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className={`landing-section landing-stats-section ${statsVisible ? "landing-reveal" : "landing-reveal-hidden"}`} ref={statsRef} id="stats">
        <div className="landing-stats-grid">
          {statsList.map((stat, i) => (
            <div className="landing-stat-card" key={i}>
              <div className="landing-stat-value">
                {stat.isDecimal ? (
                  <span className="landing-counter-value">{statsVisible ? stat.value : 0}{stat.suffix}</span>
                ) : (
                  statsVisible && <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                )}
              </div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FITUR UNGGULAN SECTION ===== */}
      <section
        id="fitur"
        className={`landing-section landing-features-section ${featuresVisible ? "landing-reveal" : "landing-reveal-hidden"}`}
        ref={featuresRef}
      >
        <div className="landing-section-header">
          <div className="landing-badge">FITUR UNGGULAN</div>
          <h2 className="landing-section-title">
            Semua Fitur yang Kamu Butuhkan <br />
            untuk <span className="landing-hero-title-gradient">Karya Terbaikmu</span>
          </h2>
        </div>

        <div
          className="landing-features-grid"
          ref={featureGridRef}
          onMouseMove={handleFeatureGridMouseMove}
        >
          {/* Mouse-follow spotlight overlay */}
          <div
            className="landing-features-spotlight"
            style={{
              background: `radial-gradient(400px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(139, 92, 246, 0.08), transparent 60%)`,
            }}
          ></div>

          {featuresList.map((feat, index) => (
            <div
              key={feat.id}
              className={`landing-feature-card ${activeFeatureIndex === index ? "active" : ""}`}
              onMouseEnter={() => setActiveFeatureIndex(index)}
              onMouseLeave={() => setActiveFeatureIndex(null)}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="landing-feature-card-icon">
                {feat.icon}
              </div>
              <h3 className="landing-feature-card-title">{feat.title}</h3>
              <p className="landing-feature-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CARA KERJA SECTION ===== */}
      <section
        id="cara-kerja"
        className={`landing-section landing-steps-section ${stepsVisible ? "landing-reveal" : "landing-reveal-hidden"}`}
        ref={stepsRef}
      >
        <div className="landing-section-header">
          <div className="landing-badge">CARA KERJA</div>
          <h2 className="landing-section-title">Edit Video dalam 4 Langkah Mudah</h2>
        </div>

        <div className="landing-steps-container">
          <div className="landing-steps-track">
            {stepsList.map((step) => {
              const isActive = activeStep >= step.num;
              return (
                <React.Fragment key={step.num}>
                  <div
                    className={`landing-step-item ${isActive ? "active" : ""} ${activeStep === step.num ? "current" : ""}`}
                    onClick={() => handleStepClick(step.num)}
                    title={`Klik untuk lihat langkah ${step.num}`}
                  >
                    <div className="landing-step-top">
                      <div className="landing-step-number">
                        <span className="landing-step-number-text">{step.num}</span>
                        {activeStep === step.num && <div className="landing-step-ring-pulse" />}
                      </div>
                      <div className="landing-step-icon">{step.icon}</div>
                    </div>
                    <h3 className="landing-step-title">{step.title}</h3>
                    <p className="landing-step-desc">{step.desc}</p>
                  </div>
                  {step.num < 4 && (
                    <div className={`landing-step-line ${activeStep > step.num ? "active" : ""}`}>
                      <div className="landing-step-line-fill" style={{ width: activeStep > step.num ? "100%" : "0%" }} />
                      <div className="landing-step-line-dot"></div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER SECTION ===== */}
      <section className={`landing-cta-banner-wrapper ${ctaVisible ? "landing-reveal" : "landing-reveal-hidden"}`} ref={ctaRef}>
        <div className="landing-cta-banner">
          <div className="landing-cta-left">
            <h2 className="landing-cta-title">
              Siap Membuat Video <br />
              <span className="landing-hero-title-gradient">Menakjubkan?</span>
            </h2>
            <p className="landing-cta-desc">
              Bergabunglah dengan ribuan kreator yang sudah menggunakan NERVE untuk berkarya.
            </p>
            <div className="landing-cta-action">
              <button className="landing-btn-primary landing-btn-pulse" onClick={onPindahKeRegister}>
                <span>Mulai Mengedit</span>
                <span className="landing-btn-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </button>
              <span className="landing-cta-note">Tidak perlu Berbayar</span>
            </div>
          </div>
          <div className="landing-cta-right">
            <div className="landing-cta-img-wrap">
              <img src={clipImg} alt="NERVE Film Clapboard 3D" className="landing-cta-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <div className="landing-navbar-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="landing-navbar-icon-wrap">
                <img src={petirImg} alt="NERVE Logo" className="landing-brand-img" />
              </div>
              <span className="landing-navbar-logo-text">NERVE</span>
            </div>
            <p className="landing-footer-tagline">
              Editor video profesional untuk membuat, mengedit, dan berbagi cerita.
            </p>
            <div className="landing-footer-socials">
              <a href="#twitter" aria-label="Twitter" className="landing-social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="#x" aria-label="X" className="landing-social-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#youtube" aria-label="YouTube" className="landing-social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z"/>
                </svg>
              </a>
              <a href="#discord" aria-label="Discord" className="landing-social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>PRODUK</h4>
              <ul>
                <li><a href="#fitur">Fitur</a></li>
                <li><a href="#perubahan">Perubahan</a></li>
                <li><a href="#peta-jalan">Peta Jalan</a></li>
              </ul>
            </div>
            <div className="landing-footer-col">
              <h4>SUMBER DAYA</h4>
              <ul>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#tutorial">Tutorial</a></li>
                <li><a href="#bantuan">Pusat Bantuan</a></li>
                <li><a href="#komunitas">Komunitas</a></li>
              </ul>
            </div>
            <div className="landing-footer-col">
              <h4>PERUSAHAAN</h4>
              <ul>
                <li><a href="#tentang">Tentang Kami</a></li>
                <li><a href="#karier">Karier</a></li>
                <li><a href="#kontak">Kontak</a></li>
                <li><a href="#privasi">Kebijakan Privasi</a></li>
              </ul>
            </div>
            <div className="landing-footer-col">
              <h4>LEGAL</h4>
              <ul>
                <li><a href="#syarat">Syarat & Ketentuan</a></li>
                <li><a href="#privasi-legal">Kebijakan Privasi</a></li>
                <li><a href="#cookie">Kebijakan Cookie</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>© 2026 NERVE. Semua hak dilindungi.</p>
        </div>
      </footer>

      {/* ===== SCROLL TO TOP BUTTON ===== */}
      <button
        className={`landing-scroll-top ${showScrollTop ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 11 12 6 7 11" />
          <line x1="12" y1="6" x2="12" y2="18" />
        </svg>
      </button>

      {/* ===== INTERACTIVE DEMO MODAL ===== */}
      {showDemoModal && (
        <div className="landing-modal-backdrop" onClick={() => setShowDemoModal(false)}>
          <div className="landing-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="landing-modal-header">
              <div className="landing-modal-title">
                <span className="landing-badge-icon">✦</span>
                <span>NERVE Editor Preview</span>
              </div>
              <button className="landing-modal-close" onClick={() => setShowDemoModal(false)}>
                &times;
              </button>
            </div>
            <div className="landing-modal-body">
              <img src={uinerveImg} alt="NERVE Interactive Demo" className="landing-modal-img" />
              <div className="landing-modal-overlay-badge">
                <p>⚡ Interaktif Online Video Editor dengan Performa Maksimal</p>
                <button className="landing-btn-primary" onClick={() => { setShowDemoModal(false); onPindahKeRegister(); }}>
                  Coba Sekarang — Gratis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}