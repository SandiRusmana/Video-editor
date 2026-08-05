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
    // Jika posisi waktu berada di akhir timeline (selesai), otomatis reset ke awal (0s) saat ditekan Play!
    if (!isPlaying && currentTime >= totalDuration - 0.1) {
      onSeek(0);
    }

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
      videoEl.play().catch((err) => console.log("Autoplay blocked/interrupted:", err));
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

    // Only update currentTime on explicit seek or if drift is significant (> 0.8s)
    if (Math.abs(videoEl.currentTime - targetInFile) > 0.8 || !isPlaying) {
      videoEl.currentTime = targetInFile;
    }
  }, [masterVideoClip, seekGeneration, isPlaying]);

  // Sync Audio Playback & Position
  useEffect(() => {
    activeAudioClips.forEach((ac) => {
      const audioEl = audioRefs.current[ac.id];
      if (!audioEl || !ac.url) return;

      const clipOffset = Math.max(0, currentTime - ac.timelineStart);
      const targetInFile = (ac.trimStart ?? 0) + clipOffset;

      if (isPlaying) {
        if (audioEl.paused) {
          audioEl.currentTime = targetInFile;
          audioEl.play().catch(console.error);
        } else if (Math.abs(audioEl.currentTime - targetInFile) > 0.8) {
          audioEl.currentTime = targetInFile;
        }
      } else {
        if (!audioEl.paused) audioEl.pause();
        if (Math.abs(audioEl.currentTime - targetInFile) > 0.3) {
          audioEl.currentTime = targetInFile;
        }
      }
    });
  }, [isPlaying, activeAudioClips, seekGeneration]);

  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    if (videoEl.videoWidth && videoEl.videoHeight) {
      setAspectRatio(`${videoEl.videoWidth} / ${videoEl.videoHeight}`);
    }
    if (!masterVideoClip || masterVideoClip.type !== "video") return;
    const clipOffset = Math.max(0, currentTime - masterVideoClip.timelineStart);
    const targetInFile = (masterVideoClip.trimStart ?? 0) + clipOffset;
    videoEl.currentTime = targetInFile;
    if (isPlaying) {
      videoEl.play().catch((err) => console.log("Play failed on metadata load:", err));
    }
  };

  const handleCanPlay = (e) => {
    if (isPlaying && e.target.paused) {
      e.target.play().catch(console.error);
    }
  };

  const handleTimeUpdate = (e) => {
    if (e.target.seeking) return;
    if (isSeeking?.current) return;
    if (!isPlaying || !masterVideoClip || masterVideoClip.type !== "video") return;

    const clipOffset = e.target.currentTime - (masterVideoClip.trimStart ?? 0);
    const clipDuration = masterVideoClip.trimEnd - masterVideoClip.trimStart;

    if (clipOffset >= clipDuration - 0.05) {
      const nextTime = masterVideoClip.timelineStart + clipDuration + 0.01;
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

              const posStyle = getPositionStyle(clip.textPosition || (isImg ? "Top Right" : undefined), !isVid);
              const baseT = posStyle.transform || "";
              const transT = clip.x || clip.y ? `translate(${clip.x || 0}px, ${clip.y || 0}px)` : "";
              const rotT = clip.rotation ? `rotate(${clip.rotation}deg)` : "";
              const scaleT = clip.scale !== undefined ? `scale(${clip.scale})` : "";
              const combinedTransform = [baseT, transT, rotT, scaleT].filter(Boolean).join(" ");

              return (
                <div
                  className={`canvas-preview__layer ${isSelected ? "canvas-preview__layer--selected" : ""} ${isImg ? "canvas-preview__layer--image" : ""}`}
                  onMouseDown={(e) => handleMouseDown(e, clip)}
                  style={{
                    zIndex: index + 1,
                    cursor: draggingClipId === clip.id ? "grabbing" : "grab",
                    outline: isSelected ? "2px dashed #6366f1" : "none",
                    outlineOffset: "2px",
                  }}
                >
                  <div 
                    style={{
                      ...posStyle,
                      transform: combinedTransform || "none",
                      opacity: clip.opacity ?? 1,
                      clipPath: (clip.cropY || clip.cropX || clip.cropH || clip.cropW)
                        ? `inset(${clip.cropY || 0}% ${clip.cropX || 0}% ${clip.cropH || 0}% ${clip.cropW || 0}%)`
                        : "none",
                      transition: draggingClipId === clip.id ? "none" : "transform 0.15s ease-out, clip-path 0.15s ease-out",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: isVid ? "100%" : "auto",
                      height: isVid ? "100%" : "auto",
                      maxHeight: isImg ? "45%" : "100%",
                      maxWidth: isImg ? "45%" : "100%",
                    }}
                  >
                    {isVid ? (
                      <video
                        ref={isMaster ? primaryVideoRef : null}
                        src={clip.url}
                        playsInline
                        autoPlay={isPlaying}
                        muted={activeAudioClipCount(clips) > 0}
                        onTimeUpdate={isMaster ? handleTimeUpdate : undefined}
                        onLoadedMetadata={isMaster ? handleLoadedMetadata : undefined}
                        onCanPlay={isMaster ? handleCanPlay : undefined}
                        className="canvas-preview__video"
                      />
                    ) : isImg ? (
                      <img src={clip.url} alt={clip.name} className="canvas-preview__image" />
                    ) : null}
                  </div>
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
          {activeTextClips.map((textClip) => {
            const posStyle = getPositionStyle(textClip.textPosition, true);
            return (
              <div
                key={textClip.id}
                className="canvas-preview__text-overlay"
                style={{
                  fontSize: `${textClip.fontSize || 36}px`,
                  color: textClip.fontColor || "#ffffff",
                  fontFamily: textClip.fontFamily || "Poppins, sans-serif",
                  ...posStyle
                }}
              >
                {textClip.textContent || textClip.name}
              </div>
            );
          })}
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

function getPositionStyle(positionName, isOverlay = false) {
  const base = { position: "absolute" };
  const d = isOverlay ? "16px" : "0px"; // padding from edge
  
  switch (positionName) {
    case "Top Left":
      return { ...base, top: d, left: d, right: "auto", bottom: "auto", transform: "" };
    case "Top Center":
      return { ...base, top: d, left: "50%", right: "auto", bottom: "auto", transform: "translateX(-50%)" };
    case "Top Right":
      return { ...base, top: d, right: d, left: "auto", bottom: "auto", transform: "" };
    case "Center Left":
      return { ...base, top: "50%", left: d, right: "auto", bottom: "auto", transform: "translateY(-50%)" };
    case "Center":
      return { ...base, top: "50%", left: "50%", right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" };
    case "Center Right":
      return { ...base, top: "50%", right: d, left: "auto", bottom: "auto", transform: "translateY(-50%)" };
    case "Bottom Left":
      return { ...base, bottom: d, left: d, right: "auto", top: "auto", transform: "" };
    case "Bottom Right":
      return { ...base, bottom: d, right: d, left: "auto", top: "auto", transform: "" };
    case "Bottom Center":
    default:
      return { ...base, bottom: d, left: "50%", right: "auto", top: "auto", transform: "translateX(-50%)" };
  }
}