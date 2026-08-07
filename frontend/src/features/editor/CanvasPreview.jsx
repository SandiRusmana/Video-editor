import React, { useRef, useEffect, useState } from "react";
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
  selectedTransition,
}) {
  const primaryVideoRef = useRef(null);
  const audioRefs = useRef({});
  const [aspectRatio, setAspectRatio] = useState(null);

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

      <div className="canvas-preview__stage">
        <div className="canvas-preview__inner" style={{ "--ratio": aspectRatio || "16/9" }}>
          {activeVideoClips.length > 0 ? (
            activeVideoClips.map((clip, index) => {
              const isMaster = clip.id === masterVideoClip?.id;
              const isVid = clip.type === "video";
              const isImg = clip.type === "image";

              return (
                <div
                  key={clip.id}
                  className={`canvas-preview__layer ${isImg ? 'canvas-preview__layer--image' : ''}`}
                  style={{
                    zIndex: index + 1,
                    pointerEvents: "none",
                  }}
                >
                  <div 
                    style={{
                      ...getPositionStyle(clip.textPosition, !isVid),
                      transform: `${getPositionStyle(clip.textPosition, !isVid).transform} rotate(${clip.rotation || 0}deg) scale(${clip.scale || 1}) translate(${clip.x || 0}px, ${clip.y || 0}px)`,
                      opacity: clip.opacity ?? 1,
                      clipPath: (clip.cropY || clip.cropX || clip.cropH || clip.cropW)
                        ? `inset(${clip.cropY || 0}% ${clip.cropX || 0}% ${clip.cropH || 0}% ${clip.cropW || 0}%)`
                        : "none",
                      transition: "transform 0.15s ease-out, clip-path 0.15s ease-out",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: isVid ? "100%" : "auto",
                      height: isVid ? "100%" : "auto",
                      maxHeight: "100%",
                      maxWidth: "100%",
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

          {/* Transition Overlay Mockup */}
          {selectedTransition && (
            <>
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: '#e2e8f0',
                fontSize: '16px',
                fontWeight: '800',
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                zIndex: 100,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ letterSpacing: '0.05em' }}>"{selectedTransition.type.toUpperCase()} EFFECT IN ACTION"</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                  ({selectedTransition.leftClip?.name} → {selectedTransition.rightClip?.name})
                </span>
              </div>
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '36px',
                height: '36px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                zIndex: 100,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>⚡</div>
            </>
          )}
        </div>

        {/* Audio Elements */}
        {activeAudioClips.map((ac) => (
          <audio
            key={ac.id}
            ref={(el) => {
              if (el) {
                audioRefs.current[ac.id] = el;
                el.volume = ac.volume ?? 1;
                el.muted = ac.muted ?? false;
              }
            }}
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

      {/* Active Audio Indicator */}
      {activeAudioClips.length > 0 && (
        <div className="canvas-preview__audio-indicators" style={{
          padding: "8px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          borderTop: "1px solid #1a1f35"
        }}>
          {activeAudioClips.map(ac => (
            <div key={ac.id} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#10b981", fontSize: "13px" }}>
              <span>{ac.muted ? '🔇' : '🔊'}</span>
              <span>Playing: {ac.name} (Vol: {ac.muted ? 0 : Math.round((ac.volume ?? 1) * 100)}%)</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function activeAudioClipCount(clips) {
  return clips.filter((c) => c.trackType === "AUDIO").length;
}

function getPositionStyle(positionName, isOverlay = false) {
  const base = { position: "absolute" };
  const d = isOverlay ? "20px" : "0px"; // padding from edge
  
  if (!positionName && !isOverlay) {
    return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  
  switch (positionName) {
    case "Top Left": return { ...base, top: d, left: d, transform: "none" };
    case "Top Center": return { ...base, top: d, left: "50%", transform: "translateX(-50%)" };
    case "Top Right": return { ...base, top: d, right: d, transform: "none" };
    case "Center Left": return { ...base, top: "50%", left: d, transform: "translateY(-50%)" };
    case "Center": return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "Center Right": return { ...base, top: "50%", right: d, transform: "translateY(-50%)" };
    case "Bottom Left": return { ...base, bottom: d, left: d, transform: "none" };
    case "Bottom Right": return { ...base, bottom: d, right: d, transform: "none" };
    case "Bottom Center": 
    default: return { ...base, bottom: d, left: "50%", transform: "translateX(-50%)" }; 
  }
}