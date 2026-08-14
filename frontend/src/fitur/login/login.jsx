import React, { useState } from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import { API_BASE } from "../../config/api.js";
import "./login.css";

function IconEye({ show }) {
  return show ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Login({ onLoginBerhasil, onPindahKeRegister }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal masuk");
      }

      // Simpan token supaya bisa dipakai di request API selanjutnya (misal ambil daftar project)
      localStorage.setItem("token", data.access_token);

      // Pindah ke halaman dashboard
      onLoginBerhasil();

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nerve-page">
      <GradientBackground>
        <div className="login-wraper">
          <div className="card-login">
            <div className="header-login">
              <h2>Selamat Datang Kembali</h2>
              <p>Masuk untuk melanjutkan</p>
            </div>

            {errorMsg && <p style={{ color: "red", textAlign: "center", marginBottom: "10px" }}>{errorMsg}</p>}

            <form className="form-login" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Alamat Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Email@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Kata Sandi</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Masukkan kata sandi"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    <IconEye show={showPassword} />
                  </button>
                </div>
              </div>

              <button type="submit" className="button-login" disabled={loading}>
                {loading ? "Masuk..." : "Masuk"}
              </button>
            </form>

            <p className="footer-login">
              Belum punya akun? <b onClick={onPindahKeRegister} style={{ cursor: "pointer" }}>Daftar</b>
            </p>
          </div>
        </div>
      </GradientBackground>
    </div>
  );
}

export default Login;