import { useRef, useCallback, useState, useEffect } from "react";
import { PIXELS_PER_SECOND } from "./useEditorState";
import "./TimelineEditor.css";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function buildRuler(totalDuration) {
  const step = 10;
  const marks = [];
  for (let t = 0; t <= totalDuration + step; t += step) {
    marks.push(t);
  }
  return marks;
}

function TrimHandle({ side, onDragStart }) {
  return (
    <div
      className={`clip__handle clip__handle--${side}`}
      draggable
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDragStart(e, side);
      }}
    />
  );
}

function Playhead({ currentTime, totalDuration, onSeek, onSeekStart, onSeekEnd }) {
  const dragRef = useRef(null);

  const handleDragStart = useCallback(
    (e) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startTime = currentTime;
      dragRef.current = { startX, startTime };
      onSeekStart?.();

      const handleMouseMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - dragRef.current.startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;
        const newTime = Math.max(0, Math.min(totalDuration, dragRef.current.startTime + deltaSec));
        onSeek(newTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        onSeekEnd?.();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [currentTime, totalDuration, onSeek, onSeekStart, onSeekEnd]
  );

  const playheadLeft = 100 + currentTime * PIXELS_PER_SECOND;

  return (
    <div
      className="playhead"
      style={{ left: playheadLeft }}
      onMouseDown={handleDragStart}
    >
      <div className="playhead__handle" />
      <div className="playhead__line" />
    </div>
  );
}

function Clip({ clip, isSelected, onSelect, onTrim, onDelete, onUpdateText }) {
  const dragRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(clip.textContent || clip.name);

  const handleDragStart = useCallback(
    (e, side) => {
      const startX = e.clientX;
      const startTrimStart = clip.trimStart;
      const startTrimEnd = clip.trimEnd;
      dragRef.current = { side, startX, startTrimStart, startTrimEnd };

      const handleMouseMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - dragRef.current.startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;

        if (dragRef.current.side === "left") {
          onTrim(clip.id, { trimStart: dragRef.current.startTrimStart + deltaSec });
        } else {
          onTrim(clip.id, { trimEnd: dragRef.current.startTrimEnd + deltaSec });
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [clip, onTrim]
  );

  const commitTextEdit = () => {
    const trimmed = draftText.trim();
    if (onUpdateText && trimmed) {
      onUpdateText(clip.id, { textContent: trimmed });
    }
    setIsEditing(false);
  };

  const isTextClip = clip.type === "text" || clip.trackType === "TEXT" || !!clip.textContent;
  const isAudioClip = clip.type === "audio" || clip.trackType === "AUDIO";

  return (
    <div
      className={`clip clip--${isTextClip ? "text" : clip.type} ${isSelected ? "clip--selected" : ""}`}
      style={{ left: clip.left, width: clip.width }}
      draggable={!isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData("clipId", clip.id);
        e.dataTransfer.setData("sourceTrackId", clip.trackId);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
      onDoubleClick={(e) => {
        if (isTextClip) {
          e.stopPropagation();
          setDraftText(clip.textContent || clip.name);
          setIsEditing(true);
        }
      }}
    >
      <TrimHandle side="left" onDragStart={handleDragStart} />
      
      {isEditing ? (
        <input
          className="clip__text-input"
          value={draftText}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitTextEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTextEdit();
            if (e.key === "Escape") setIsEditing(false);
          }}
        />
      ) : (
        <span className="clip__label">
          {isAudioClip && <span style={{ marginRight: '6px' }}>{clip.muted ? '🔇' : '🔊'}</span>}
          {clip.name}
          {isAudioClip && (
            <span style={{ opacity: 0.7, marginLeft: '4px', fontWeight: 'normal' }}>
              (Trimmed {Math.floor(clip.duration)}s, Vol {clip.muted ? 0 : Math.round((clip.volume ?? 1) * 100)}%)
            </span>
          )}
        </span>
      )}

      <span className="clip__duration">{formatTime(clip.duration)}</span>

      <button
        className="clip__delete"
        title="Hapus clip dari timeline"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(clip.id);
        }}
      >
        ✕
      </button>

      <TrimHandle side="right" onDragStart={handleDragStart} />
    </div>
  );
}

