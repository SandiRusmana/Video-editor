import { useState, useRef } from "react";
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
}) {
  const {
    mediaLibrary,
    clips,
    totalDuration,
    selectedClip,
    selectClip,
    deselectClip,
    updateClipTrim,
    addClipToTimeline,
    deleteClip,
    deleteMedia,
    reorderClip,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    uploadMedia,
  } = useEditorState(projectId);

  const [projectName, setProjectName] = useState(initialProjectName || "Konten YouTube");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialProjectName || "Konten YouTube");

  const startEditingName = () => {
    setNameDraft(projectName);
    setIsEditingName(true);
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) setProjectName(trimmed);
    setIsEditingName(false);
  };

  // isSeeking: ref yang di-set saat user drag/klik playhead di timeline.
  // CanvasPreview menggunakannya untuk memblokir onTimeUpdate dari audio/video
  // agar tidak menimpa posisi yang sedang di-seek user.
  const isSeeking = useRef(false);
  const handleSeekStart = () => { isSeeking.current = true; };
  // seekGeneration: counter yang naik setiap drag selesai, agar CanvasPreview
  // dipaksa re-sync audio/video ke posisi baru setelah playhead dilepas.
  const [seekGeneration, setSeekGeneration] = useState(0);
  const handleSeekEnd = () => {
    isSeeking.current = false;
    setSeekGeneration((g) => g + 1);
  };

  // Dipanggil saat file di-drop dari Media Library ke Timeline
  const handleDropMedia = (mediaId) => {
    const media = mediaLibrary.find((m) => m.id === mediaId);
    if (media) addClipToTimeline(media);
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
          <span>👤 Asep</span>
          <button
            className="btn btn--ghost btn--sm"
            onClick={onKembaliKeDashboard}
            title="Kembali ke Dashboard"
          >
            ← Keluar Proyek
          </button>
          <button className="btn btn--ghost btn--sm">Logout</button>
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
        onSeekStart={handleSeekStart}
        onSeekEnd={handleSeekEnd}
      />
    </div>
  );
}