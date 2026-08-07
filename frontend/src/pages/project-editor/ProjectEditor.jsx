import React, { Component, useState, useRef, useEffect } from "react";
import MediaLibrary from "../../features/editor/MediaLibrary";
import CanvasPreview from "../../features/editor/CanvasPreview";
import PropertiesPanel from "../../features/editor/PropertiesPanel";
import TimelineEditor from "../../features/editor/TimelineEditor";
import useEditorState from "../../features/editor/useEditorState";
import ExportModal from "../../features/editor/ExportModal";
import "./ProjectEditor.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: "#0a0b18", color: "#ff6b6b", fontFamily: "monospace", height: "100vh", overflow: "auto" }}>
          <h2 style={{ color: "#f87171", fontSize: "18px", marginBottom: "12px" }}>⚠️ Terjadi Error saat memuat Project Editor</h2>
          <div style={{ background: "#1b1e38", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
            <p style={{ fontWeight: "bold", color: "#fca5a5" }}>{this.state.error?.toString()}</p>
            <pre style={{ color: "#9ca3af", fontSize: "12px", marginTop: "12px", whiteSpace: "pre-wrap" }}>{this.state.errorInfo?.componentStack}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "20px", padding: "8px 16px", background: "#7c6cf0", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            Refresh Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProjectEditorWrapper(props) {
  return (
    <ErrorBoundary>
      <ProjectEditorInner {...props} />
    </ErrorBoundary>
  );
}

function ProjectEditorInner({
  projectId,
  initialProjectName = "Konten YouTube",
  onKembaliKeDashboard,
  onLogout,
}) {
  const {
    mediaLibrary,
    uploadMedia,
    deleteMedia,
    tracks,
    clips,
    timelineLoading,
    totalDuration,
    selectedClip,
    selectClip,
    deselectClip,
    updateClipTrim,
    updateClipProperties,
    moveClipToTrack,
    addClipToTimeline,
    addTextClip,
    addTrack,
    deleteTrack,
    reorderClip,
    deleteClip,
    splitClipAt,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    toastMessage,
  } = useEditorState(projectId);

  const [projectName, setProjectName] = useState(initialProjectName || "Konten YouTube");
  const [selectedTransition, setSelectedTransition] = useState(null);

  const handleSelectClip = (clipId) => {
    selectClip(clipId);
    setSelectedTransition(null);
  };

  const handleSelectTransition = (transition) => {
    setSelectedTransition(transition);
    deselectClip();
  };

  const handleDeselectAll = () => {
    deselectClip();
    setSelectedTransition(null);
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialProjectName || "Konten YouTube");

  const [userName, setUserName] = useState("User");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const isSeeking = useRef(false);
  const [seekGeneration, setSeekGeneration] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Saved");

  useEffect(() => {
    if (timelineLoading) return;
    setSaveStatus("Saving...");
    const t = setTimeout(() => setSaveStatus("Saved"), 1000);
    return () => clearTimeout(t);
  }, [clips, tracks, projectName, timelineLoading]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:3000/auth/me", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.email) {
          const emailPrefix = data.email.split("@")[0];
          const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          setUserName(name);
        }
      })
      .catch(() => { });
  }, []);

  const startEditingName = () => {
    setNameDraft(projectName);
    setIsEditingName(true);
  };

  const commitName = async () => {
    const trimmed = nameDraft.trim();
    setIsEditingName(false);

    if (!trimmed || trimmed === projectName) return;

    const previousName = projectName;
    setProjectName(trimmed);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Gagal menyimpan nama (${res.status})`);
    } catch (err) {
      alert(err.message || "Gagal mengubah nama project");
      setProjectName(previousName);
    }
  };

  const handleDropMedia = (mediaId, targetTrackId) => {
    const media = mediaLibrary.find((m) => m.id === mediaId);
    if (media) addClipToTimeline(media, targetTrackId);
  };

  const handleSeekStart = () => {
    isSeeking.current = true;
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    setSeekGeneration((prev) => prev + 1);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem("token");
    if (onLogout) onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="project-editor">
      <header className="project-editor__header">
        <nav className="project-editor__nav">
          <button className="project-editor__breadcrumb" onClick={onKembaliKeDashboard}>
            Dashboard
          </button>
          <span className="project-editor__nav-sep">/</span>

          {isEditingName ? (
            <input
              className="project-editor__name-input"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setIsEditingName(false);
              }}
            />
          ) : (
            <span className="project-editor__nav-active">
              {projectName}
              <button
                className="project-editor__edit-name"
                title="Ganti nama project"
                onClick={startEditingName}
              >
                ✎
              </button>
              <span className={`save-status ${saveStatus === "Saved" ? "saved" : "saving"}`}>
                {saveStatus === "Saved" ? "✓ Saved" : "Saving..."}
              </span>
            </span>
          )}
        </nav>

        <div className="project-editor__user">
          <button
            className="project-editor__btn-export"
            onClick={() => setShowExportModal(true)}
          >
            🚀 Export Video
          </button>
          <div className="project-editor__user-profile">
            <span className="project-editor__avatar-circle">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="project-editor__user-name">{userName}</span>
          </div>
          <button className="btn btn--ghost btn--sm project-editor__btn-logout" onClick={handleLogoutClick}>
            Logout
          </button>
        </div>
      </header>

      <div className="project-editor__body">
        <MediaLibrary
          mediaList={mediaLibrary}
          onAddToTimeline={addClipToTimeline}
          onUploadMedia={uploadMedia}
          onDeleteMedia={deleteMedia}
        />
        <CanvasPreview
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={setCurrentTime}
          clips={clips}
          isSeeking={isSeeking}
          seekGeneration={seekGeneration}
          selectedTransition={selectedTransition}
        />
        <PropertiesPanel
          clip={selectedClip}
          selectedTransition={selectedTransition}
          onUpdateTrim={updateClipTrim}
          onUpdateProperties={updateClipProperties}
          onDeleteClip={deleteClip}
          onCloseTransition={() => setSelectedTransition(null)}
        />
      </div>

      <TimelineEditor
        tracks={tracks}
        clips={clips}
        timelineLoading={timelineLoading}
        totalDuration={totalDuration}
        selectedClipId={selectedClip?.id}
        selectedTransition={selectedTransition}
        onSelectClip={handleSelectClip}
        onSelectTransition={handleSelectTransition}
        onTrimClip={updateClipTrim}
        onDeselect={handleDeselectAll}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        onDropMedia={handleDropMedia}
        onReorderClip={reorderClip}
        onDeleteClip={deleteClip}
        onSplitClip={splitClipAt}
        onAddTextClip={addTextClip}
        onAddTrack={addTrack}
        onDeleteTrack={deleteTrack}
        onMoveClipToTrack={moveClipToTrack}
        onUpdateClipProperties={updateClipProperties}
        toastMessage={toastMessage}
        onSeekStart={handleSeekStart}
        onSeekEnd={handleSeekEnd}
      />

      {showLogoutConfirm && (
        <div className="logout-confirm__overlay">
          <div className="logout-confirm__box">
            <p>Yakin mau logout?</p>
            <div className="logout-confirm__actions">
              <button className="btn btn--primary btn--sm" onClick={confirmLogout}>
                Yes
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelLogout}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectName={projectName}
        totalDuration={totalDuration}
      />
    </div>
  );
}
