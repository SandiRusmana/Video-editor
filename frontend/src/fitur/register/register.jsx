import React, { useState } from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./register.css";

function Register({ onRegisterBerhasil, onPindahKeLogin }) {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
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
      const response = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Validation error might return array of messages
        const errMsg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(errMsg || "Gagal mendaftar");
      }

      alert("Pendaftaran berhasil! Silakan masuk dengan akun Anda.");
      
      // Memanggil fungsi operan dari branch kamu atau kembali ke login
      if (onRegisterBerhasil) {
        onRegisterBerhasil();
      } else {
        onPindahKeLogin();
      }
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
              <h2>Buat akun baru</h2>
              <p>Mulai kelola proyek video anda</p>
            </div>

            {errorMsg && <p style={{ color: "red", textAlign: "center", marginBottom: "10px" }}>{errorMsg}</p>}

            <form className="form-login" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="name">Nama lengkap</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="Steven Ucok" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
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
                  placeholder="Masukkan kata sandi (min. 6 karakter)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="button-login" disabled={loading}>
                {loading ? "Mendaftar..." : "Daftar"}
              </button>
            </form>

            <p className="footer-login">
              Sudah punya akun? <b onClick={onPindahKeLogin} style={{cursor: "pointer"}}>Masuk</b>
            </p>
          </div>
        </div>
      </GradientBackground>
    </div>
  );
}

export default Register;