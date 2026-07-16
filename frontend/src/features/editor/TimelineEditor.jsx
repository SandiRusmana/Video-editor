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
}) {
  const ruler = buildRuler(Math.max(totalDuration, 40));
  const [dragOverTrack, setDragOverTrack] = useState(null); // 'VIDEO' | 'AUDIO' | 'EMPTY' | null

  const videoClips = clips.filter((c) => c.trackType === "VIDEO");
  const audioClips = clips.filter((c) => c.trackType === "AUDIO");

  // Ditambah offset 80px dari lebar label kolom kiri
  const timelineWidth = 80 + Math.max(totalDuration, 40) * PIXELS_PER_SECOND;

  const handleLaneClick = (e) => {
    onDeselect();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / PIXELS_PER_SECOND));
    onSeek(newTime);
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
        <span className="timeline-editor__total">{formatTime(totalDuration)} total</span>
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

          {clips.length === 0 ? (
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
              {/* TRACK VIDEO */}
              <div className="timeline-editor__track">
                <span className="timeline-editor__track-label">Video Track</span>
                <div
                  className={`timeline-editor__lane ${dragOverTrack === "VIDEO" ? "timeline-editor__lane--drag-over" : ""}`}
                  onClick={handleLaneClick}
                  onDragOver={(e) => handleDragOver(e, "VIDEO")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "VIDEO")}
                >
                  {videoClips.map((clip) => (
                    <Clip
                      key={clip.id}
                      clip={clip}
                      isSelected={clip.id === selectedClipId}
                      onSelect={onSelectClip}
                      onTrim={onTrimClip}
                      onDelete={onDeleteClip}
                    />
                  ))}
                </div>
              </div>

              {/* TRACK AUDIO */}
              <div className="timeline-editor__track">
                <span className="timeline-editor__track-label">Audio Track</span>
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
                      onDelete={onDeleteClip}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {clips.length > 0 && (
            <Playhead currentTime={currentTime} totalDuration={totalDuration} onSeek={onSeek} />
          )}

        </div>
      </div>
    </section>
  );
}