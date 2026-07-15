import React from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./login.css";

function Login({ onLoginBerhasil }) {
  const handleLogin = (e) => {
    e.preventDefault();

    // TODO: nanti di sini logika cek email & password ke backend tim kamu
    // contoh nanti kalau sudah ada API:
    // fetch("/api/login", { method: "POST", body: ... })
    //   .then(res => res.json())
    //   .then(data => {
    //     if (data.success) {
    //       onLoginBerhasil();
    //     } else {
    //       alert("Email atau password salah");
    //     }
    //   });

    // sementara ini langsung dianggap berhasil (belum ada backend)
    onLoginBerhasil();
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

            <form className="form-login" onSubmit={handleLogin}>
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