export default function TimelineEditor({
  tracks = [],
  clips = [],
  timelineLoading = false,
  totalDuration = 0,
  selectedClipId = null,
  selectedTransition = null,
  onSelectClip,
  onSelectTransition,
  onTrimClip,
  onDeselect,
  currentTime = 0,
  onSeek,
  onDropMedia,
  onDeleteClip,
  onSeekStart,
  onSeekEnd,
  onSplitClip,
  onAddTextClip,
  onAddTrack,
  onDeleteTrack,
  onMoveClipToTrack,
  onUpdateClipProperties,
  toastMessage = null,
}) {
  const ruler = buildRuler(Math.max(totalDuration, 40));
  const [dragOverTrackId, setDragOverTrackId] = useState(null);
  const [dragIndicator, setDragIndicator] = useState(null);
  const [draggingClipId, setDraggingClipId] = useState(null);

  const [pendingDeleteClipId, setPendingDeleteClipId] = useState(null);
  const [pendingDeleteTrackId, setPendingDeleteTrackId] = useState(null);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);

  const pendingDeleteClip = clips.find((c) => c.id === pendingDeleteClipId);

  const requestDeleteClip = (id) => setPendingDeleteClipId(id);

  const confirmDeleteClip = () => {
    if (pendingDeleteClipId) {
      onDeleteClip(pendingDeleteClipId);
      setPendingDeleteClipId(null);
    }
  };

  const cancelDeleteClip = () => setPendingDeleteClipId(null);

  const requestDeleteTrack = (id) => setPendingDeleteTrackId(id);

  const confirmDeleteTrack = () => {
    if (pendingDeleteTrackId && onDeleteTrack) {
      onDeleteTrack(pendingDeleteTrackId);
      setPendingDeleteTrackId(null);
    }
  };

  const cancelDeleteTrack = () => setPendingDeleteTrackId(null);

  // Handle Delete / Backspace key shortcut to trigger clip deletion modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedClipId) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        requestDeleteClip(selectedClipId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const canSplit =
    selectedClip !== null &&
    currentTime > selectedClip.timelineStart + 0.05 &&
    currentTime < selectedClip.timelineStart + selectedClip.duration - 0.05;

  const timelineWidth = 100 + Math.max(totalDuration, 40) * PIXELS_PER_SECOND;

  const handleLaneClick = (e) => {
    onDeselect();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / PIXELS_PER_SECOND));
    onSeekStart?.();
    onSeek(newTime);
    setTimeout(() => onSeekEnd?.(), 100);
  };

  const handleDragOver = (e, trackId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTrackId(trackId);

    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = Math.max(0, e.clientX - rect.left);
    setDragIndicator({ trackId, left: dropX });
  };

  const handleDragLeave = () => {
    setDragOverTrackId(null);
    setDragIndicator(null);
  };

  const handleDrop = (e, targetTrack) => {
    e.preventDefault();
    setDragOverTrackId(null);
    setDragIndicator(null);
    setDraggingClipId(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = Math.max(0, e.clientX - rect.left);
    const dropTimelineStart = dropX / PIXELS_PER_SECOND;

    const clipId = e.dataTransfer.getData("clipId");
    if (clipId) {
      if (onMoveClipToTrack) {
        onMoveClipToTrack(clipId, targetTrack.id, dropTimelineStart);
      }
      return;
    }

    const mediaId = e.dataTransfer.getData("mediaId");
    if (mediaId) {
      if (onDropMedia) {
        onDropMedia(mediaId, targetTrack.id);
      }
    }
  };

  const handleAddTextClick = () => {
    const textTrack = tracks.find((t) => t.type === "TEXT") || tracks[0];
    if (onAddTextClip) {
      onAddTextClip({
        textContent: "Teks Baru",
        trackId: textTrack?.id,
        timelineStart: currentTime,
        duration: 5,
      });
    }
  };

  const videoTrackCount = tracks.filter((t) => t.type === "VIDEO").length;

  return (
    <section className="timeline-editor">
      <div className="timeline-editor__header">
        <h3>TIMELINE EDITOR (MULTI-TRACK)</h3>
        <div className="timeline-editor__header-actions">
          <div className="timeline-editor__track-menu-container">
            <button
              className="timeline-editor__btn-action timeline-editor__btn-add-track"
              onClick={() => setShowAddTrackMenu((p) => !p)}
              title="Tambah track baru ke timeline"
            >
              <span>➕ Track</span>
              <span className="timeline-editor__dropdown-arrow">▾</span>
            </button>

            {showAddTrackMenu && (
              <div className="timeline-editor__track-menu">
                <button
                  onClick={() => {
                    onAddTrack?.("VIDEO", `Video Track ${videoTrackCount + 1}`);
                    setShowAddTrackMenu(false);
                  }}
                >
                  🎬 Video Track
                </button>
                <button
                  onClick={() => {
                    onAddTrack?.("TEXT", "Text Track");
                    setShowAddTrackMenu(false);
                  }}
                >
                  📝 Text Track
                </button>
                <button
                  onClick={() => {
                    onAddTrack?.("AUDIO", "Audio Track");
                    setShowAddTrackMenu(false);
                  }}
                >
                  🎵 Audio Track
                </button>
              </div>
            )}
          </div>

          <button
            className="timeline-editor__btn-action timeline-editor__btn-add-text"
            onClick={handleAddTextClick}
            title="Tambah teks ke timeline"
          >
            <span>✨ + Teks</span>
          </button>

          <button
            className={`timeline-editor__btn-action timeline-editor__btn-split${
              canSplit ? " timeline-editor__btn-split--active" : ""
            }`}
            onClick={() => canSplit && onSplitClip(selectedClipId, currentTime)}
            disabled={!canSplit}
            title={
              canSplit
                ? "Potong clip di posisi playhead"
                : "Pilih sebuah clip lalu posisikan playhead di tengahnya untuk memotong"
            }
          >
            <span>✂️ Split</span>
          </button>
          <span className="timeline-editor__total">{formatTime(totalDuration)} total</span>
        </div>
      </div>

      <div className="timeline-editor__viewport">
        {timelineLoading ? (
          <div className="timeline-editor__loading" style={{ padding: "40px 0", textAlign: "center", color: "#8b8fb3" }}>
            <span>⏳ Memuat Multi Track Timeline...</span>
          </div>
        ) : (
          <div className="timeline-editor__content-wrapper" style={{ width: timelineWidth }}>

            <div className="timeline-editor__ruler">
              {ruler.map((t) => (
                <span key={t} className="timeline-editor__mark" style={{ left: 100 + t * PIXELS_PER_SECOND }}>
                  {t}s
                </span>
              ))}
            </div>

            {tracks.length === 0 ? (
              <div className="timeline-editor__empty" style={{ marginLeft: "100px" }}>
                Belum ada track di timeline — klik "+ Track" untuk membuat track baru.
              </div>
            ) : (
              <div className="timeline-editor__tracks-container">
                {tracks.map((track) => {
                  const trackClips = clips.filter((c) => c.trackId === track.id);
                  const isDragOver = dragOverTrackId === track.id;

                  return (
                    <div className="timeline-editor__track" key={track.id}>
                      <div className="timeline-editor__track-label">
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {track.name || `${track.type} Track`}
                        </span>
                        <button
                          className="timeline-editor__delete-track-btn"
                          title="Hapus track ini"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteTrack(track.id);
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div
                        className={`timeline-editor__lane ${isDragOver ? "timeline-editor__lane--drag-over" : ""}`}
                        onClick={handleLaneClick}
                        onDragOver={(e) => handleDragOver(e, track.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, track)}
                      >
                        {dragIndicator && dragIndicator.trackId === track.id && (
                          <div
                            className="timeline-editor__drop-indicator"
                            style={{ left: dragIndicator.left }}
                          />
                        )}

                        {trackClips.map((clip, index) => {
                          const nextClip = trackClips[index + 1];
                          const isAdjacent = nextClip && Math.abs(nextClip.timelineStart - (clip.timelineStart + clip.duration)) < 0.1;
                          return (
                            <React.Fragment key={clip.id}>
                              <Clip
                                clip={clip}
                                isSelected={clip.id === selectedClipId}
                                onSelect={onSelectClip}
                                onTrim={onTrimClip}
                                onDelete={requestDeleteClip}
                                onUpdateText={onUpdateClipProperties}
                              />
                              {isAdjacent && (
                                <button
                                  className={`timeline-editor__transition-btn ${selectedTransition?.leftClip?.id === clip.id ? "timeline-editor__transition-btn--selected" : ""}`}
                                  style={{
                                    left: (clip.timelineStart + clip.duration) * PIXELS_PER_SECOND,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectTransition) {
                                      onSelectTransition({ leftClip: clip, rightClip: nextClip, trackId: track.id, type: "Fade", duration: 1.0 });
                                    }
                                  }}
                                  title="Transition"
                                >
                                  ⚡
                                </button>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {clips.length > 0 && (
              <Playhead
                currentTime={currentTime}
                totalDuration={totalDuration}
                onSeek={onSeek}
                onSeekStart={onSeekStart}
                onSeekEnd={onSeekEnd}
              />
            )}

          </div>
        )}
      </div>

      {pendingDeleteClipId && (
        <div className="delete-confirm__overlay">
          <div className="delete-confirm__box">
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>🗑️</div>
            <h4 style={{ margin: "0 0 8px", fontSize: "15px", color: "#ffffff", fontWeight: 700 }}>
              Hapus Clip "{pendingDeleteClip?.name || "Clip"}"?
            </h4>
            <p style={{ margin: "0 0 18px", fontSize: "12.5px", color: "#8b8fb3", lineHeight: "1.4" }}>
              Clip akan dihapus dari timeline. File media di Media Library tetap aman.
            </p>
            <div className="delete-confirm__actions">
              <button className="btn btn--danger btn--sm" onClick={confirmDeleteClip}>
                Ya, Hapus
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelDeleteClip}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteTrackId && (
        <div className="delete-confirm__overlay">
          <div className="delete-confirm__box">
            <p>Yakin mau hapus track ini beserta seluruh clip di dalamnya?</p>
            <div className="delete-confirm__actions">
              <button className="btn btn--danger btn--sm" onClick={confirmDeleteTrack}>
                Ya, Hapus Track
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelDeleteTrack}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="timeline-editor__toast">
          <span>✓ {toastMessage}</span>
        </div>
      )}
    </section>
  );
}