import React from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./register.css";

function Register() {
  return (
    <div className="nerve-page">
      <GradientBackground>
        <div className="login-wraper">
          <div className="card-login">
            <div className="header-login">
              <h2>Buat akun baru</h2>
              <p>Mulai kelola proyek video anda</p>
            </div>

            <form className="form-login">
              <div className="input-group">
                <label htmlFor="name">Nama lengkap</label>
                <input type="name" id="name" placeholder="Steven Ucok" />
              </div>
              <div className="input-group">
                <label htmlFor="email">Alamat Email</label>
                <input type="email" id="email" placeholder="Email@email.com" />
              </div>

              <div className="input-group">
                <label htmlFor="password">Kata Sandi</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Masukkan kata sandi"
                />
              </div>

              <button type="submit" className="button-login">
                Daftar
              </button>
            </form>

            <p className="footer-login">
              Sudah punya akun? <b>Masuk</b>
            </p>
          </div>
        </div>
      </GradientBackground>
      </div>
  );
}

export default Register;
