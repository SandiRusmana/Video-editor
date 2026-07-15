import { useRef, useEffect } from "react";
import "./CanvasPreview.css";

// Video sample publik dari MDN (dummy buat demo doang — nanti diganti file asli dari backend)
const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CanvasPreview({ currentTime, totalDuration, isPlaying, onTogglePlay, onSeek }) {
  const videoRef = useRef(null);

  // Sinkronkan Play/Pause tombol custom kita dengan elemen <video> asli
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.play().catch(() => {}); // catch: browser kadang block autoplay
    } else {
      videoEl.pause();
    }
  }, [isPlaying]);

  // Playhead di timeline digeser/di-drag -> lompatkan posisi video mengikuti
  // (video sample durasinya beda dari totalDuration timeline, jadi di-mod supaya gak error)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.duration) return;
    const target = currentTime % videoEl.duration;
    if (Math.abs(videoEl.currentTime - target) > 0.3) {
      videoEl.currentTime = target;
    }
  }, [currentTime]);

  // Video jalan sendiri (playing) -> playhead di timeline ikut bergerak
  const handleTimeUpdate = (e) => {
    if (isPlaying) onSeek(e.target.currentTime);
  };

  return (
    <section className="canvas-preview">
      <div className="canvas-preview__header">
        <h3>CANVAS / PREVIEW VIDEO</h3>
      </div>

      <div className="canvas-preview__stage">
        {totalDuration > 0 ? (
          <video
            ref={videoRef}
            className="canvas-preview__video"
            src={SAMPLE_VIDEO_URL}
            loop
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <span className="canvas-preview__placeholder canvas-preview__placeholder--muted">
            Belum ada clip untuk ditampilkan
          </span>
        )}
      </div>

      <div className="canvas-preview__controls">
        <button className="btn btn--primary btn--sm" onClick={onTogglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="canvas-preview__time">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </section>
  );
}