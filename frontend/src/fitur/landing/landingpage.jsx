import React, { useEffect, useState } from "react";
import "./landingpage.css";
import editorImage from "../../assets/image.png";

export default function LandingNerve({ onPindahKeLogin, onPindahKeRegister }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className="landing-navbar">
        <div className="landing-navbar-brand">
          <div className="landing-navbar-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#fff" />
            </svg>
          </div>
          <span className="landing-navbar-logo-text">NERVE</span>
        </div>

        <ul className="landing-navbar-links">
          <li><a href="#fitur">Fitur</a></li>
          <li><a href="#cara-kerja">Cara Kerja</a></li>
          <li><a href="#blog">Blog</a></li>
          <li><a href="#bantuan">Bantuan</a></li>
        </ul>

        <div className="landing-navbar-actions">
          <button className="landing-btn-masuk" onClick={onPindahKeLogin}>
            Masuk
          </button>
          <button className="landing-btn-daftar" onClick={onPindahKeRegister}>
            Daftar
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
            <button className="landing-btn-primary" onClick={onPindahKeLogin}>
              Mulai Mengedit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16l4-4-4-4" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
            <button className="landing-btn-outline" onClick={() => {}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
              Lihat Demo
            </button>
          </div>

          <div className={`landing-hero-features ${loaded ? "landing-anim-fade-up landing-anim-delay-5" : ""}`}>
            <div className="landing-feature-item">
              <span className="landing-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              Tanpa Watermark
            </div>
            <div className="landing-feature-item">
              <span className="landing-feature-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              100% Gratis Untuk Memulai
            </div>
          </div>
        </div>

        {/* RIGHT: Editor Screenshot */}
        <div className={`landing-hero-right ${loaded ? "landing-anim-slide-right" : ""}`}>
          <div className="landing-mockup-img-wrap landing-mockup-float">
            <img
              src={editorImage}
              alt="NERVE Video Editor Interface"
              className="landing-mockup-img"
            />
          </div>
        </div>
      </section>
    </div>
  );
}