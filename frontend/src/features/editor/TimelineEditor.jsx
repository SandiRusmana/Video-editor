import { useRef, useCallback, useState } from "react";
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

// ---- Auto-lane: bagi clip video yang bentrok waktu ke baris "Video 1", "Video 2", dst ----
// Ini murni logic tampilan di frontend, tidak butuh field tambahan dari backend.
function assignVideoLanes(videoClips) {
  const sorted = [...videoClips].sort((a, b) => a.timelineStart - b.timelineStart);
  const laneEnds = []; // waktu akhir clip terakhir di tiap lane
  const laned = sorted.map((clip) => {
    const clipEnd = clip.timelineStart + clip.duration;
    let laneIndex = laneEnds.findIndex((end) => end <= clip.timelineStart + 0.001);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(clipEnd);
    } else {
      laneEnds[laneIndex] = clipEnd;
    }
    return { ...clip, laneIndex };
  });
  return { laned, laneCount: Math.max(laneEnds.length, 1) };
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

  // Ditambahkan offset 80px agar sejajar dengan posisi awal lane
  const playheadLeft = 80 + currentTime * PIXELS_PER_SECOND;

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

function Clip({ clip, isSelected, onSelect, onTrim, onDelete }) {
  const dragRef = useRef(null);

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

  return (
    <div
      className={`clip clip--${clip.type} ${isSelected ? "clip--selected" : ""}`}
      style={{ left: clip.left, width: clip.width }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("clipId", clip.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
    >
      <TrimHandle side="left" onDragStart={handleDragStart} />
      <span className="clip__label">{clip.name}</span>
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

// ---- Text clip: local-only, belum tersambung ke backend ----
// Backend belum punya endpoint utk clip text, jadi state-nya disimpan
// di komponen ini saja. Kalau backend sudah siap, ganti setTextClips
// jadi pemanggilan API (create/update/delete text clip).
function TextClip({ clip, isSelected, onSelect, onChangeText, onMove, onResize, onDelete }) {
  const dragRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(clip.text);

  const handleMoveStart = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect(clip.id);
      const startX = e.clientX;
      const startTimelineStart = clip.timelineStart;
      dragRef.current = { startX, startTimelineStart };

      const handleMouseMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - dragRef.current.startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;
        const newStart = Math.max(0, dragRef.current.startTimelineStart + deltaSec);
        onMove(clip.id, newStart);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [clip, onMove, onSelect]
  );

  const handleResizeStart = useCallback(
    (e, side) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startTimelineStart = clip.timelineStart;
      const startDuration = clip.duration;
      dragRef.current = { side, startX, startTimelineStart, startDuration };

      const handleMouseMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - dragRef.current.startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;

        if (dragRef.current.side === "left") {
          const newStart = Math.max(0, dragRef.current.startTimelineStart + deltaSec);
          const newDuration = Math.max(0.5, dragRef.current.startDuration - deltaSec);
          onResize(clip.id, { timelineStart: newStart, duration: newDuration });
        } else {
          const newDuration = Math.max(0.5, dragRef.current.startDuration + deltaSec);
          onResize(clip.id, { duration: newDuration });
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [clip, onResize]
  );

  const commitEdit = () => {
    const trimmed = draft.trim();
    onChangeText(clip.id, trimmed || clip.text);
    setIsEditing(false);
  };

  return (
    <div
      className={`clip clip--text ${isSelected ? "clip--selected" : ""}`}
      style={{ left: clip.left, width: clip.width }}
      onMouseDown={handleMoveStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(clip.text);
        setIsEditing(true);
      }}
    >
      <div
        className="clip__handle clip__handle--left"
        onMouseDown={(e) => handleResizeStart(e, "left")}
      />
      {isEditing ? (
        <input
          className="clip__text-input"
          value={draft}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setIsEditing(false);
          }}
        />
      ) : (
        <span className="clip__label">{clip.text}</span>
      )}
      <button
        className="clip__delete"
        title="Hapus teks"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(clip.id);
        }}
      >
        ✕
      </button>
      <div
        className="clip__handle clip__handle--right"
        onMouseDown={(e) => handleResizeStart(e, "right")}
      />
    </div>
  );
}

let textIdCounter = 0;

