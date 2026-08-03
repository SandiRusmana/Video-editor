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

  const [posXInput, setPosXInput] = useState(0);
  const [posYInput, setPosYInput] = useState(0);

  const [scaleInput, setScaleInput] = useState(1);

  useEffect(() => {
    if (clip) {
      setStartInput(toMMSS(clip.trimStart));
      setEndInput(toMMSS(clip.trimEnd));
      setTextInput(clip.textContent || clip.name || "");
      setFontColorInput(clip.fontColor || "#ffffff");
      setFontSizeInput(clip.fontSize || 36);
      setPosXInput(clip.x ?? 0);
      setPosYInput(clip.y ?? 0);
      setScaleInput(clip.scale ?? 1);
    }
  }, [clip]);

  if (!clip) {
    return (
      <aside className="properties-panel">
        <h3>⚙️ PROPERTIES</h3>
        <p className="properties-panel__empty">Pilih klip di timeline untuk melihat & mengatur propertinya</p>
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

  const commitPosX = () => {
    const val = parseInt(posXInput, 10) || 0;
    setPosXInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { x: val });
    }
  };

  const commitPosY = () => {
    const val = parseInt(posYInput, 10) || 0;
    setPosYInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { y: val });
    }
  };

  const resetPosition = () => {
    setPosXInput(0);
    setPosYInput(0);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { x: 0, y: 0 });
    }
  };

  const commitScale = (val) => {
    const num = parseFloat(val);
    const clamped = isNaN(num) ? 1 : Math.max(0.1, Math.min(3, num));
    setScaleInput(clamped);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { scale: clamped });
    }
  };

  const resetScale = () => {
    setScaleInput(1);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { scale: 1 });
    }
  };


  return (
    <aside className="properties-panel">
      <h3>⚙️ PROPERTIES</h3>

      {/* CARD 1: CLIP INFO */}
      <div className="properties-panel__card">
        <span className="properties-panel__section-title">CLIP INFO</span>
        <span className="properties-panel__value" title={clip.name}>{clip.name}</span>
        <div className="properties-panel__row">
          <label>Track</label>
          <span className="badge-value">{clip.trackName || `${clip.trackType} Track`}</span>
        </div>
        <div className="properties-panel__row">
          <label>Durasi</label>
          <span className="badge-value">{clip.duration}s</span>
        </div>
      </div>

      {/* CARD 2: TEXT CONTROL (IF TEXT CLIP) */}
      {isTextClip && (
        <div className="properties-panel__card">
          <span className="properties-panel__section-title">TEKS OVERLAY</span>
          <div className="properties-panel__row">
            <label>Teks</label>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === "Enter" && commitText()}
              style={{ width: "120px", textAlign: "left" }}
            />
          </div>

          <div className="properties-panel__row">
            <label>Warna</label>
            <input
              type="color"
              value={fontColorInput}
              onChange={commitColor}
              style={{ width: "45px", padding: "1px 2px", height: "26px", cursor: "pointer" }}
            />
          </div>

          <div className="properties-panel__row">
            <label>Ukuran</label>
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
        </div>
      )}

      {/* CARD 3: TIMING / TRIM */}
      <div className="properties-panel__card">
        <span className="properties-panel__section-title">TIMING / TRIM</span>
        <div className="properties-panel__row">
          <label>Waktu Mulai</label>
          <input
            type="text"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={commitStart}
            onKeyDown={(e) => e.key === "Enter" && commitStart()}
          />
        </div>

        <div className="properties-panel__row">
          <label>Waktu Selesai</label>
          <input
            type="text"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={commitEnd}
            onKeyDown={(e) => e.key === "Enter" && commitEnd()}
          />
        </div>
      </div>

      {/* CARD 4: ROTASI CONTROL */}
      <div className="properties-panel__card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="properties-panel__section-title">ROTASI</span>
          <span className="badge-value">{clip.rotation || 0}°</span>
        </div>

        <div className="btn-rotate-group">
          <button
            type="button"
            className="btn-rotate"
            title="Putar 90° Searah Jarum Jam"
            onClick={() => {
              const nextRot = ((clip.rotation || 0) + 90) % 360;
              onUpdateProperties && onUpdateProperties(clip.id, { rotation: nextRot });
            }}
          >
            ↻ +90°
          </button>
          <button
            type="button"
            className="btn-rotate"
            title="Putar 90° Berlawanan Arah Jarum Jam"
            onClick={() => {
              const nextRot = ((clip.rotation || 0) - 90 + 360) % 360;
              onUpdateProperties && onUpdateProperties(clip.id, { rotation: nextRot });
            }}
          >
            ↺ -90°
          </button>
          <button
            type="button"
            className="btn-rotate btn-rotate--reset"
            title="Reset Rotasi ke 0°"
            onClick={() => {
              onUpdateProperties && onUpdateProperties(clip.id, { rotation: 0 });
            }}
          >
            0°
          </button>
        </div>

        <div className="properties-panel__row">
          <label>Sudut</label>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={clip.rotation || 0}
            onChange={(e) => onUpdateProperties && onUpdateProperties(clip.id, { rotation: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>

      {/* CARD 5: POSISI (POSITION) CONTROL */}
      {clip.type !== "audio" && (
        <div className="properties-panel__card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="properties-panel__section-title">POSISI</span>
            {(posXInput !== 0 || posYInput !== 0) && (
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                onClick={resetPosition}
              >
                ↺ Reset
              </button>
            )}
          </div>

          <div className="properties-panel__row">
            <label>X</label>
            <input
              type="number"
              value={posXInput}
              onChange={(e) => setPosXInput(e.target.value)}
              onBlur={commitPosX}
              onKeyDown={(e) => e.key === "Enter" && commitPosX()}
              style={{ width: "75px" }}
            />
          </div>

          <div className="properties-panel__row">
            <label>Y</label>
            <input
              type="number"
              value={posYInput}
              onChange={(e) => setPosYInput(e.target.value)}
              onBlur={commitPosY}
              onKeyDown={(e) => e.key === "Enter" && commitPosY()}
              style={{ width: "75px" }}
            />
          </div>

          <div className="btn-preset-group">
            <button
              type="button"
              className="btn-preset"
              onClick={() => {
                setPosXInput(-100);
                onUpdateProperties && onUpdateProperties(clip.id, { x: -100 });
              }}
            >
              ← Kiri
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={resetPosition}
            >
              Tengah
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => {
                setPosXInput(100);
                onUpdateProperties && onUpdateProperties(clip.id, { x: 100 });
              }}
            >
              Kanan →
            </button>
          </div>
        </div>
      )}

      {/* CARD 6: SKALA / RESIZE CONTROL */}
      {clip.type !== "audio" && (
        <div className="properties-panel__card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="properties-panel__section-title">SKALA / RESIZE</span>
            <span className="badge-value">{scaleInput}x</span>
          </div>

          <div className="properties-panel__row">
            <label>Skala</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={scaleInput}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setScaleInput(val);
                onUpdateProperties && onUpdateProperties(clip.id, { scale: val });
              }}
            />
          </div>

          <div className="properties-panel__row">
            <label>Nilai</label>
            <input
              type="number"
              value={scaleInput}
              min="0.1"
              max="3"
              step="0.05"
              onChange={(e) => setScaleInput(e.target.value)}
              onBlur={(e) => commitScale(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitScale(e.target.value)}
              style={{ width: "65px" }}
            />
          </div>

          <div className="btn-preset-group">
            <button
              type="button"
              className="btn-preset"
              onClick={() => commitScale(0.5)}
            >
              0.5x
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => commitScale(0.75)}
            >
              0.75x
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={resetScale}
            >
              1x
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => commitScale(1.5)}
            >
              1.5x
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => commitScale(2)}
            >
              2x
            </button>
          </div>

          {scaleInput !== 1 && (
            <button
              type="button"
              className="btn-rotate btn-rotate--reset"
              style={{ width: "100%" }}
              onClick={resetScale}
            >
              ↺ Reset ke 1x
            </button>
          )}
        </div>
      )}

      {/* CARD 7: CROP MEDIA CONTROL */}
      {(!isTextClip && clip.type !== "audio") && (
        <div className="properties-panel__card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="properties-panel__section-title">CROP MEDIA</span>
            {(clip.cropY || clip.cropX || clip.cropH || clip.cropW) ? (
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                onClick={() => onUpdateProperties && onUpdateProperties(clip.id, { cropX: 0, cropY: 0, cropW: 0, cropH: 0 })}
              >
                ↺ Reset
              </button>
            ) : null}
          </div>

          <div className="btn-preset-group">
            <button
              type="button"
              className="btn-preset"
              onClick={() => onUpdateProperties && onUpdateProperties(clip.id, { cropY: 0, cropH: 0, cropW: 0, cropX: 0 })}
            >
              16:9 Full
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => onUpdateProperties && onUpdateProperties(clip.id, { cropY: 0, cropH: 0, cropW: 25, cropX: 25 })}
            >
              9:16 Shorts
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => onUpdateProperties && onUpdateProperties(clip.id, { cropY: 0, cropH: 0, cropW: 18, cropX: 18 })}
            >
              1:1 Square
            </button>
          </div>

          <div className="properties-panel__row">
            <label>Potong Atas</label>
            <span className="badge-value">{clip.cropY || 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            value={clip.cropY || 0}
            style={{ width: "100%" }}
            onChange={(e) => onUpdateProperties && onUpdateProperties(clip.id, { cropY: parseInt(e.target.value, 10) || 0 })}
          />

          <div className="properties-panel__row">
            <label>Potong Bawah</label>
            <span className="badge-value">{clip.cropH || 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            value={clip.cropH || 0}
            style={{ width: "100%" }}
            onChange={(e) => onUpdateProperties && onUpdateProperties(clip.id, { cropH: parseInt(e.target.value, 10) || 0 })}
          />

          <div className="properties-panel__row">
            <label>Potong Kiri</label>
            <span className="badge-value">{clip.cropW || 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            value={clip.cropW || 0}
            style={{ width: "100%" }}
            onChange={(e) => onUpdateProperties && onUpdateProperties(clip.id, { cropW: parseInt(e.target.value, 10) || 0 })}
          />

          <div className="properties-panel__row">
            <label>Potong Kanan</label>
            <span className="badge-value">{clip.cropX || 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            value={clip.cropX || 0}
            style={{ width: "100%" }}
            onChange={(e) => onUpdateProperties && onUpdateProperties(clip.id, { cropX: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      )}
    </aside>
  );
}