import { useState, useRef, useEffect } from "react";
import MediaLibrary from "../../features/editor/MediaLibrary";
import CanvasPreview from "../../features/editor/CanvasPreview";
import PropertiesPanel from "../../features/editor/PropertiesPanel";
import TimelineEditor from "../../features/editor/TimelineEditor";
import useEditorState from "../../features/editor/useEditorState";
import "./ProjectEditor.css";

export default function ProjectEditor({
  projectId,
  initialProjectName = "Konten YouTube",
  onKembaliKeDashboard,
  onLogout,
}) {
  const {
    mediaLibrary,
    uploadMedia,
    deleteMedia,
    clips,
    totalDuration,
    selectedClip,
    selectClip,
    deselectClip,
    updateClipTrim,
    addClipToTimeline,
    reorderClip,
    deleteClip,
    splitClipAt,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
  } = useEditorState(projectId);

  const [projectName, setProjectName] = useState(initialProjectName || "Konten YouTube");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialProjectName || "Konten YouTube");

  const [userName, setUserName] = useState("User");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isSeeking = useRef(false);
  const [seekGeneration, setSeekGeneration] = useState(0);

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

  // Simpan perubahan nama project ke backend (PATCH /projects/:id) —
  // sebelumnya cuma ubah state lokal, jadi tidak pernah tersimpan ke
  // database dan hilang lagi begitu balik ke Dashboard.
  const commitName = async () => {
    const trimmed = nameDraft.trim();
    setIsEditingName(false);

    if (!trimmed || trimmed === projectName) return;

    const previousName = projectName;
    setProjectName(trimmed); // update tampilan langsung (optimistic)

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
      setProjectName(previousName); // batalkan tampilan kalau gagal disimpan
    }
  };

  const handleDropMedia = (mediaId) => {
    const media = mediaLibrary.find((m) => m.id === mediaId);
    if (media) addClipToTimeline(media);
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
            </span>
          )}
        </nav>

        <div className="project-editor__user">
          <span>👤 {userName}</span>
          <button className="btn btn--ghost btn--sm" onClick={handleLogoutClick}>
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
        />
        <PropertiesPanel clip={selectedClip} onUpdateTrim={updateClipTrim} />
      </div>

      <TimelineEditor
        clips={clips}
        totalDuration={totalDuration}
        selectedClipId={selectedClip?.id}
        onSelectClip={selectClip}
        onTrimClip={updateClipTrim}
        onDeselect={deselectClip}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        onDropMedia={handleDropMedia}
        onReorderClip={reorderClip}
        onDeleteClip={deleteClip}
        onSplitClip={splitClipAt}
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
    </div>
  );
}