export default function TimelineEditor({
  clips,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onTrimClip,
  onDeselect,
  currentTime,
  onSeek,
  onDropMedia,
  onReorderClip,
  onDeleteClip,
  onSeekStart,
  onSeekEnd,
  onSplitClip,
}) {
  const ruler = buildRuler(Math.max(totalDuration, 40));
  const [dragOverTrack, setDragOverTrack] = useState(null); // 'VIDEO' | 'AUDIO' | 'EMPTY' | null

  const videoClips = clips.filter((c) => c.trackType === "VIDEO");
  const audioClips = clips.filter((c) => c.trackType === "AUDIO");

  const { laned: videoClipsLaned, laneCount: videoLaneCount } = assignVideoLanes(videoClips);

  // ---- State text clip lokal (belum disambung ke backend) ----
  const [textClips, setTextClips] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);

  const addTextClip = () => {
    textIdCounter += 1;
    const newClip = {
      id: `local-text-${Date.now()}-${textIdCounter}`,
      text: "Teks Baru",
      timelineStart: currentTime,
      duration: 3,
    };
    setTextClips((prev) => [...prev, newClip]);
    setSelectedTextId(newClip.id);
  };

  const updateTextClip = (id, patch) => {
    setTextClips((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const moveTextClip = (id, timelineStart) => updateTextClip(id, { timelineStart });

  const changeTextContent = (id, text) => updateTextClip(id, { text });

  const deleteTextClip = (id) => {
    setTextClips((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const textClipsWithLayout = textClips.map((t) => ({
    ...t,
    left: t.timelineStart * PIXELS_PER_SECOND,
    width: t.duration * PIXELS_PER_SECOND,
  }));

  // ---- Konfirmasi delete (video/audio clip & text clip) ----
  const [pendingDelete, setPendingDelete] = useState(null); // { id, kind: 'clip' | 'text' }

  const requestDeleteClip = (id) => setPendingDelete({ id, kind: "clip" });
  const requestDeleteText = (id) => setPendingDelete({ id, kind: "text" });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "clip") {
      onDeleteClip(pendingDelete.id);
    } else {
      deleteTextClip(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  const cancelDelete = () => setPendingDelete(null);

  // berada DALAM rentang clip itu (dengan margin 0.05s di tiap ujung
  // untuk mencegah split di posisi pas awal/akhir clip).
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const canSplit =
    selectedClip !== null &&
    currentTime > selectedClip.timelineStart + 0.05 &&
    currentTime < selectedClip.timelineStart + selectedClip.duration - 0.05;

  // Ditambah offset 80px dari lebar label kolom kiri
  const timelineWidth = 80 + Math.max(totalDuration, 40) * PIXELS_PER_SECOND;

  const handleLaneClick = (e) => {
    onDeselect();
    setSelectedTextId(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / PIXELS_PER_SECOND));
    onSeekStart?.();
    onSeek(newTime);
    // Lane click selesai seketika (bukan drag), langsung release
    setTimeout(() => onSeekEnd?.(), 100);
  };

  const handleDragOver = (e, trackType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverTrack(trackType);
  };

  const handleDragLeave = () => setDragOverTrack(null);

  const handleDrop = (e, trackType) => {
    e.preventDefault();
    setDragOverTrack(null);

    const clipId = e.dataTransfer.getData("clipId");
    if (clipId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left;

      const trackClips = trackType === "VIDEO" ? videoClips : audioClips;
      let targetIndex = trackClips.length;
      for (let i = 0; i < trackClips.length; i++) {
        const midpoint = trackClips[i].left + trackClips[i].width / 2;
        if (dropX < midpoint) {
          targetIndex = i;
          break;
        }
      }
      onReorderClip(clipId, targetIndex);
      return;
    }

    const mediaId = e.dataTransfer.getData("mediaId");
    if (mediaId) onDropMedia(mediaId);
  };

  return (
    <section className="timeline-editor">
      <div className="timeline-editor__header">
        <h3>TIMELINE EDITOR</h3>
        <div className="timeline-editor__header-actions">
          <button className="timeline-editor__btn-split" onClick={addTextClip} title="Tambah teks ke timeline">
            + Text
          </button>
          <button
            className={`timeline-editor__btn-split${canSplit ? " timeline-editor__btn-split--active" : ""}`}
            onClick={() => canSplit && onSplitClip(selectedClipId, currentTime)}
            disabled={!canSplit}
            title={
              canSplit
                ? "Potong clip di posisi playhead"
                : "Pilih sebuah clip lalu posisikan playhead di tengahnya untuk memotong"
            }
          >
            ✂️ Split
          </button>
          <span className="timeline-editor__total">{formatTime(totalDuration)} total</span>
        </div>
      </div>

      <div className="timeline-editor__viewport">
        <div className="timeline-editor__content-wrapper" style={{ width: timelineWidth }}>

          <div className="timeline-editor__ruler">
            {ruler.map((t) => (
              <span key={t} className="timeline-editor__mark" style={{ left: 80 + t * PIXELS_PER_SECOND }}>
                {t}s
              </span>
            ))}
          </div>

          {clips.length === 0 && textClips.length === 0 ? (
            <div
              className={`timeline-editor__empty ${dragOverTrack === "EMPTY" ? "timeline-editor__empty--drag" : ""}`}
              onDragOver={(e) => handleDragOver(e, "EMPTY")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "VIDEO")}
              style={{ marginLeft: "80px" }}
            >
              {dragOverTrack === "EMPTY"
                ? "Lepaskan di sini untuk menambahkan"
                : "Belum ada klip di timeline — unggah media untuk mulai mengedit, atau seret dari Media Library"}
            </div>
          ) : (
            <div className="timeline-editor__tracks-container">
              {/* TRACK VIDEO — otomatis kebagi Video 1, Video 2, dst kalau ada yang bentrok waktu */}
              {Array.from({ length: videoLaneCount }).map((_, laneIndex) => (
                <div className="timeline-editor__track" key={`video-lane-${laneIndex}`}>
                  <span className="timeline-editor__track-label">Video {laneIndex + 1}</span>
                  <div
                    className={`timeline-editor__lane ${dragOverTrack === "VIDEO" ? "timeline-editor__lane--drag-over" : ""}`}
                    onClick={handleLaneClick}
                    onDragOver={(e) => handleDragOver(e, "VIDEO")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "VIDEO")}
                  >
                    {videoClipsLaned
                      .filter((c) => c.laneIndex === laneIndex)
                      .map((clip) => (
                        <Clip
                          key={clip.id}
                          clip={clip}
                          isSelected={clip.id === selectedClipId}
                          onSelect={onSelectClip}
                          onTrim={onTrimClip}
                          onDelete={requestDeleteClip}
                        />
                      ))}
                  </div>
                </div>
              ))}

              {/* TRACK TEXT — local-only, belum kesambung backend */}
              <div className="timeline-editor__track">
                <span className="timeline-editor__track-label">Text</span>
                <div
                  className="timeline-editor__lane"
                  onClick={() => {
                    onDeselect();
                    setSelectedTextId(null);
                  }}
                >
                  {textClipsWithLayout.map((clip) => (
                    <TextClip
                      key={clip.id}
                      clip={clip}
                      isSelected={clip.id === selectedTextId}
                      onSelect={setSelectedTextId}
                      onChangeText={changeTextContent}
                      onMove={moveTextClip}
                      onResize={(id, patch) => updateTextClip(id, patch)}
                      onDelete={requestDeleteText}
                    />
                  ))}
                </div>
              </div>

              {/* TRACK AUDIO */}
              <div className="timeline-editor__track">
                <span className="timeline-editor__track-label">Audio</span>
                <div
                  className={`timeline-editor__lane ${dragOverTrack === "AUDIO" ? "timeline-editor__lane--drag-over" : ""}`}
                  onClick={handleLaneClick}
                  onDragOver={(e) => handleDragOver(e, "AUDIO")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "AUDIO")}
                >
                  {audioClips.map((clip) => (
                    <Clip
                      key={clip.id}
                      clip={clip}
                      isSelected={clip.id === selectedClipId}
                      onSelect={onSelectClip}
                      onTrim={onTrimClip}
                      onDelete={requestDeleteClip}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {(clips.length > 0 || textClips.length > 0) && (
            <Playhead
              currentTime={currentTime}
              totalDuration={totalDuration}
              onSeek={onSeek}
              onSeekStart={onSeekStart}
              onSeekEnd={onSeekEnd}
            />
          )}

        </div>
      </div>

      {pendingDelete && (
        <div className="delete-confirm__overlay">
          <div className="delete-confirm__box">
            <p>Yakin mau hapus clip ini?</p>
            <div className="delete-confirm__actions">
              <button className="btn btn--danger btn--sm" onClick={confirmDelete}>
                Ya, Hapus
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelDelete}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}