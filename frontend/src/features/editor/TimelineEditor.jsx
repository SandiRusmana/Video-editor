import { useRef, useCallback, useState } from "react";
import { PIXELS_PER_SECOND } from "./useEditorState";
import "./TimelineEditor.css";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Tanda waktu di ruler (0s, 10s, 20s, ...)
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
      onDragStart={(e) => e.preventDefault()} // matikan drag native bawaan browser di handle ini
      onMouseDown={(e) => {
        e.stopPropagation(); // supaya gak ke-trigger select clip / drag reorder clip
        onDragStart(e, side);
      }}
    />
  );
}

function Playhead({ currentTime, totalDuration, onSeek }) {
  const dragRef = useRef(null);

  const handleDragStart = useCallback(
    (e) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startTime = currentTime;
      dragRef.current = { startX, startTime };

      const handleMouseMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - dragRef.current.startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;
        const newTime = Math.max(0, Math.min(totalDuration, dragRef.current.startTime + deltaSec));
        onSeek(newTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [currentTime, totalDuration, onSeek]
  );

  return (
    <div
      className="playhead"
      style={{ left: currentTime * PIXELS_PER_SECOND }}
      onMouseDown={handleDragStart}
    >
      <div className="playhead__handle" />
    </div>
  );
}

function Clip({ clip, isSelected, onSelect, onTrim }) {
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
        e.stopPropagation(); // biar gak ke-bubble ke onDeselect di parent track
        onSelect(clip.id);
      }}
    >
      <TrimHandle side="left" onDragStart={handleDragStart} />
      <span className="clip__label">{clip.name}</span>
      <span className="clip__duration">{formatTime(clip.duration)}</span>
      <TrimHandle side="right" onDragStart={handleDragStart} />
    </div>
  );
}

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
}) {
  const ruler = buildRuler(Math.max(totalDuration, 40));
  const laneRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Klik di area kosong lane (bukan di atas clip) -> pindahkan playhead ke posisi itu
  const handleLaneClick = (e) => {
    onDeselect();
    if (!laneRef.current) return;
    const rect = laneRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / PIXELS_PER_SECOND));
    onSeek(newTime);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // wajib, biar event "drop" diizinkan browser
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const clipId = e.dataTransfer.getData("clipId");
    if (clipId) {
      // Reorder: cari index tujuan berdasarkan posisi X drop, dibanding titik tengah tiap clip
      if (!laneRef.current) return;
      const rect = laneRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      let targetIndex = clips.length;
      for (let i = 0; i < clips.length; i++) {
        const midpoint = clips[i].left + clips[i].width / 2;
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
        <span className="timeline-editor__total">{formatTime(totalDuration)} total</span>
      </div>

      <div className="timeline-editor__ruler">
        {ruler.map((t) => (
          <span key={t} className="timeline-editor__mark" style={{ left: t * PIXELS_PER_SECOND }}>
            {t}s
          </span>
        ))}
      </div>

      {clips.length === 0 ? (
        <div
          className={`timeline-editor__empty ${isDragOver ? "timeline-editor__empty--drag" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver
            ? "Lepaskan di sini untuk menambahkan ke Track 1"
            : "Belum ada klip di timeline — unggah media untuk mulai mengedit, atau seret dari Media Library"}
        </div>
      ) : (
        <div className="timeline-editor__track">
          <span className="timeline-editor__track-label">Track 1</span>
          <div
            className="timeline-editor__lane"
            ref={laneRef}
            onClick={handleLaneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {clips.map((clip) => (
              <Clip
                key={clip.id}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onSelect={onSelectClip}
                onTrim={onTrimClip}
              />
            ))}
            <Playhead currentTime={currentTime} totalDuration={totalDuration} onSeek={onSeek} />
            {isDragOver && <div className="timeline-editor__drop-hint">Drop file di sini</div>}
          </div>
        </div>
      )}
    </section>
  );
}