import React, { useState, useRef, useEffect } from "react";
import "./dashboard.css";
// Sesuaikan nama file logo dengan yang ada di folder assets kamu
import logo from "../../assets/logo.png";
import MediaPage from "./media/MediaPage";
import SettingsPage from "./setting/SettingsPage";
import ExportHistoryPage from "./export-history/ExportHistoryPage";

const API_BASE = "http://localhost:3000";

function IconFolder() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function IconMedia() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M21 15l-5-5L5 19" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconExportHistory() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 18 15 15" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconClapper() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 8l1-3 12 3-1 3z" />
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
      <path d="M4 8l16 0" />
    </svg>
  );
}

function IconDots() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function IconRename() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

// Helper kecil supaya tiap fetch ke backend otomatis bawa token,
// dan melempar error yang jelas kalau responsnya gagal.
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

// Format tanggal ISO dari backend (createdAt) jadi dd-mm-yy sesuai tampilan lama
function formatTanggal(isoString) {
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export default function Dashboard({ onBukaProject, onLogout }) {
  const [activeTab, setActiveTab] = useState("projects"); // "projects" | "media" | "settings"
  const [projects, setProjects] = useState([]);
  const [namaUser, setNamaUser] = useState("Pengguna");
  const [logoUser, setLogoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const sumberLogo = logoUser || logo;
  const inisialUser = namaUser.trim().charAt(0).toUpperCase();

  // Ambil daftar project milik user yang login, sekali saat halaman dibuka.
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setErrorMsg("");
      try {
        // Ambil info user
        const userData = await apiFetch("/auth/me");
        if (isMounted && userData) {
          if (userData.name) {
            setNamaUser(userData.name);
          } else if (userData.email) {
            const emailPrefix = userData.email.split("@")[0];
            const fallbackName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            setNamaUser(fallbackName);
          }
        }

        // Ambil projects
        const data = await apiFetch("/projects");
        if (isMounted) setProjects(data);
      } catch (err) {
        if (isMounted) setErrorMsg(err.message || "Gagal memuat data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (id) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: null,
    title: "",
    inputValue: "",
    targetId: null,
    targetName: "",
  });

  const handleOpenCreateModal = () => {
    setModalConfig({
      isOpen: true,
      type: "create",
      title: "Buat Project Baru",
      inputValue: "",
      targetId: null,
      targetName: "",
    });
  };

  const handleOpenRenameModal = (id) => {
    setActiveMenuId(null);
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setModalConfig({
      isOpen: true,
      type: "rename",
      title: "Ubah Nama Project",
      inputValue: proj.name || "",
      targetId: id,
      targetName: proj.name || "",
    });
  };

  const handleOpenDeleteModal = (id) => {
    setActiveMenuId(null);
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setModalConfig({
      isOpen: true,
      type: "delete",
      title: "Hapus Project",
      inputValue: "",
      targetId: id,
      targetName: proj.name || "",
    });
  };

  const handleCloseModal = () => {
    setModalConfig({
      isOpen: false,
      type: null,
      title: "",
      inputValue: "",
      targetId: null,
      targetName: "",
    });
  };

  const handleSubmitModal = async (e) => {
    if (e) e.preventDefault();
    const { type, inputValue, targetId } = modalConfig;

    if (type === "create") {
      if (!inputValue || !inputValue.trim()) return;
      try {
        const newProject = await apiFetch("/projects", {
          method: "POST",
          body: JSON.stringify({ name: inputValue.trim() }),
        });
        setProjects((prev) => [...prev, newProject]);
        handleCloseModal();
      } catch (err) {
        alert(err.message || "Gagal membuat project baru");
      }
    } else if (type === "rename") {
      if (!inputValue || !inputValue.trim()) return;
      try {
        const updated = await apiFetch(`/projects/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: inputValue.trim() }),
        });
        setProjects((prev) => prev.map((p) => (p.id === targetId ? updated : p)));
        handleCloseModal();
      } catch (err) {
        alert(err.message || "Gagal mengubah nama project");
      }
    } else if (type === "delete") {
      try {
        await apiFetch(`/projects/${targetId}`, { method: "DELETE" });
        setProjects((prev) => prev.filter((p) => p.id !== targetId));
        handleCloseModal();
      } catch (err) {
        alert(err.message || "Gagal menghapus project");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <img src={sumberLogo} alt="Logo" className="brand-logo" />
        </div>
        <div 
          className="user-info" 
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <div className="avatar">{inisialUser}</div>
          <span className="user-name">{namaUser}</span>
          
          {showUserMenu && (
            <div className="dropdown-menu" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", zIndex: 10 }}>
              <button 
                className="dropdown-item dropdown-item-danger" 
                onClick={handleLogout}
              >
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="body-wrap">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav-list">
            <button
              className={`nav-item ${activeTab === "projects" ? "nav-item-active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              <IconFolder />
              <span>Projects</span>
            </button>
            <button
              className={`nav-item ${activeTab === "media" ? "nav-item-active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              <IconMedia />
              <span>Media</span>
            </button>
            <button
              className={`nav-item ${activeTab === "export-history" ? "nav-item-active" : ""}`}
              onClick={() => setActiveTab("export-history")}
            >
              <IconExportHistory />
              <span>Export History</span>
            </button>
            <button
              className={`nav-item ${activeTab === "settings" ? "nav-item-active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <IconSettings />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        {activeTab === "projects" && (
          <main className="main-content">
            <h1 className="page-title">My projects</h1>

            {loading && <p className="empty-state">Memuat daftar project...</p>}

            {!loading && errorMsg && (
              <p className="empty-state" style={{ color: "#ff6b6b" }}>
                {errorMsg}
              </p>
            )}

            {!loading && !errorMsg && (
              <div className="project-grid">
                {/* New project card */}
                <button
                  className="project-card new-project-card"
                  onClick={handleOpenCreateModal}
                >
                  <IconPlus />
                  <span>New project</span>
                </button>

                {/* Pesan kalau belum ada project */}
                {projects.length === 0 && (
                  <p className="empty-state">
                    Belum ada project. Klik "New project" untuk mulai.
                  </p>
                )}

                {/* Project cards */}
                {projects.map((project) => (
                  <div className="project-card existing-card" key={project.id}>
                    <div
                      className="card-thumb"
                      onClick={() => onBukaProject && onBukaProject(project.id, project.name)}
                      style={{ cursor: "pointer" }}
                    >
                      <IconClapper />
                      <div
                        className="card-menu-wrap"
                        ref={activeMenuId === project.id ? menuRef : null}
                      >
                        <button
                          className="dots-btn dots-btn-thumb"
                          onClick={(e) => {
                            e.stopPropagation(); // biar klik titik-tiga gak ikut buka project
                            toggleMenu(project.id);
                          }}
                          aria-label="Opsi project"
                        >
                          <IconDots />
                        </button>
                        {activeMenuId === project.id && (
                          <div className="dropdown-menu">
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRenameModal(project.id);
                              }}
                            >
                              <IconRename />
                              <span>Rename</span>
                            </button>
                            <button
                              className="dropdown-item dropdown-item-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteModal(project.id);
                              }}
                            >
                              <IconDelete />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-info">
                      <div className="card-info-text">
                        <p className="card-title">{project.name}</p>
                        <p className="card-subtitle">
                          Dibuat: {formatTanggal(project.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {activeTab === "media" && <MediaPage />}
        {activeTab === "export-history" && <ExportHistoryPage />}
        {activeTab === "settings" && <SettingsPage />}
      </div>

      {/* Custom Project Modal Dialog */}
      {modalConfig.isOpen && (
        <div className="project-modal-backdrop" onClick={handleCloseModal}>
          <div className="project-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="project-modal-header">
              <h3>{modalConfig.title}</h3>
              <button className="project-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="project-modal-body">
                {modalConfig.type === "delete" ? (
                  <p className="project-modal-desc">
                    Apakah Anda yakin ingin menghapus project <strong style={{ color: "#ffffff" }}>"{modalConfig.targetName}"</strong>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                ) : (
                  <div className="project-modal-field">
                    <label>NAMA PROJECT</label>
                    <input
                      type="text"
                      className="project-modal-input"
                      value={modalConfig.inputValue}
                      onChange={(e) => setModalConfig({ ...modalConfig, inputValue: e.target.value })}
                      placeholder="Masukkan nama project..."
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="project-modal-footer">
                <button type="button" className="project-modal-btn project-modal-btn-cancel" onClick={handleCloseModal}>
                  Batal
                </button>
                <button
                  type="submit"
                  className={`project-modal-btn ${modalConfig.type === "delete" ? "project-modal-btn-danger" : "project-modal-btn-primary"}`}
                >
                  {modalConfig.type === "delete" ? "Hapus Project" : modalConfig.type === "rename" ? "Simpan" : "Buat Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
