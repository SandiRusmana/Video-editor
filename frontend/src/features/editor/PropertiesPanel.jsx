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

const FONTS = [
  "Poppins",
  "Inter",
  "Roboto",
  "Montserrat",
  "Open Sans",
  "Lato",
  "Outfit",
];

const POSITIONS = [
  "Top Left",
  "Top Center",
  "Top Right",
  "Center Left",
  "Center",
  "Center Right",
  "Bottom Left",
  "Bottom Center",
  "Bottom Right",
];

export default function PropertiesPanel({ clip, selectedTransition, onCloseTransition, onUpdateTrim, onUpdateProperties, onDeleteClip }) {
  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  const [textInput, setTextInput] = useState("");
  const [fontColorInput, setFontColorInput] = useState("#ffffff");
  const [fontSizeInput, setFontSizeInput] = useState(36);
  const [fontFamilyInput, setFontFamilyInput] = useState("Poppins");
  const [textPositionInput, setTextPositionInput] = useState("Bottom Center");

  const [posXInput, setPosXInput] = useState(0);
  const [posYInput, setPosYInput] = useState(0);

  const [scaleInput, setScaleInput] = useState(1);
  const [opacityInput, setOpacityInput] = useState(1);
  const [rotationInput, setRotationInput] = useState(0);
  const [imagePositionInput, setImagePositionInput] = useState("Top Right");

  const [volumeInput, setVolumeInput] = useState(1);
  const [mutedInput, setMutedInput] = useState(false);


  useEffect(() => {
    if (clip) {
      setStartInput(toMMSS(clip.trimStart));
      setEndInput(toMMSS(clip.trimEnd));
      
      if (clip.type === "text" || clip.trackType === "TEXT" || !!clip.textContent) {
        setTextInput(clip.textContent || clip.name || "");
        setFontColorInput(clip.fontColor || "#ffffff");
        setFontSizeInput(clip.fontSize || 36);
        setFontFamilyInput(clip.fontFamily || "Poppins");
        setTextPositionInput(clip.textPosition || "Bottom Center");
      }
      
      setPosXInput(clip.x ?? 0);
      setPosYInput(clip.y ?? 0);
      setScaleInput(clip.scale ?? 1);
      setOpacityInput(clip.opacity ?? 1);
      setRotationInput(clip.rotation ?? 0);
      setImagePositionInput(clip.textPosition || "Top Right"); // Reusing textPosition field for simplicity
      
      setVolumeInput(clip.volume ?? 1);
      setMutedInput(clip.muted ?? false);
    }
  }, [clip]);

  if (selectedTransition) {
    return (
      <aside className="properties-panel">
        <h3 className="properties-panel__main-title" style={{ color: '#a5b4fc' }}>⚡ TRANSITION SETTINGS</h3>
        
        <div className="properties-panel__card">
          <div className="properties-panel__form-group">
            <label>Type</label>
            <select className="properties-panel__select-full" defaultValue={selectedTransition.type}>
              <option value="Fade">Fade</option>
              <option value="Dissolve">Dissolve</option>
              <option value="Wipe">Wipe</option>
            </select>
          </div>

          <div className="properties-panel__form-group">
            <label>Duration</label>
            <div className="input-with-suffix">
              <input type="number" step="0.1" defaultValue={selectedTransition.duration} />
              <span>s</span>
            </div>
          </div>

          <div className="properties-panel__form-group">
            <label>Target</label>
            <div className="media-name-badge">
              <span className="media-text">Track {selectedTransition.trackId} Clips</span>
            </div>
          </div>

          <button 
            type="button"
            className="btn-preset"
            style={{ 
              background: '#818cf8', color: '#fff', border: 'none', 
              padding: '10px', marginTop: '8px', fontSize: '13px', 
              fontWeight: '600', display: 'flex', justifyContent: 'center', gap: '8px' 
            }}
            onClick={onCloseTransition}
          >
             ↻ Apply Changes
          </button>

          <button 
            type="button"
            className="btn-remove-overlay"
            onClick={onCloseTransition}
            style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            🗑️ Delete Transition
          </button>
        </div>
      </aside>
    );
  }

  if (!clip) {
    return (
      <aside className="properties-panel">
        <h3>⚙️ PROPERTIES</h3>
        <p className="properties-panel__empty">Pilih klip di timeline untuk melihat & mengatur propertinya</p>
      </aside>
    );
  }

  const isTextClip = clip.type === "text" || clip.trackType === "TEXT" || !!clip.textContent;
  const isImageClip = clip.type === "image";
  const isAudioClip = clip.type === "audio" || clip.trackType === "AUDIO";

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
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 36;
    setFontSizeInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { fontSize: val });
    }
  };

  const commitFontFamily = (e) => {
    const val = e.target.value;
    setFontFamilyInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { fontFamily: val });
    }
  };

  const commitTextPosition = (e) => {
    const val = e.target.value;
    setTextPositionInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { textPosition: val });
    }
  };
  
  const commitImagePosition = (e) => {
    const val = e.target.value;
    setImagePositionInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { textPosition: val });
    }
  }

  const commitScale = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 100;
    const decimalScale = val / 100;
    setScaleInput(decimalScale);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { scale: decimalScale });
    }
  };

  const commitOpacity = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 100;
    const decimalOpacity = val / 100;
    setOpacityInput(decimalOpacity);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { opacity: decimalOpacity });
    }
  };

  const commitRotation = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    setRotationInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { rotation: val });
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

  const commitVolume = (val) => {
    let num = parseFloat(val);
    if (isNaN(num)) num = 1;
    num = Math.max(0, Math.min(1, num));
    setVolumeInput(num);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { volume: num });
    }
  };

  const commitMuted = (val) => {
    setMutedInput(val);
    if (onUpdateProperties) {
      onUpdateProperties(clip.id, { muted: val });
    }
  };

  // --- RENDERING MODES ---

  if (isTextClip) {
    return (
      <aside className="properties-panel">
        <h3 className="properties-panel__main-title"><span className="icon-t">T</span> TEXT PROPERTIES</h3>
        
        <div className="properties-panel__card">
          <div className="properties-panel__form-group">
            <label>Content</label>
            <input
              type="text"
              className="properties-panel__input-full"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === "Enter" && commitText()}
              placeholder="Enter text..."
            />
          </div>

          <div className="properties-panel__form-group">
            <label>Font</label>
            <select
              className="properties-panel__select-full"
              value={fontFamilyInput}
              onChange={commitFontFamily}
            >
              {FONTS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="properties-panel__row-split">
            <div className="properties-panel__form-group">
              <label>Size</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={fontSizeInput}
                  onChange={(e) => setFontSizeInput(e.target.value)}
                  onBlur={commitFontSize}
                  onKeyDown={(e) => e.key === "Enter" && commitFontSize(e)}
                />
                <span>px</span>
              </div>
            </div>
            <div className="properties-panel__form-group">
              <label>Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  className="color-swatch"
                  value={fontColorInput}
                  onChange={commitColor}
                />
                <span className="color-hex">{fontColorInput.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="properties-panel__form-group">
            <label>Position</label>
            <select
              className="properties-panel__select-full"
              value={textPositionInput}
              onChange={commitTextPosition}
            >
              {POSITIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>
    );
  }

  if (isImageClip) {
    return (
      <aside className="properties-panel">
        <h3 className="properties-panel__main-title">🖼️ IMAGE PROPERTIES</h3>
        
        <div className="properties-panel__card">
          <div className="properties-panel__form-group">
            <label>Media</label>
            <div className="media-name-badge">
              <span className="media-icon">🖼️</span>
              <span className="media-text" title={clip.name}>{clip.name}</span>
            </div>
          </div>

          <div className="properties-panel__row-split">
            <div className="properties-panel__form-group">
              <label>Scale</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={Math.round(scaleInput * 100)}
                  onChange={(e) => setScaleInput(e.target.value / 100)}
                  onBlur={commitScale}
                  onKeyDown={(e) => e.key === "Enter" && commitScale(e)}
                />
                <span>%</span>
              </div>
            </div>
            <div className="properties-panel__form-group">
              <label>Opacity</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={Math.round(opacityInput * 100)}
                  onChange={(e) => setOpacityInput(e.target.value / 100)}
                  onBlur={commitOpacity}
                  onKeyDown={(e) => e.key === "Enter" && commitOpacity(e)}
                  min="0"
                  max="100"
                />
                <span>%</span>
              </div>
            </div>
          </div>

          <div className="properties-panel__row-split">
            <div className="properties-panel__form-group">
              <label>Position</label>
              <select
                className="properties-panel__select-full"
                value={imagePositionInput}
                onChange={commitImagePosition}
              >
                {POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="properties-panel__form-group">
              <label>Rotation</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={rotationInput}
                  onChange={(e) => setRotationInput(e.target.value)}
                  onBlur={commitRotation}
                  onKeyDown={(e) => e.key === "Enter" && commitRotation(e)}
                />
                <span>°</span>
              </div>
            </div>
          </div>

          <button 
            className="btn-remove-overlay"
            onClick={() => onDeleteClip && onDeleteClip(clip.id)}
          >
            🗑️ Remove Overlay
          </button>
        </div>
      </aside>
    );
  }

  if (isAudioClip) {
    return (
      <aside className="properties-panel">
        <h3 className="properties-panel__main-title"><span className="icon-audio">🎵</span> AUDIO CONTROLS</h3>
        
        <div className="properties-panel__card">
          <div className="properties-panel__form-group">
            <label>Clip</label>
            <div className="media-name-badge">
              <span className="media-icon">🎵</span>
              <span className="media-text" title={clip.name}>{clip.name}</span>
            </div>
          </div>

          <div className="properties-panel__form-group">
            <label>Volume</label>
            <div className="input-with-suffix" style={{ marginBottom: '8px' }}>
              <input
                type="number"
                value={Math.round(volumeInput * 100)}
                onChange={(e) => commitVolume(e.target.value / 100)}
                min="0"
                max="100"
              />
              <span>%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumeInput}
              onChange={(e) => commitVolume(e.target.value)}
              className="properties-panel__slider"
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div className="properties-panel__form-group">
            <label>Mute</label>
            <button
              className={`btn-mute-toggle ${mutedInput ? 'muted' : ''}`}
              onClick={() => commitMuted(!mutedInput)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', 
                width: '100%', padding: '10px', borderRadius: '4px',
                background: '#1a1f35', border: '1px solid #2a2f4c',
                color: mutedInput ? '#ef4444' : '#10b981', cursor: 'pointer',
                fontWeight: '600', transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '16px' }}>{mutedInput ? '🔇' : '🔊'}</span>
              {mutedInput ? 'Muted' : 'Unmuted'}
            </button>
          </div>

          <div className="properties-panel__form-group">
            <label>Trim</label>
            <div className="trim-display-box" style={{
                background: '#1a1f35', border: '1px solid #2a2f4c',
                padding: '10px', borderRadius: '4px', color: '#e2e8f0',
                fontSize: '14px', fontWeight: '500'
            }}>
              {Math.floor(clip.trimStart)}s-{Math.floor(clip.trimEnd)}s
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // DEFAULT (Video / Audio)
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

      {/* CARD 3: TIMING / TRIM */}
      <div className="properties-panel__card">
        <span className="properties-panel__section-title">TIMING / TRIM</span>
        <div className="properties-panel__row">
          <label>Waktu Mulai</label>
          <input
            type="text"
            className="time-input"
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
            className="time-input"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={commitEnd}
            onKeyDown={(e) => e.key === "Enter" && commitEnd()}
          />
        </div>
      </div>

      {/* CARD 5: POSITION / COORDINATES */}
      {clip.type !== "audio" && (
        <div className="properties-panel__card">
          <span className="properties-panel__section-title">⊕ POSITION / COORDINATES</span>

          <div className="position-field">
            <label className="position-field__label">x Position</label>
            <input
              type="number"
              className="position-field__input"
              value={posXInput}
              onChange={(e) => setPosXInput(e.target.value)}
              onBlur={commitPosX}
              onKeyDown={(e) => e.key === "Enter" && commitPosX()}
            />
          </div>

          <div className="position-field">
            <label className="position-field__label">Y Position</label>
            <input
              type="number"
              className="position-field__input"
              value={posYInput}
              onChange={(e) => setPosYInput(e.target.value)}
              onBlur={commitPosY}
              onKeyDown={(e) => e.key === "Enter" && commitPosY()}
            />
          </div>

          <label className="position-field__label" style={{ marginTop: "4px" }}>Align</label>
          <div className="align-grid">
            <button type="button" className="align-grid__btn" title="Kiri Atas" onClick={() => { setPosXInput(-200); setPosYInput(-200); onUpdateProperties && onUpdateProperties(clip.id, { x: -200, y: -200 }); }}>↖</button>
            <button type="button" className="align-grid__btn" title="Atas Tengah" onClick={() => { setPosXInput(0); setPosYInput(-200); onUpdateProperties && onUpdateProperties(clip.id, { x: 0, y: -200 }); }}>↑</button>
            <button type="button" className="align-grid__btn" title="Kanan Atas" onClick={() => { setPosXInput(200); setPosYInput(-200); onUpdateProperties && onUpdateProperties(clip.id, { x: 200, y: -200 }); }}>↗</button>

            <button type="button" className="align-grid__btn" title="Kiri Tengah" onClick={() => { setPosXInput(-200); setPosYInput(0); onUpdateProperties && onUpdateProperties(clip.id, { x: -200, y: 0 }); }}>←</button>
            <button type="button" className="align-grid__btn align-grid__btn--center" title="Tengah" onClick={resetPosition}>⊙</button>
            <button type="button" className="align-grid__btn" title="Kanan Tengah" onClick={() => { setPosXInput(200); setPosYInput(0); onUpdateProperties && onUpdateProperties(clip.id, { x: 200, y: 0 }); }}>→</button>

            <button type="button" className="align-grid__btn" title="Kiri Bawah" onClick={() => { setPosXInput(-200); setPosYInput(200); onUpdateProperties && onUpdateProperties(clip.id, { x: -200, y: 200 }); }}>↙</button>
            <button type="button" className="align-grid__btn" title="Bawah Tengah" onClick={() => { setPosXInput(0); setPosYInput(200); onUpdateProperties && onUpdateProperties(clip.id, { x: 0, y: 200 }); }}>↓</button>
            <button type="button" className="align-grid__btn" title="Kanan Bawah" onClick={() => { setPosXInput(200); setPosYInput(200); onUpdateProperties && onUpdateProperties(clip.id, { x: 200, y: 200 }); }}>↘</button>
          </div>

          <button
            type="button"
            className="btn-reset-center"
            onClick={resetPosition}
          >
            ⊙ Reset to Center
          </button>
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
        </div>
      )}

      {/* CARD 7: CROP MEDIA CONTROL */}
      {clip.type !== "audio" && (
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
        </div>
      )}
    </aside>
  );
}