import { useRef } from "react";
import "./MediaLibrary.css";

function formatDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ICONS = {
  video: "🎬",
  audio: "🎵",
  image: "🖼️",
};

export default function MediaLibrary({ mediaList, onAddToTimeline, onUploadMedia, onDeleteMedia }) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadMedia) {
      onUploadMedia(file);
      // Reset value agar file yang sama bisa di-upload ulang jika dibutuhkan
      e.target.value = "";
    }
  };

  return (
    <aside className="media-library">
      <div className="media-library__header">
        <h3>MEDIA LIBRARY</h3>
        <button className="btn btn--primary btn--sm" onClick={handleUploadClick}>
          + Upload Media
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*,audio/*,image/*"
          style={{ display: "none" }}
        />
      </div>

      {mediaList.length === 0 ? (
        <div className="media-library__empty">
          <p>Media masih kosong</p>
          <span>Silakan unggah file video, audio, atau gambar</span>
        </div>
      ) : (
        <ul className="media-library__list">
          {mediaList.map((media) => (
            <li
              key={media.id}
              className="media-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("mediaId", media.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
            >
              <div className={`media-item__thumb media-item__thumb--${media.type}`}>
                <span>{ICONS[media.type] || "📄"}</span>
              </div>
              <div className="media-item__info">
                <span className="media-item__name">{media.name}</span>
                <span className="media-item__duration">{formatDuration(media.sourceDuration)}</span>
              </div>
              <div className="media-item__actions" style={{ display: "flex", gap: "4px" }}>
                <button
                  className="media-item__add"
                  title="Add to Timeline"
                  onClick={() => onAddToTimeline(media)}
                >
                  +
                </button>
                <button
                  className="media-item__delete"
                  title="Hapus Media"
                  onClick={() => onDeleteMedia(media.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}