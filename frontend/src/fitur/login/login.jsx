import React from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./login.css";

function Login() {
  return (
    <div className="nerve-page">
      <GradientBackground>
        <div className="login-wraper">
          <div className="card-login">
            <div className="header-login">
              <h2>Selamat Datang Kembali</h2>
              <p>Masuk untuk melanjutkan</p>
            </div>

            <form className="form-login">
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
                Masuk
              </button>
            </form>

            <p className="footer-login">
              Belum punya akun? <b>Daftar</b>
            </p>
          </div>
        </div>
      </GradientBackground>
    </div>
  );
}

export default Login;
