import React, { useState } from "react";
import LandingNerve from "./fitur/landing/landingpage.jsx"; // Sesuaikan jalurnya ya bray
import Login from "./fitur/login/login.jsx";
import Register from "./fitur/register/register.jsx"; // Import file registernya bray

function App() {
  const [halaman, setHalaman] = useState("landing");

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
        <Login onPindahKeRegister={() => setHalaman("register")} />
      )}

      {/* 3. Kondisi pas tampil halaman Register */}
      {halaman === "register" && (
        <Register onPindahKeLogin={() => setHalaman("login")} />
      )}
    </div>
  );
}

export default App;
