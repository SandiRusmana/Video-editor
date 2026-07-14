import React, { useEffect, useState } from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./landingpage.css";

export default function LandingNerve({onPindahKeLogin,onPindahKeRegister}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="nerve-page">
      <GradientBackground className={loaded ? "nerve-loaded" : ""}>
        <div className="nerve-fade nerve-logo nerve-logo-row">
          <div className="nerve-logo-icon-wrap">
            <svg
              className="nerve-icon"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#c4b5fd" />
            </svg>
          </div>
          <span className="nerve-logo-text">NERVE</span>
        </div>

        <div className="nerve-center">
          <h1
            className="nerve-fade nerve-title"
            style={{ animationDelay: "0.15s" }}
          >
            Video editor
          </h1>
          <p
            className="nerve-fade nerve-subtitle"
            style={{ animationDelay: "0.3s" }}
          >
            Kelola dan edit videomu di sini.
          </p>

          <div
            className="nerve-fade nerve-button-row"
            style={{ animationDelay: "0.45s" }}
          >
            <button className="nerve-btn-login" onClick={onPindahKeLogin}>Login</button>
            <button className="nerve-btn-register" onClick={onPindahKeRegister}>Register</button>
          </div>
        </div>
      </GradientBackground>
    </div>
  );
}