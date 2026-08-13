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
  transitions = [],
  isSeeking,
  seekGeneration,
  selectedClipId,
  onSelectClip,
  onUpdateProperties,
  selectedTransition,
}) {
  const primaryVideoRef = useRef(null);
  const audioRefs = useRef({});
  const containerRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = containerRef.current;
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(console.error);
      } else if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

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

  const getClipDuration = (c) => c.duration ?? ((c.trimEnd ?? 0) - (c.trimStart ?? 0));

  // Active Video / Image clips across all Video Tracks at currentTime (including transition window overlap)
  // Active Video / Image clips across all Video Tracks at currentTime (including transition window overlap)
  const activeVideoClips = clips
    .filter((c) => {
      const isVideoOrImage =
        c.trackType === "VIDEO" || c.type === "video" || c.type === "image";
      if (!isVideoOrImage || c.type === "text") return false;

      const dur = getClipDuration(c);
      const isActiveNow =
        currentTime >= c.timelineStart &&
        currentTime < c.timelineStart + dur;

      if (isActiveNow) return true;

      // Check all transitions (both saved transitions and currently selected transition)
      const allTrans = [...(transitions || [])];
      if (selectedTransition && !allTrans.some((t) => t.id === selectedTransition.id)) {
        allTrans.push(selectedTransition);
      }

      for (const trans of allTrans) {
        const { leftClip, rightClip, duration: transDur = 1.0 } = trans;
        const fullLeft = clips.find((item) => item.id === (leftClip?.id || trans.leftClipId)) || leftClip;
        const fullRight = clips.find((item) => item.id === (rightClip?.id || trans.rightClipId)) || rightClip;

        const leftDur = fullLeft ? getClipDuration(fullLeft) : 0;
        const transitionPoint = (fullLeft?.timelineStart || 0) + leftDur;
        const halfDur = (transDur || 1.0) / 2;
        const tStart = transitionPoint - halfDur;
        const tEnd = transitionPoint + halfDur;

        if (currentTime >= tStart && currentTime <= tEnd) {
          if (c.id === fullLeft?.id || c.id === fullRight?.id) return true;
        }
      }

      return false;
    })
    .sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0));

  const masterVideoClip = activeVideoClips.find((c) => c.type === "video") || activeVideoClips[0] || null;

  // Active Text clips across all Text Tracks at currentTime
  const activeTextClips = clips.filter(
    (c) =>
      (c.trackType === "TEXT" || c.type === "text" || !!c.textContent) &&
      currentTime >= c.timelineStart &&
      currentTime < c.timelineStart + getClipDuration(c)
  );

  // All Audio clips across all Audio Tracks
  const allAudioClips = clips.filter(
    (c) => c.trackType === "AUDIO" || c.type === "audio"
  );

  // Active Audio clips across all Audio Tracks at currentTime
  const activeAudioClips = allAudioClips.filter(
    (c) =>
      currentTime >= c.timelineStart &&
      currentTime < c.timelineStart + getClipDuration(c)
  );

  const isVideoMuted = masterVideoClip?.muted || allAudioClips.length > 0;

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

    onTogglePlay();
  };

  const performSeek = (newTime) => {
    const targetTime = Math.max(0, Math.min(totalDuration, newTime));
    onSeek(targetTime);

    // Immediately sync video element native currentTime
    if (primaryVideoRef.current && masterVideoClip && masterVideoClip.type === "video") {
      const clipOffset = Math.max(0, targetTime - masterVideoClip.timelineStart);
      const targetInFile = (masterVideoClip.trimStart ?? 0) + clipOffset;
      primaryVideoRef.current.currentTime = targetInFile;
    }

    // Immediately sync all audio elements native currentTime
    allAudioClips.forEach((ac) => {
      const audioEl = audioRefs.current[ac.id];
      if (audioEl && ac.url) {
        const clipOffset = Math.max(0, targetTime - ac.timelineStart);
        const targetInFile = (ac.trimStart ?? 0) + clipOffset;
        audioEl.currentTime = targetInFile;
      }
    });
  };

  const handleSeekDelta = (delta) => performSeek(currentTime + delta);
  const handleJumpToStart = () => performSeek(0);
  const handleJumpToEnd = () => performSeek(totalDuration);

  // Sync Video Playback (Pause ALL video elements in DOM when paused)
  useEffect(() => {
    const container = containerRef.current;
    const masterVideoEl = primaryVideoRef.current;

    if (isPlaying) {
      if (masterVideoEl && masterVideoClip?.type === "video") {
        masterVideoEl.play().catch((err) => console.log("Autoplay blocked/interrupted:", err));
      }
    } else {
      if (container) {
        const allVideoEls = container.querySelectorAll("video");
        allVideoEls.forEach((v) => {
          try {
            v.pause();
          } catch (err) {
            console.error(err);
          }
        });
      } else if (masterVideoEl) {
        masterVideoEl.pause();
      }
    }
  }, [masterVideoClip, isPlaying]);

  // Sync Video Position on clip switch, currentTime change (when paused), or manual seek
  useEffect(() => {
    const videoEl = primaryVideoRef.current;
    if (!videoEl || !masterVideoClip || masterVideoClip.type !== "video") return;

    const clipOffset = Math.max(0, currentTime - masterVideoClip.timelineStart);
    const targetInFile = (masterVideoClip.trimStart ?? 0) + clipOffset;

    const syncPosition = () => {
      try {
        if (!isPlaying || Math.abs(videoEl.currentTime - targetInFile) > 1.5) {
          videoEl.currentTime = targetInFile;
        }
      } catch (e) {
        console.error("Error syncing video position:", e);
      }
    };

    if (videoEl.readyState > 0) {
      syncPosition();
    } else {
      const onLoaded = () => {
        syncPosition();
        videoEl.removeEventListener("loadedmetadata", onLoaded);
      };
      videoEl.addEventListener("loadedmetadata", onLoaded);
      return () => videoEl.removeEventListener("loadedmetadata", onLoaded);
    }
  }, [masterVideoClip?.id, currentTime, seekGeneration, isPlaying]);

  // Sync Video Muted State dynamically on native DOM element
  useEffect(() => {
    const videoEl = primaryVideoRef.current;
    if (videoEl) {
      videoEl.muted = isVideoMuted;
    }
  }, [isVideoMuted, masterVideoClip]);

  // 1. Sync Audio Volume & Mute properties in real time
  useEffect(() => {
    allAudioClips.forEach((ac) => {
      const audioEl = audioRefs.current[ac.id];
      if (audioEl) {
        audioEl.volume = Math.max(0, Math.min(1, ac.volume ?? 1));
        audioEl.muted = ac.muted ?? false;
      }
    });
  }, [allAudioClips]);

  // 2. Handle External Manual Seek (drag playhead / click timeline)
  const prevSeekGenRef = useRef(seekGeneration);
  useEffect(() => {
    if (prevSeekGenRef.current === seekGeneration) return;
    prevSeekGenRef.current = seekGeneration;

    performSeek(currentTime);
  }, [seekGeneration]);

  // 3. One-Way Audio Playback & Active Clip Boundary Controller
  useEffect(() => {
    // Clean up deleted/orphaned audio refs
    Object.keys(audioRefs.current).forEach((id) => {
      if (!allAudioClips.some((c) => c.id === id)) {
        if (audioRefs.current[id]) {
          audioRefs.current[id].pause();
          delete audioRefs.current[id];
        }
      }
    });

    allAudioClips.forEach((ac) => {
      const audioEl = audioRefs.current[ac.id];
      if (!audioEl || !ac.url) return;

      const isCurrentlyActive =
        currentTime >= ac.timelineStart &&
        currentTime < ac.timelineStart + ac.duration;

      if (isPlaying && isCurrentlyActive) {
        if (audioEl.paused) {
          const clipOffset = Math.max(0, currentTime - ac.timelineStart);
          const targetInFile = (ac.trimStart ?? 0) + clipOffset;
          audioEl.currentTime = targetInFile;
          audioEl.play().catch(console.error);
        }
      } else {
        if (audioEl && !audioEl.paused) {
          audioEl.pause();
        }
      }
    });
  }, [isPlaying, currentTime, allAudioClips]);

  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    videoEl.muted = isVideoMuted;
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

  // Universal RAF Timer Loop during playback
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let frameId;

    const tick = (now) => {
      if (isSeeking?.current) {
        lastTime = now;
        frameId = requestAnimationFrame(tick);
        return;
      }

      const videoEl = primaryVideoRef.current;
      if (videoEl && masterVideoClip?.type === "video" && !videoEl.paused && videoEl.readyState >= 2) {
        const clipOffset = Math.max(0, videoEl.currentTime - (masterVideoClip.trimStart ?? 0));
        const realTime = masterVideoClip.timelineStart + clipOffset;
        if (realTime >= totalDuration) {
          onSeek(totalDuration);
          onTogglePlay();
          return;
        }
        onSeek(realTime);
      } else {
        const elapsed = (now - lastTime) / 1000;
        if (elapsed > 0) {
          onSeek((prev) => {
            const nextTime = prev + elapsed;
            if (nextTime >= totalDuration) {
              onTogglePlay();
              return totalDuration;
            }
            return nextTime;
          });
        }
      }

      lastTime = now;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, totalDuration, masterVideoClip, onSeek, onTogglePlay, isSeeking]);

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

              const posStyle = isVid ? {} : getPositionStyle(clip.textPosition || "Top Right", true);
              const transT = clip.x || clip.y ? `translate(${clip.x || 0}px, ${clip.y || 0}px)` : "";
              const rotT = clip.rotation ? `rotate(${clip.rotation}deg)` : "";
              const scaleT = clip.scale !== undefined && clip.scale !== 1 ? `scale(${clip.scale})` : "";
              const combinedTransform = [transT, rotT, scaleT].filter(Boolean).join(" ");
              // Calculate dynamic transition effects (Fade, Dissolve, Wipe)
              let transitionOpacity = clip.opacity ?? 1;
              let transitionClipPath = (clip.cropY || clip.cropX || clip.cropH || clip.cropW)
                ? `inset(${clip.cropY || 0}% ${clip.cropX || 0}% ${clip.cropH || 0}% ${clip.cropW || 0}%)`
                : "none";

              const allTrans = [...(transitions || [])];
              if (selectedTransition && !allTrans.some((t) => t.id === selectedTransition.id)) {
                allTrans.push(selectedTransition);
              }

              let extraTransform = "";
              let isTopLeftClipInTrans = false;

              for (const trans of allTrans) {
                const { leftClip, rightClip, type = "Fade", duration = 1.0 } = trans;
                const fullLeft = clips.find((item) => item.id === (leftClip?.id || trans.leftClipId)) || leftClip;
                const fullRight = clips.find((item) => item.id === (rightClip?.id || trans.rightClipId)) || rightClip;

                const leftDur = fullLeft ? getClipDuration(fullLeft) : 0;
                const transitionPoint = (fullLeft?.timelineStart || 0) + leftDur;
                const transDur = duration || 1.0;
                const tStart = transitionPoint;
                const tEnd = transitionPoint + transDur;

                if (currentTime >= tStart && currentTime <= tEnd) {
                  const progress = Math.max(0, Math.min(1, (currentTime - tStart) / duration));

                  if (type === "Fade") {
                    // Dip-to-Black Fade
                    if (clip.id === fullLeft?.id) {
                      isTopLeftClipInTrans = true;
                      transitionOpacity *= progress < 0.5 ? 1 - progress * 2 : 0;
                    } else if (clip.id === fullRight?.id) {
                      transitionOpacity *= progress >= 0.5 ? (progress - 0.5) * 2 : 0;
                    }
                  } else if (type === "Dissolve") {
                    // Smooth Cross-Dissolve Blend
                    if (clip.id === fullLeft?.id) {
                      isTopLeftClipInTrans = true;
                      transitionOpacity *= 1 - progress;
                    } else if (clip.id === fullRight?.id) {
                      transitionOpacity *= progress;
                    }
                  } else if (type === "Wipe" || type === "Wipe Right" || type === "Wipe Left") {
                    // Crisp Horizontal Wipe
                    if (clip.id === fullLeft?.id) {
                      isTopLeftClipInTrans = true;
                      transitionClipPath = `inset(0 ${Math.round(progress * 100)}% 0 0)`;
                    } else if (clip.id === fullRight?.id) {
                      transitionClipPath = `inset(0 0 0 ${Math.round((1 - progress) * 100)}%)`;
                    }
                  }
                }
              }

              const finalTransform = [combinedTransform, extraTransform].filter(Boolean).join(" ");

              return (
                <div
                  key={clip.id}
                  className={`canvas-preview__layer ${isSelected ? "canvas-preview__layer--selected" : ""} ${isImg ? "canvas-preview__layer--image" : ""}`}
                  onMouseDown={(e) => handleMouseDown(e, clip)}
                  style={{
                    zIndex: isTopLeftClipInTrans ? index + 50 : index + 1,
                    cursor: draggingClipId === clip.id ? "grabbing" : "grab",
                    outline: isSelected ? "2px dashed #6366f1" : "none",
                    outlineOffset: "2px",
                  }}
                >
                  <div
                    style={{
                      ...posStyle,
                      transform: finalTransform || "none",
                      opacity: transitionOpacity,
                      clipPath: transitionClipPath,
                      transition: (draggingClipId === clip.id || isPlaying) ? "none" : "transform 0.15s ease-out",
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
                        muted={isVideoMuted || !isMaster}
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
        {allAudioClips.map((ac) => (
          <audio
            key={ac.id}
            ref={(el) => {
              if (el) {
                audioRefs.current[ac.id] = el;
                el.volume = Math.max(0, Math.min(1, ac.volume ?? 1));
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