import React, { useState, useRef, useEffect } from "react";
import "./dashboard.css";
// Sesuaikan nama file logo dengan yang ada di folder assets kamu
import logo from "../../assets/logo.png";
import MediaPage from "./MediaPage.jsx";

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

export default function Dashboard({ namaUser = "Pengguna", logoUser, onBukaProject }) {
  const [activeTab, setActiveTab] = useState("projects"); // "projects" | "media" | "settings"
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  const sumberLogo = logoUser || logo;
  const inisialUser = namaUser.trim().charAt(0).toUpperCase();

  // Ambil daftar project milik user yang login, sekali saat halaman dibuka.
  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await apiFetch("/projects");
        if (isMounted) setProjects(data);
      } catch (err) {
        if (isMounted) setErrorMsg(err.message || "Gagal memuat daftar project");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProjects();
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

  const handleRename = async (id) => {
    const project = projects.find((p) => p.id === id);
    const newName = window.prompt("Ganti nama project:", project?.name || "");
    setActiveMenuId(null);
    if (!newName || !newName.trim()) return;

    try {
      const updated = await apiFetch(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      alert(err.message || "Gagal mengubah nama project");
    }
  };

  const handleDelete = async (id) => {
    setActiveMenuId(null);
    const confirmDelete = window.confirm("Yakin ingin menghapus project ini?");
    if (!confirmDelete) return;

    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message || "Gagal menghapus project");
    }
  };

  const handleNewProject = async () => {
    const name = window.prompt("Nama project baru:");
    if (!name || !name.trim()) return;

    try {
      const newProject = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setProjects((prev) => [...prev, newProject]);
    } catch (err) {
      alert(err.message || "Gagal membuat project baru");
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <img src={sumberLogo} alt="Logo" className="brand-logo" />
        </div>
        <div className="user-info">
          <div className="avatar">{inisialUser}</div>
          <span className="user-name">{namaUser}</span>
        </div>
      </header>

      <div className="body-wrap">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav-list">
            <button
              className={`nav-item${activeTab === "projects" ? " nav-item-active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              <IconFolder />
              <span>Projects</span>
            </button>
            <button
              className={`nav-item${activeTab === "media" ? " nav-item-active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              <IconMedia />
              <span>Media</span>
            </button>
            <button
              className={`nav-item${activeTab === "settings" ? " nav-item-active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <IconSettings />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        {activeTab === "media" ? (
          <MediaPage />
        ) : activeTab === "settings" ? (
          <main className="main-content">
            <h1 className="page-title">Settings</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Pengaturan akan segera hadir.
            </p>
          </main>
        ) : (
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
                  onClick={handleNewProject}
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
                            e.stopPropagation();
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
                                handleRename(project.id);
                              }}
                            >
                              <IconRename />
                              <span>Rename</span>
                            </button>
                            <button
                              className="dropdown-item dropdown-item-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project.id);
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
      </div>
    </div>
  );
}
