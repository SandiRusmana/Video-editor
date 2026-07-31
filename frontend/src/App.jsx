import React, { useState, useEffect } from "react";
import LandingNerve from "./fitur/landing/landingpage.jsx";
import Login from "./fitur/login/login.jsx";
import Register from "./fitur/register/register.jsx";
import Dashboard from "./fitur/fitur-dashboard/dashboard.jsx";
import ProjectEditor from "./pages/project-editor/ProjectEditor.jsx";

function App() {
  const [halaman, setHalaman] = useState("landing");
  const [isVerifying, setIsVerifying] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setHalaman("landing");
      setIsVerifying(false);
      return;
    }

    // Verifikasi keaslian token ke backend API
    fetch("http://localhost:3000/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Sesi telah kedaluwarsa");
        return res.json();
      })
      .then(() => {
        setHalaman("dashboard");
      })
      .catch(() => {
        // Jika token tidak valid / expired, hapus token dan redirect ke Login
        localStorage.removeItem("token");
        setHalaman("login");
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, []);

  if (isVerifying) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#0a0b18",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8b8fb3",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "14px",
          gap: "10px",
        }}
      >
        <span>⏳ Memeriksa sesi login...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Kondisi pas di Landing Page */}
      {halaman === "landing" && (
        <LandingNerve
          onPindahKeLogin={() => setHalaman("login")}
          onPindahKeRegister={() => setHalaman("register")}
        />
      )}

      {/* 2. Kondisi pas tampil halaman Login */}
      {halaman === "login" && (
        <Login
          onLoginBerhasil={() => setHalaman("dashboard")}
          onPindahKeRegister={() => setHalaman("register")}
        />
      )}

      {/* 3. Kondisi pas tampil halaman Register */}
      {halaman === "register" && (
        <Register
          onRegisterBerhasil={() => setHalaman("dashboard")}
          onPindahKeLogin={() => setHalaman("login")}
        />
      )}

      {/* 4. Kondisi pas tampil halaman Dashboard */}
      {halaman === "dashboard" && (
        <Dashboard
          onBukaProject={(projectId, projectName) => {
            setSelectedProjectId(projectId);
            setSelectedProjectName(projectName);
            setHalaman("editor");
          }}
          onLogout={() => {
            localStorage.removeItem("token");
            setHalaman("landing");
          }}
        />
      )}

      {/* 5. Kondisi pas tampil halaman Project Editor */}
      {halaman === "editor" && (
        <ProjectEditor
          projectId={selectedProjectId}
          initialProjectName={selectedProjectName}
          onKembaliKeDashboard={() => setHalaman("dashboard")}
          onLogout={() => {
            localStorage.removeItem("token");
            setHalaman("landing");
          }}
        />
      )}
    </div>
  );
}

export default App;
