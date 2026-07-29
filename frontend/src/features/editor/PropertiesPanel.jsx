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

export default function PropertiesPanel({ clip, onUpdateTrim, onUpdateProperties }) {
  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  const [textInput, setTextInput] = useState("");
  const [fontColorInput, setFontColorInput] = useState("#ffffff");
  const [fontSizeInput, setFontSizeInput] = useState(36);

  useEffect(() => {
    if (clip) {
      setStartInput(toMMSS(clip.trimStart));
      setEndInput(toMMSS(clip.trimEnd));
      setTextInput(clip.textContent || clip.name || "");
      setFontColorInput(clip.fontColor || "#ffffff");
      setFontSizeInput(clip.fontSize || 36);
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

  const isTextClip = clip.type === "text" || clip.trackType === "TEXT" || !!clip.textContent;

  const commitStart = () => onUpdateTrim && onUpdateTrim(clip.id, { trimStart: fromMMSS(startInput) });
  const commitEnd = () => onUpdateTrim && onUpdateTrim(clip.id, { trimEnd: fromMMSS(endInput) });

  const commitText = () => {
    if (onUpdateProperties && textInput.trim()) {
      onUpdateProperties(clip.id, { textContent: textInput.trim() });
    }
  };

  const commitColor = (e) => {
    const val = e.target.value;
    setFontColorInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { fontColor: val });
    }
  };

  const commitFontSize = (e) => {
    const val = parseInt(e.target.value, 10) || 36;
    setFontSizeInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { fontSize: val });
    }
  };

  return (
    <aside className="properties-panel">
      <h3>PROPERTIES</h3>

      <div className="properties-panel__section">
        <span className="properties-panel__label">CLIP</span>
        <span className="properties-panel__value">{clip.name.toUpperCase()}</span>
      </div>

      {isTextClip && (
        <>
          <div className="properties-panel__row">
            <label>Teks</label>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === "Enter" && commitText()}
            />
          </div>

          <div className="properties-panel__row">
            <label>Warna Teks</label>
            <input
              type="color"
              value={fontColorInput}
              onChange={commitColor}
              style={{ width: "40px", padding: "0 2px", height: "28px", cursor: "pointer" }}
            />
          </div>

          <div className="properties-panel__row">
            <label>Ukuran Font</label>
            <input
              type="number"
              value={fontSizeInput}
              min="12"
              max="120"
              onChange={(e) => setFontSizeInput(e.target.value)}
              onBlur={commitFontSize}
              onKeyDown={(e) => e.key === "Enter" && commitFontSize(e)}
            />
          </div>
        </>
      )}

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
        <span>{clip.trackName || `${clip.trackType} Track`}</span>
      </div>
    </aside>
  );
}