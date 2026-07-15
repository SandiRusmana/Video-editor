import React, { useState } from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./login.css";

function Login({ onLoginBerhasil, onPindahKeRegister }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      const response = await fetch("http://localhost:3000/auth/login", {
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

      alert("Berhasil masuk! Token: " + (data.access_token || data.token || "Berhasil"));
      // TODO: Simpan token ke localStorage dan arahkan ke dashboard
      // localStorage.setItem("token", data.access_token);
      
      // Memanggil fungsi operan agar pindah ke halaman dashboard
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
                <input
                  type="password"
                  id="password"
                  placeholder="Masukkan kata sandi"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="button-login" disabled={loading}>
                {loading ? "Masuk..." : "Masuk"}
              </button>
            </form>

            <p className="footer-login">
              Belum punya akun? <b onClick={onPindahKeRegister} style={{cursor: "pointer"}}>Daftar</b>
            </p>
          </div>
        </div>
      </GradientBackground>
    </div>
  );
}

export default Login;