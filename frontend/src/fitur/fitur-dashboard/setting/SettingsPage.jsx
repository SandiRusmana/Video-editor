import React, { useState, useEffect } from "react";
import "./SettingsPage.css";

const API_BASE = "http://localhost:3000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Request gagal (${res.status})`);
  }
  return data;
}

export default function SettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState("profile"); // "profile" | "preferences" | "security"
  const [userData, setUserData] = useState({ name: "Asep", email: "asep@gmail.com" });

  // Password fields
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Preferences fields
  const [preferences, setPreferences] = useState({
    theme: "dark",
    language: "id",
    notifications: true
  });

  // Security fields
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Fetch profile me on mount
  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => {
        if (data) {
          const email = data.email || "asep@gmail.com";
          const emailPrefix = email.split("@")[0];
          const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          setUserData({ name, email });
        }
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Konfirmasi kata sandi baru tidak cocok!");
      return;
    }
    alert("Kata sandi berhasil diperbarui!");
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handlePrefChange = (name, value) => {
    setPreferences({ ...preferences, [name]: value });
  };

  const handlePrefSubmit = (e) => {
    e.preventDefault();
    alert("Preferensi berhasil disimpan!");
  };

  const toggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
    alert(`2FA berhasil ${!is2FAEnabled ? "diaktifkan" : "dinonaktifkan"}!`);
  };

  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Account Settings</h1>

      <div className="settings-page__container">
        {/* Sidebar Navigasi internal */}
        <aside className="settings-page__sidebar">
          <button
            className={`settings-nav-item ${activeSubTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveSubTab("profile")}
          >
            Profile
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === "preferences" ? "active" : ""}`}
            onClick={() => setActiveSubTab("preferences")}
          >
            Preferences
          </button>
          <button
            className={`settings-nav-item ${activeSubTab === "security" ? "active" : ""}`}
            onClick={() => setActiveSubTab("security")}
          >
            Security
          </button>
        </aside>

        {/* Panel Detail Konten */}
        <main className="settings-page__content">
          {/* PROFILE SUB-TAB */}
          {activeSubTab === "profile" && (
            <div className="settings-section">
              <div className="profile-info-row">
                <div className="profile-avatar">
                  {userData.name ? userData.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="profile-text-details">
                  <div className="profile-field">
                    <label>Username</label>
                    <span>{userData.name}</span>
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <span>{userData.email}</span>
                  </div>
                </div>
                <div className="profile-avatar-actions">
                  <button className="btn-upload" onClick={() => alert("Fitur upload avatar segera hadir!")}>Upload</button>
                  <button className="btn-remove" onClick={() => alert("Avatar dihapus!")}>Remove</button>
                </div>
              </div>

              <hr className="settings-divider" />

              <form onSubmit={handlePasswordSubmit} className="change-password-form">
                <h3>Change Password</h3>

                <div className="form-group">
                  <label htmlFor="currentPassword">Current password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    placeholder="*************"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <button type="submit" className="settings-btn-primary">
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* PREFERENCES SUB-TAB */}
          {activeSubTab === "preferences" && (
            <form onSubmit={handlePrefSubmit} className="settings-section">
              <div className="pref-group">
                <h3>App Theme</h3>
                <div className="theme-options">
                  <label className="theme-option">
                    <input
                      type="radio"
                      name="theme"
                      checked={preferences.theme === "dark"}
                      onChange={() => handlePrefChange("theme", "dark")}
                    />
                    <span className="theme-radio-custom"></span>
                    Dark Mode
                  </label>
                  <label className="theme-option">
                    <input
                      type="radio"
                      name="theme"
                      checked={preferences.theme === "light"}
                      onChange={() => handlePrefChange("theme", "light")}
                    />
                    <span className="theme-radio-custom"></span>
                    Light Mode
                  </label>
                </div>
              </div>

              <div className="pref-group">
                <h3>Language/Bahasa</h3>
                <select
                  className="language-select"
                  value={preferences.language}
                  onChange={(e) => handlePrefChange("language", e.target.value)}
                >
                  <option value="id">Indonesian (ID)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="pref-group">
                <h3>Notifications</h3>
                <label className="notification-checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => handlePrefChange("notifications", e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  Aktifkan notifikasi browser saat selesai export
                </label>
              </div>

              <button type="submit" className="settings-btn-primary">
                Save preferences
              </button>
            </form>
          )}

          {/* SECURITY SUB-TAB */}
          {activeSubTab === "security" && (
            <div className="settings-section">
              <div className="security-item-row">
                <div className="security-item-left">
                  <h3>Two-Factor Authentication (2FA)</h3>
                  <div className="tfa-status-wrapper">
                    <span>Status: </span>
                    <span className={`tfa-badge ${is2FAEnabled ? "active" : "inactive"}`}>
                      {is2FAEnabled ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
                <button className="settings-btn-secondary" onClick={toggle2FA}>
                  {is2FAEnabled ? "Nonaktifkan 2FA" : "Aktifkan 2FA"}
                </button>
              </div>

              <div className="security-section-group">
                <h3>Device History</h3>
                <div className="device-history-list">
                  <div className="device-history-item">
                    <div className="device-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <div className="device-info-text">
                      <span className="device-name">Device history</span>
                      <span className="device-loc">Cianjur, Indonesia</span>
                    </div>
                    <span className="device-badge">Perangkat ini</span>
                  </div>

                  <div className="device-history-item">
                    <div className="device-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="3" />
                      </svg>
                    </div>
                    <div className="device-info-text">
                      <span className="device-name">Android Phone</span>
                      <span className="device-loc">Bandung, Indonesia</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn-text-action"
                  onClick={() => alert("Berhasil logout dari perangkat lain!")}
                >
                  Logout dari semua perangkat lain
                </button>
              </div>

              <div className="danger-zone-section">
                <h3>Danger Zone</h3>
                <div className="danger-zone-box">
                  <p className="danger-zone-text">
                    Menghapus akun akan menghapus semua proyek dan media secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </p>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      const confirm = window.confirm("Apakah Anda yakin ingin menghapus akun Anda secara permanen?");
                      if (confirm) alert("Akun berhasil dihapus permanen.");
                    }}
                  >
                    Hapus akun Permanen
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
