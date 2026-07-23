import React, { useState } from "react";
import LandingNerve from "./fitur/landing/landingpage.jsx";
import Login from "./fitur/login/login.jsx";
import Register from "./fitur/register/register.jsx";
import Dashboard from "./fitur/fitur-dashboard/dashboard.jsx";
import ProjectEditor from "./pages/project-editor/ProjectEditor.jsx";

function App() {
  const [halaman, setHalaman] = useState(() =>
  localStorage.getItem("token") ? "dashboard" : "landing"
);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState("");

  return (
    <div>
      {/* 1. Kondisi pas di Landing Page (Kirim dua fungsi operan sekaligus) */}
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
        />
      )}

      {/* 5. Kondisi pas tampil halaman Project Editor */}
      {halaman === "editor" && (
        <ProjectEditor
          projectId={selectedProjectId}
          initialProjectName={selectedProjectName}
          onKembaliKeDashboard={() => setHalaman("dashboard")}
          onLogout={() => setHalaman("landing")}
        />
      )}
    </div>
  );
}

export default App;
