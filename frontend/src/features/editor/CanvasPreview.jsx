import { useRef, useEffect, useState } from "react";
import "./CanvasPreview.css";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CanvasPreview({
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  clips = [],
  isSeeking,
  seekGeneration,
  selectedClipId,
  onSelectClip,
  onUpdateProperties,
}) {
  const primaryVideoRef = useRef(null);
  const audioRefs = useRef({});
  const [aspectRatio, setAspectRatio] = useState(null);

  // Dragging Canvas Clip Position
  const [draggingClipId, setDraggingClipId] = useState(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e, clip) => {
    e.stopPropagation();
    if (onSelectClip) onSelectClip(clip.id);
    setDraggingClipId(clip.id);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: clip.x || 0,
      initialY: clip.y || 0,
    };
  };

  const handleMouseMove = (e) => {
    if (!draggingClipId) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    // Apply canvas boundary constraints (-400px to +400px for X, -300px to +300px for Y)
    const newX = Math.max(-400, Math.min(400, Math.round(dragStartRef.current.initialX + deltaX)));
    const newY = Math.max(-300, Math.min(300, Math.round(dragStartRef.current.initialY + deltaY)));

    if (onUpdateProperties) {
      onUpdateProperties(draggingClipId, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (draggingClipId) {
      setDraggingClipId(null);
    }
  };

  // Active Video / Image clips across all Video Tracks at currentTime
  const activeVideoClips = clips
    .filter(
      (c) =>
        c.trackType === "VIDEO" &&
        c.type !== "text" &&
        currentTime >= c.timelineStart &&
        currentTime < c.timelineStart + c.duration
    )
    .sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0));

  const masterVideoClip = activeVideoClips.find((c) => c.type === "video") || activeVideoClips[0] || null;

  // Active Text clips across all Text Tracks at currentTime
  const activeTextClips = clips.filter(
    (c) =>
      (c.trackType === "TEXT" || c.type === "text" || !!c.textContent) &&
      currentTime >= c.timelineStart &&
      currentTime < c.timelineStart + c.duration
  );

  // Active Audio clips across all Audio Tracks at currentTime
  const activeAudioClips = clips.filter(
    (c) =>
      (c.trackType === "AUDIO" || c.type === "audio") &&
      currentTime >= c.timelineStart &&
      currentTime < c.timelineStart + c.duration
  );

  const handleTogglePlay = () => {
    const videoEl = primaryVideoRef.current;
    if (videoEl && masterVideoClip?.type === "video") {
      if (!isPlaying) {
        videoEl.play().catch(console.error);
      } else {
        videoEl.pause();
      }
    }

    activeAudioClips.forEach((ac) => {
      const el = audioRefs.current[ac.id];
      if (el) {
        if (!isPlaying) {
          el.play().catch(console.error);
        } else {
          el.pause();
        }
      }
    });

    onTogglePlay();
  };

  const handleSeekDelta = (delta) => {
    const newTime = Math.max(0, Math.min(totalDuration, currentTime + delta));
    onSeek(newTime);
  };

  const handleJumpToStart = () => onSeek(0);
  const handleJumpToEnd = () => onSeek(totalDuration);

  // Sync Video Playback
  useEffect(() => {
    const videoEl = primaryVideoRef.current;
    if (!videoEl || !masterVideoClip || masterVideoClip.type !== "video") return;
    if (isPlaying) {
      if (videoEl.readyState >= 1) {
        videoEl.play().catch((err) => console.log("Autoplay blocked/interrupted:", err));
      }
    } else {
      videoEl.pause();
    }
  }, [masterVideoClip, isPlaying]);

  // Sync Video Position
  useEffect(() => {
    const videoEl = primaryVideoRef.current;
    if (!videoEl || !masterVideoClip || masterVideoClip.type !== "video") return;
    if (videoEl.readyState === 0) return;

    const clipOffset = Math.max(0, currentTime - masterVideoClip.timelineStart);
    const targetInFile = (masterVideoClip.trimStart ?? 0) + clipOffset;

    if (Math.abs(videoEl.currentTime - targetInFile) > 0.3) {
      videoEl.currentTime = targetInFile;
    }
  }, [currentTime, masterVideoClip, seekGeneration]);

  // Sync Audio Playback & Position
  useEffect(() => {
    activeAudioClips.forEach((ac) => {
      const audioEl = audioRefs.current[ac.id];
      if (!audioEl || !ac.url) return;

      const clipOffset = Math.max(0, currentTime - ac.timelineStart);
      const targetInFile = (ac.trimStart ?? 0) + clipOffset;

      if (isPlaying) {
        if (audioEl.paused) {
          if (Math.abs(audioEl.currentTime - targetInFile) > 0.1) {
            audioEl.currentTime = targetInFile;
          }
          audioEl.play().catch(console.error);
        } else if (Math.abs(audioEl.currentTime - targetInFile) > 0.2) {
          audioEl.currentTime = targetInFile;
        }
      } else {
        if (!audioEl.paused) audioEl.pause();
        if (Math.abs(audioEl.currentTime - targetInFile) > 0.1) {
          audioEl.currentTime = targetInFile;
        }
      }
    });
  }, [isPlaying, currentTime, activeAudioClips, seekGeneration]);

  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    if (videoEl.videoWidth && videoEl.videoHeight) {
      setAspectRatio(`${videoEl.videoWidth} / ${videoEl.videoHeight}`);
    }
    if (!masterVideoClip || masterVideoClip.type !== "video") return;
    const clipOffset = Math.max(0, currentTime - masterVideoClip.timelineStart);
    const targetInFile = (masterVideoClip.trimStart ?? 0) + clipOffset;
    videoEl.currentTime = targetInFile;
    if (isPlaying && videoEl.paused) {
      videoEl.play().catch(console.error);
    }
  };

  const handleTimeUpdate = (e) => {
    if (e.target.seeking) return;
    if (isSeeking?.current) return;
    if (!isPlaying || !masterVideoClip || masterVideoClip.type !== "video") return;

    const clipOffset = e.target.currentTime - (masterVideoClip.trimStart ?? 0);
    const clipDuration = masterVideoClip.trimEnd - masterVideoClip.trimStart;

    if (clipOffset >= clipDuration) {
      const nextTime = masterVideoClip.timelineStart + clipDuration;
      if (nextTime < totalDuration) {
        onSeek(nextTime);
      } else {
        onSeek(totalDuration);
        onTogglePlay();
      }
      return;
    }

    const newTime = masterVideoClip.timelineStart + Math.max(0, clipOffset);
    if (newTime <= totalDuration) {
      onSeek(newTime);
    } else {
      onTogglePlay();
    }
  };

  // Loop driver when no master video exists
  useEffect(() => {
    if (!isPlaying) return;
    if (masterVideoClip?.type === "video") return;

    let lastTime = performance.now();
    let frameId;

    const tick = (now) => {
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;

      onSeek((prev) => {
        const nextTime = prev + elapsed;
        if (nextTime >= totalDuration) {
          onTogglePlay();
          return totalDuration;
        }
        return nextTime;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, masterVideoClip, totalDuration, onSeek, onTogglePlay]);

  return (
    <section className="canvas-preview">
      <div className="canvas-preview__header">
        <h3>CANVAS / PREVIEW VIDEO</h3>
      </div>

      <div className="canvas-preview__stage" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <div className="canvas-preview__inner" style={{ "--ratio": aspectRatio || "16/9" }}>
          {activeVideoClips.length > 0 ? (
            activeVideoClips.map((clip, index) => {
              const isMaster = clip.id === masterVideoClip?.id;
              const isVid = clip.type === "video";
              const isImg = clip.type === "image";
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  className={`canvas-preview__layer ${isSelected ? "canvas-preview__layer--selected" : ""}`}
                  onMouseDown={(e) => handleMouseDown(e, clip)}
                  style={{
                    zIndex: index + 1,
                    transform: `rotate(${clip.rotation || 0}deg) scale(${clip.scale || 1}) translate(${clip.x || 0}px, ${clip.y || 0}px)`,
                    clipPath: (clip.cropY || clip.cropX || clip.cropH || clip.cropW)
                      ? `inset(${clip.cropY || 0}% ${clip.cropX || 0}% ${clip.cropH || 0}% ${clip.cropW || 0}%)`
                      : "none",
                    opacity: clip.opacity ?? 1,
                    cursor: draggingClipId === clip.id ? "grabbing" : "grab",
                    outline: isSelected ? "2px dashed #6366f1" : "none",
                    outlineOffset: "2px",
                    transition: draggingClipId === clip.id ? "none" : "transform 0.15s ease-out, clip-path 0.15s ease-out",
                  }}
                >
                  {isVid ? (
                    <video
                      ref={isMaster ? primaryVideoRef : null}
                      src={clip.url}
                      playsInline
                      muted={activeAudioClipCount(clips) > 0}
                      onTimeUpdate={isMaster ? handleTimeUpdate : undefined}
                      onLoadedMetadata={isMaster ? handleLoadedMetadata : undefined}
                      className="canvas-preview__video"
                    />
                  ) : isImg ? (
                    <img src={clip.url} alt={clip.name} className="canvas-preview__image" />
                  ) : null}
                </div>
              );
            })
          ) : (
            <span className="canvas-preview__placeholder canvas-preview__placeholder--muted">
              {totalDuration > 0
                ? "Posisikan playhead pada clip untuk diputar"
                : "Belum ada clip untuk ditampilkan"}
            </span>
          )}

          {/* Center Play/Pause button on canvas */}
          <button
            className={`canvas-preview__center-play-btn ${!isPlaying ? "canvas-preview__center-play-btn--paused" : ""}`}
            onClick={handleTogglePlay}
            title={isPlaying ? "Pause Video" : "Play Video"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>

          {/* Text Overlays */}
          {activeTextClips.map((textClip) => (
            <div
              key={textClip.id}
              className="canvas-preview__text-overlay"
              style={{
                fontSize: `${textClip.fontSize || 36}px`,
                color: textClip.fontColor || "#ffffff",
              }}
            >
              {textClip.textContent || textClip.name}
            </div>
          ))}
        </div>

        {/* Audio Elements */}
        {activeAudioClips.map((ac) => (
          <audio
            key={ac.id}
            ref={(el) => (audioRefs.current[ac.id] = el)}
            src={ac.url}
            preload="auto"
            style={{ display: "none" }}
          />
        ))}
      </div>

      {/* Sleek Controls Bar */}
      <div className="canvas-preview__controls-bar">
        <div className="canvas-preview__control-group">
          <button
            className="canvas-preview__btn-seek"
            onClick={handleJumpToStart}
            title="Ke Awal Timeline (0s)"
          >
            ⏮
          </button>
          <button
            className="canvas-preview__btn-seek"
            onClick={() => handleSeekDelta(-5)}
            title="Mundur 5 detik (-5s)"
          >
            ↺
          </button>

          <button
            className="canvas-preview__btn-play-main"
            onClick={handleTogglePlay}
            title={isPlaying ? "Pause (Spasi)" : "Play (Spasi)"}
          >
            {isPlaying ? (
              <>
                <span style={{ fontSize: "12px" }}>❚❚</span> PAUSE
              </>
            ) : (
              <>
                <span style={{ fontSize: "14px" }}>▶</span> PLAY
              </>
            )}
          </button>

          <button
            className="canvas-preview__btn-seek"
            onClick={() => handleSeekDelta(5)}
            title="Maju 5 detik (+5s)"
          >
            ↻
          </button>
          <button
            className="canvas-preview__btn-seek"
            onClick={handleJumpToEnd}
            title="Ke Akhir Timeline"
          >
            ⏭
          </button>
        </div>

        <div className="canvas-preview__time-badge">
          <span className="canvas-preview__time-current">{formatTime(currentTime)}</span>
          <span className="canvas-preview__time-sep">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </section>
  );
}

function activeAudioClipCount(clips) {
  return clips.filter((c) => c.trackType === "AUDIO").length;
}