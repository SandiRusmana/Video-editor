import { useState, useEffect } from "react";
import "./PropertiesPanel.css";

function toMMSS(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fromMMSS(value) {
  const [m, s] = value.split(":").map((v) => parseInt(v, 10) || 0);
  return m * 60 + s;
}

export default function PropertiesPanel({ clip, onUpdateTrim }) {
  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  // Sinkronkan input text tiap kali clip yang dipilih berubah (atau di-trim lewat drag di timeline)
  useEffect(() => {
    if (clip) {
      setStartInput(toMMSS(clip.trimStart));
      setEndInput(toMMSS(clip.trimEnd));
    }
  }, [clip]);

  if (!clip) {
    return (
      <aside className="properties-panel">
        <h3>PROPERTIES</h3>
        <p className="properties-panel__empty">Pilih klip di timeline untuk melihat propertinya</p>
      </aside>
    );
  }

  const commitStart = () => onUpdateTrim(clip.id, { trimStart: fromMMSS(startInput) });
  const commitEnd = () => onUpdateTrim(clip.id, { trimEnd: fromMMSS(endInput) });

  return (
    <aside className="properties-panel">
      <h3>PROPERTIES</h3>

      <div className="properties-panel__section">
        <span className="properties-panel__label">CLIP</span>
        <span className="properties-panel__value">{clip.name.toUpperCase()}</span>
      </div>

      <div className="properties-panel__row">
        <label>Mulai</label>
        <input
          type="text"
          value={startInput}
          onChange={(e) => setStartInput(e.target.value)}
          onBlur={commitStart}
          onKeyDown={(e) => e.key === "Enter" && commitStart()}
        />
      </div>

      <div className="properties-panel__row">
        <label>Selesai</label>
        <input
          type="text"
          value={endInput}
          onChange={(e) => setEndInput(e.target.value)}
          onBlur={commitEnd}
          onKeyDown={(e) => e.key === "Enter" && commitEnd()}
        />
      </div>

      <div className="properties-panel__row properties-panel__row--static">
        <label>Durasi</label>
        <span>{clip.duration} detik</span>
      </div>

      <div className="properties-panel__row properties-panel__row--static">
        <label>Track</label>
        <span>Track 1</span>
      </div>
    </aside>
  );
}