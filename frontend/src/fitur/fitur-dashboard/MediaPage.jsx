import React, { useState, useEffect, useRef, useCallback } from "react";
import "./MediaPage.css";

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

function formatDuration(sec) {
  if (!sec && sec !== 0) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Icons
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="15" height="12" rx="2" />
      <path d="m17 10 5-3v10l-5-3V10z" />
    </svg>
  );
}

function IconAudio() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 20" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function IconWaveform() {
  return (
    <svg viewBox="0 0 40 16" width="36" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M0 8 Q5 2 10 8 Q15 14 20 8 Q25 2 30 8 Q35 14 40 8" />
    </svg>
  );
}

// ─── Upload Box ──────────────────────────────────────────────────────────────
function UploadBox({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((f) => onUpload(f));
  };

  return (
    <div
      className={`media-upload-box${dragging ? " media-upload-box--drag" : ""}${uploading ? " media-upload-box--uploading" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: "none" }}
        accept="video/*,audio/*,image/*"
        multiple
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div className="media-upload-box__icon">
        {uploading ? <div className="spinner" /> : <IconUpload />}
      </div>
      <span className="media-upload-box__label">
        {uploading ? "Mengunggah..." : "Upload Media"}
      </span>
    </div>
  );
}

// ─── Video Card (Grid) ───────────────────────────────────────────────────────
function VideoCard({ media, onDelete }) {
  return (
    <div className="media-card media-card--video">
      <div className="media-card__thumb media-card__thumb--video">
        {media.thumbnail ? (
          <img src={`${API_BASE}${media.thumbnail}`} alt={media.name} className="media-card__img" />
        ) : (
          <IconVideo />
        )}
        {media.duration && (
          <span className="media-card__badge">{formatDuration(media.duration)}</span>
        )}
      </div>
      <div className="media-card__footer">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="media-card__name" title={media.name}>{media.name}</span>
          {media.size && <div className="media-card__size">{formatSize(media.size)}</div>}
        </div>
        <button className="media-card__del" onClick={() => onDelete(media.id)} title="Hapus">
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ─── Audio Row ───────────────────────────────────────────────────────────────
function AudioRow({ media, onDelete }) {
  return (
    <div className="audio-row">
      <div className="audio-row__icon">
        <IconAudio />
      </div>
      <div className="audio-row__wave">
        <IconWaveform />
      </div>
      <span className="audio-row__name" title={media.name}>{media.name}</span>
      {media.duration && (
        <span className="audio-row__dur">{formatDuration(media.duration)}</span>
      )}
      <button className="audio-row__del" onClick={() => onDelete(media.id)} title="Hapus">
        <IconTrash />
      </button>
    </div>
  );
}

// ─── Image Card (Grid) ───────────────────────────────────────────────────────
function ImageCard({ media, onDelete }) {
  return (
    <div className="media-card media-card--image">
      <div className="media-card__thumb media-card__thumb--image">
        {media.thumbnail ? (
          <img src={`${API_BASE}${media.thumbnail}`} alt={media.name} className="media-card__img" />
        ) : (
          <IconImage />
        )}
      </div>
      <div className="media-card__footer">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="media-card__name" title={media.name}>{media.name}</span>
          {media.size && <div className="media-card__size">{formatSize(media.size)}</div>}
        </div>
        <button className="media-card__del" onClick={() => onDelete(media.id)} title="Hapus">
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ─── List Row (universal) ────────────────────────────────────────────────────
function ListRow({ media, onDelete }) {
  const typeLabel = { video: "Video", audio: "Audio", image: "Gambar" };
  return (
    <div className="list-row">
      <div className={`list-row__thumb list-row__thumb--${media.type}`}>
        {media.type === "video" && <IconVideo />}
        {media.type === "audio" && <IconAudio />}
        {media.type === "image" && <IconImage />}
      </div>
      <div className="list-row__info">
        <span className="list-row__name">{media.name}</span>
        <span className="list-row__meta">
          {typeLabel[media.type] || media.type}
          {media.duration ? ` · ${formatDuration(media.duration)}` : ""}
          {media.size ? ` · ${formatSize(media.size)}` : ""}
        </span>
      </div>
      <button className="list-row__del" onClick={() => onDelete(media.id)} title="Hapus">
        <IconTrash />
      </button>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ label, count }) {
  return (
    <div className="media-section-header">
      <span className="media-section-header__label">{label}</span>
      {count > 0 && <span className="media-section-header__count">{count}</span>}
    </div>
  );
}

// ─── Main MediaPage Component ─────────────────────────────────────────────────
export default function MediaPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Load projects
  useEffect(() => {
    apiFetch("/projects")
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Load media whenever project changes
  const loadMedia = useCallback(async (projectId) => {
    if (!projectId) { setMediaList([]); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/media?projectId=${projectId}`);
      setMediaList(
        data.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type.toLowerCase(),
          size: m.size,
          duration: m.duration,
          thumbnail: m.thumbnail,
          path: m.path,
        }))
      );
    } catch {
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia(selectedProjectId);
  }, [selectedProjectId, loadMedia]);

  // Upload
  const handleUpload = useCallback(
    async (file) => {
      let targetProjectId = selectedProjectId;

      // Jika belum ada project sama sekali, buat project "My Library"
      if (!targetProjectId) {
        try {
          const created = await apiFetch("/projects", {
            method: "POST",
            body: JSON.stringify({ name: "My Library" }),
          });
          setProjects((prev) => [...prev, created]);
          setSelectedProjectId(created.id);
          targetProjectId = created.id;
        } catch (err) {
          alert(err.message || "Gagal membuat project default");
          return;
        }
      }

      setUploading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/media/upload?projectId=${targetProjectId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || `Upload gagal (${res.status})`);
        await loadMedia(targetProjectId);
      } catch (err) {
        alert(err.message || "Gagal mengunggah media");
      } finally {
        setUploading(false);
      }
    },
    [selectedProjectId, loadMedia]
  );

  // Delete
  const handleDelete = useCallback(
    async (mediaId) => {
      if (!window.confirm("Yakin ingin menghapus media ini?")) return;
      try {
        await apiFetch(`/media/${mediaId}`, { method: "DELETE" });
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      } catch (err) {
        alert(err.message || "Gagal menghapus media");
      }
    },
    []
  );

  // Filter by search
  const filtered = mediaList.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const videos = filtered.filter((m) => m.type === "video");
  const audios = filtered.filter((m) => m.type === "audio");
  const images = filtered.filter((m) => m.type === "image");

  const hasResults = videos.length + audios.length + images.length > 0;

  return (
    <main className="main-content media-page">
      {/* ── Top Bar ─────────────────────────────── */}
      <div className="media-page__topbar">
        <h1 className="media-page__title">My Media</h1>
        <div className="media-page__controls">
          {/* Project Selector */}
          {projects.length > 0 && (
            <select
              className="media-page__project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="media-page__search">
            <IconSearch />
            <input
              type="text"
              placeholder="Search media ...."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* View toggle */}
          <div className="media-page__view-toggle">
            <button
              className={`view-btn${viewMode === "grid" ? " view-btn--active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <IconGrid />
            </button>
            <button
              className={`view-btn${viewMode === "list" ? " view-btn--active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <IconList />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      {loading ? (
        <div className="media-page__loading">
          <div className="spinner spinner--lg" />
          <span>Memuat media...</span>
        </div>
      ) : (
        <>
          {/* VIDEO CLIPS */}
          <section className="media-section">
            <SectionHeader label="VIDEO CLIPS" count={videos.length} />
            {viewMode === "grid" ? (
              <div className="media-grid">
                {/* Upload box selalu muncul di posisi pertama */}
                <UploadBox onUpload={handleUpload} uploading={uploading} />

                {videos.map((m) => (
                  <VideoCard key={m.id} media={m} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <>
                <div className="media-upload-list-wrap">
                  <UploadBox onUpload={handleUpload} uploading={uploading} />
                </div>
                <div className="media-listview">
                  {videos.map((m) => (
                    <ListRow key={m.id} media={m} onDelete={handleDelete} />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* AUDIO TRACKS */}
          <section className="media-section">
            <SectionHeader label="AUDIO TRACKS" count={audios.length} />
            {audios.length === 0 ? (
              <p className="media-section__empty">Belum ada audio — unggah file MP3, WAV, atau OGG</p>
            ) : (
              <div className="audio-list">
                {audios.map((m) =>
                  viewMode === "grid" ? (
                    <AudioRow key={m.id} media={m} onDelete={handleDelete} />
                  ) : (
                    <ListRow key={m.id} media={m} onDelete={handleDelete} />
                  )
                )}
              </div>
            )}
          </section>

          {/* IMAGES */}
          <section className="media-section">
            <SectionHeader label="IMAGES" count={images.length} />
            {images.length === 0 ? (
              <p className="media-section__empty">Belum ada gambar — unggah file PNG, JPG, atau WebP</p>
            ) : (
              <div className={viewMode === "grid" ? "media-grid media-grid--images" : "media-listview"}>
                {viewMode === "grid"
                  ? images.map((m) => (
                      <ImageCard key={m.id} media={m} onDelete={handleDelete} />
                    ))
                  : images.map((m) => (
                      <ListRow key={m.id} media={m} onDelete={handleDelete} />
                    ))}
              </div>
            )}
          </section>

          {/* Empty state ketika search tidak ada hasil */}
          {search && !hasResults && (
            <div className="media-page__empty-state">
              <p>Tidak ada media yang cocok dengan "<strong>{search}</strong>"</p>
            </div>
          )}

          {/* Empty state ketika belum ada project */}
          {projects.length === 0 && (
            <div className="media-page__empty-state">
              <p>Buat project terlebih dahulu untuk mulai mengunggah media.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
