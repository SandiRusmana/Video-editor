import React from "react";
import GradientBackground from "../../component/background/GradientBackground.jsx";
import "./register.css";

function Register({ onRegisterBerhasil }) {
  const handleRegister = (e) => {
    e.preventDefault();

    // TODO: nanti di sini logika kirim data daftar akun ke backend tim kamu
    // contoh nanti kalau sudah ada API:
    // fetch("/api/register", { method: "POST", body: ... })
    //   .then(res => res.json())
    //   .then(data => {
    //     if (data.success) {
    //       onRegisterBerhasil();
    //     } else {
    //       alert("Pendaftaran gagal, coba lagi");
    //     }
    //   });

    // sementara ini langsung dianggap berhasil (belum ada backend)
    onRegisterBerhasil();
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

            <form className="form-login" onSubmit={handleRegister}>
              <div className="input-group">
                <label htmlFor="name">Nama lengkap</label>
                <input type="text" id="name" placeholder="Steven Ucok" />
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