import { useRef, useEffect, useState } from "react";
import "./CanvasPreview.css";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CanvasPreview({ currentTime, totalDuration, isPlaying, onTogglePlay, onSeek, clips = [], isSeeking, seekGeneration }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);

  // Cari clip yang aktif berdasarkan posisi playhead saat ini (hanya video/image)
  const activeClip = clips.find(
    (c) => c.trackType !== "AUDIO" && currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration
  ) || null;

  const isVideo = activeClip?.type === "video";
  const isImage = activeClip?.type === "image";
  const src = activeClip?.url ?? null;

  // Cari clip audio yang aktif pada playhead saat ini
  const activeAudioClip = clips.find(
    (c) => c.trackType === "AUDIO" && currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration
  );
  const audioSrc = activeAudioClip?.url ?? null;

  // Handler klik tombol Play/Pause.
  // PENTING: video.play() dan audio.play() dipanggil LANGSUNG di sini (dalam
  // konteks gesture pengguna) agar browser tidak memblokir autoplay policy.
  // useEffect di bawah menangani sinkronisasi saat state berubah dari luar.
  const handleTogglePlay = () => {
    const videoEl = videoRef.current;
    if (videoEl && src && isVideo) {
      if (!isPlaying) {
        videoEl.play().catch(console.error);
      } else {
        videoEl.pause();
      }
    }
    const audioEl = audioRef.current;
    if (audioEl && audioSrc) {
      if (!isPlaying) {
        audioEl.play().catch(console.error);
      } else {
        audioEl.pause();
      }
    }
    onTogglePlay();
  };

  // 1. VIDEO: Sinkronisasi Status Play/Pause
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src || !isVideo) return;
    if (isPlaying) {
      if (videoEl.readyState > 0) {
        videoEl.play().catch((err) => console.log("Autoplay blocked or interrupted:", err));
      }
    } else {
      videoEl.pause();
    }
  }, [src, isPlaying, isVideo]);

  // 2. VIDEO: Sinkronisasi Posisi Waktu
  // seekGeneration ditambah ke deps agar video juga di-seek ulang setelah user drag selesai.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src || !activeClip || !isVideo) return;
    if (videoEl.readyState === 0) return;

    const clipOffset = Math.max(0, currentTime - activeClip.timelineStart);
    const targetInFile = (activeClip.trimStart ?? 0) + clipOffset;

    if (Math.abs(videoEl.currentTime - targetInFile) > 0.3) {
      videoEl.currentTime = targetInFile;
    }
  }, [currentTime, src, activeClip, isVideo, seekGeneration]);

  // 3. AUDIO: Sinkronisasi Terpusat (Play/Pause & Re-seek setelah drag)
  // seekGeneration ditambah ke deps agar effect ini re-run setelah user
  // selesai drag playhead — memaksa audio seek ke posisi baru meski sedang playing.
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !audioSrc || !activeAudioClip) return;
    if (audioEl.readyState === 0) return;

    const clipOffset = Math.max(0, currentTime - activeAudioClip.timelineStart);
    const targetInFile = (activeAudioClip.trimStart ?? 0) + clipOffset;

    if (isPlaying) {
      if (audioEl.paused) {
        // Baru mulai / resume dari pause: seek ke posisi tepat lalu play
        if (Math.abs(audioEl.currentTime - targetInFile) > 0.05) {
          audioEl.currentTime = targetInFile;
        }
        audioEl.play().catch((err) => console.log("Audio play failed:", err));
      } else {
        // Audio sudah berjalan: paksa seek jika posisi melenceng
        // (terjadi setelah user drag playhead mundur saat audio playing)
        if (Math.abs(audioEl.currentTime - targetInFile) > 0.05) {
          audioEl.currentTime = targetInFile;
        }
      }
    } else {
      if (!audioEl.paused) {
        audioEl.pause();
      }
    }
    // currentTime SENGAJA tidak di deps saat playing — hanya seekGeneration
    // yang memicu re-sync posisi, agar tidak seek setiap milidetik.
  }, [isPlaying, audioSrc, activeAudioClip, seekGeneration]);

  // 4. AUDIO SCRUBBING: Sinkronisasi Waktu HANYA saat aplikasi sedang di-Pause
  useEffect(() => {
    const audioEl = audioRef.current;
    if (isPlaying || !audioEl || !audioSrc || !activeAudioClip) return;
    if (audioEl.readyState === 0) return;

    const clipOffset = Math.max(0, currentTime - activeAudioClip.timelineStart);
    const targetInFile = (activeAudioClip.trimStart ?? 0) + clipOffset;

    // Hanya ubah posisi audio jika pengguna menggeser timeline manual saat video berhenti
    if (Math.abs(audioEl.currentTime - targetInFile) > 0.1) {
      audioEl.currentTime = targetInFile;
    }
  }, [currentTime, isPlaying, audioSrc, activeAudioClip]);

  // Eksekusi ketika file video selesai memuat metadata
  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    if (videoEl.videoWidth && videoEl.videoHeight) {
      setAspectRatio(`${videoEl.videoWidth} / ${videoEl.videoHeight}`);
    }
    
    if (!activeClip || !isVideo) return;

    const clipOffset = Math.max(0, currentTime - activeClip.timelineStart);
    const targetInFile = (activeClip.trimStart ?? 0) + clipOffset;

    videoEl.currentTime = targetInFile;
    if (isPlaying) {
      videoEl.play().catch((err) => console.log("Autoplay on load failed:", err));
    }
  };

  // Eksekusi ketika file audio selesai memuat metadata
  const handleAudioLoadedMetadata = (e) => {
    const audioEl = e.target;
    if (!activeAudioClip) return;

    const clipOffset = Math.max(0, currentTime - activeAudioClip.timelineStart);
    const targetInFile = (activeAudioClip.trimStart ?? 0) + clipOffset;

    audioEl.currentTime = targetInFile;
    if (isPlaying && audioEl.paused) {
      audioEl.play().catch((err) => console.log("Audio autoplay on load failed:", err));
    }
  };

  // Video berjalan sendiri -> update playhead di timeline
  const handleTimeUpdate = (e) => {
    if (e.target.seeking) return;
    if (isSeeking?.current) return; // user sedang drag/seek manual
    if (!isPlaying || !activeClip || !isVideo) return;
    const clipOffset = e.target.currentTime - (activeClip.trimStart ?? 0);
    const newTime = activeClip.timelineStart + Math.max(0, clipOffset);

    if (newTime <= totalDuration) {
      onSeek(newTime);
    } else {
      onTogglePlay();
    }
  };

  // Audio berjalan sendiri -> update playhead di timeline (sama seperti video)
  const handleAudioTimeUpdate = (e) => {
    if (e.target.seeking) return;
    if (isSeeking?.current) return; // user sedang drag/seek manual
    if (!isPlaying || !activeAudioClip) return;
    const clipOffset = e.target.currentTime - (activeAudioClip.trimStart ?? 0);
    const newTime = activeAudioClip.timelineStart + Math.max(0, clipOffset);

    if (newTime <= totalDuration) {
      onSeek(newTime);
    } else {
      onTogglePlay();
    }
  };

  // LOOP DRIVER UNTUK SELAIN VIDEO DAN SELAIN AUDIO (Gambar / Area Kosong)
  // Hanya aktif jika tidak ada video maupun audio yang bisa jadi master clock.
  useEffect(() => {
    if (!isPlaying) return;
    if (isVideo) return;        // video jadi master clock
    if (activeAudioClip) return; // audio jadi master clock via handleAudioTimeUpdate

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
  }, [isPlaying, isVideo, activeAudioClip, totalDuration, onSeek]);

  return (
    <section className="canvas-preview">
      <div className="canvas-preview__header">
        <h3>CANVAS / PREVIEW VIDEO</h3>
      </div>

      <div className="canvas-preview__stage">
        <div 
          className="canvas-preview__inner" 
          style={{ '--ratio': aspectRatio || '16/9' }}
        >
          {src ? (
            isVideo ? (
              <video
                ref={videoRef}
                className="canvas-preview__video"
                src={src}
                playsInline
                muted={Boolean(audioSrc)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            ) : isImage ? (
              <img
                className="canvas-preview__image"
                src={src}
                alt={activeClip.name}
              />
            ) : (
              <span className="canvas-preview__placeholder canvas-preview__placeholder--muted">
                Format tidak didukung
              </span>
            )
          ) : (
            <span className="canvas-preview__placeholder canvas-preview__placeholder--muted">
              {totalDuration > 0 ? "Pilih clip untuk diputar" : "Belum ada clip untuk ditampilkan"}
            </span>
          )}
        </div>

        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            preload="auto"
            style={{ display: "none" }}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
          />
        )}
      </div>

      <div className="canvas-preview__controls">
        <button className="btn btn--primary btn--sm" onClick={handleTogglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="canvas-preview__time">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </section>
  );
}