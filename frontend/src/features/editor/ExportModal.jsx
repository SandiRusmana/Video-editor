import React, { useState, useEffect } from "react";
import "./ExportModal.css";

export default function ExportModal({
  isOpen,
  onClose,
  projectName = "Konten YouTube",
  totalDuration = 20,
}) {
  // Steps: 'config' | 'exporting' | 'success' | 'failed'
  const [step, setStep] = useState("config");
  const [resolution, setResolution] = useState("1080p");
  const [format, setFormat] = useState("MP4");
  const [progress, setProgress] = useState(0);
  const [simulateError, setSimulateError] = useState(false);

  // Calculate estimated file size based on resolution and duration
  const getEstSize = (res, durationSec) => {
    const dur = durationSec > 0 ? durationSec : 20;
    const baseMbPerMin = res === "1080p" ? 150 : 80;
    const estMb = (dur / 60) * baseMbPerMin;
    return estMb < 10 ? estMb.toFixed(1) : Math.round(estMb);
  };

  const currentEstSize = getEstSize(resolution, totalDuration);

  const formatDuration = (sec) => {
    const s = Math.round(sec > 0 ? sec : 20);
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const remainderS = (s % 60).toString().padStart(2, "0");
    return `${m}:${remainderS}s`;
  };

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep("config");
      setProgress(0);
    }
  }, [isOpen]);

  // Handle Export process simulation
  useEffect(() => {
    let interval = null;
    if (step === "exporting") {
      setProgress(0);
      const startTime = Date.now();
      const exportDuration = 3500; // 3.5 seconds total simulation

      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(100, Math.floor((elapsed / exportDuration) * 100));
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (simulateError) {
              setStep("failed");
            } else {
              setStep("success");
            }
          }, 300);
        }
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, simulateError]);

  if (!isOpen) return null;

  const handleStartExport = () => {
    setStep("exporting");
  };

  const handleRetry = () => {
    setStep("exporting");
  };

  const handleDownload = () => {
    // Generate a dummy downloadable text/video blob in pure frontend
    const fileContent = `Demo Exported Video File\nProject: ${projectName}\nResolution: ${resolution}\nFormat: ${format}\nDuration: ${formatDuration(totalDuration)}`;
    const blob = new Blob([fileContent], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${resolution}.${format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-modal__backdrop" onClick={onClose}>
      <div
        className="export-modal__card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="export-modal__close-btn" onClick={onClose} title="Tutup">
          ✕
        </button>

        {/* STEP 1: CONFIGURATION */}
        {step === "config" && (
          <div className="export-modal__step">
            <div className="export-modal__header">
              <div className="export-modal__icon-box">📦</div>
              <h3 className="export-modal__title">Export Video</h3>
            </div>

            <div className="export-modal__body">
              <div className="export-modal__field">
                <label className="export-modal__label">Resolution:</label>
                <div className="export-modal__radio-group">
                  <label
                    className={`export-modal__radio-label ${
                      resolution === "720p" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value="720p"
                      checked={resolution === "720p"}
                      onChange={() => setResolution("720p")}
                    />
                    <span className="export-modal__radio-dot"></span>
                    720p
                  </label>
                  <label
                    className={`export-modal__radio-label ${
                      resolution === "1080p" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value="1080p"
                      checked={resolution === "1080p"}
                      onChange={() => setResolution("1080p")}
                    />
                    <span className="export-modal__radio-dot"></span>
                    1080p
                  </label>
                </div>
              </div>

              <div className="export-modal__field">
                <label className="export-modal__label">Format:</label>
                <div className="export-modal__select-wrapper">
                  <select
                    className="export-modal__select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="MP4">MP4</option>
                    <option value="WEBM">WEBM</option>
                    <option value="GIF">GIF</option>
                  </select>
                  <span className="export-modal__select-arrow">▼</span>
                </div>
              </div>

              <div className="export-modal__size-row">
                <span className="export-modal__label">Est. Size</span>
                <span className="export-modal__size-val">~{currentEstSize}mb</span>
              </div>

              {/* Dev/Testing mode option to simulate error */}
              <div className="export-modal__test-option">
                <label>
                  <input
                    type="checkbox"
                    checked={simulateError}
                    onChange={(e) => setSimulateError(e.target.checked)}
                  />
                  <span>Simulasi Error (Test UI Gagal)</span>
                </label>
              </div>
            </div>

            <div className="export-modal__actions">
              <button
                className="export-modal__btn export-modal__btn--cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="export-modal__btn export-modal__btn--start"
                onClick={handleStartExport}
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EXPORTING / PROGRESS */}
        {step === "exporting" && (
          <div className="export-modal__step">
            <div className="export-modal__header">
              <div className="export-modal__icon-box">⌛</div>
              <h3 className="export-modal__title">Exporting Video...</h3>
            </div>

            <div className="export-modal__body">
              <div className="export-modal__info-row">
                <span>Res: <strong>{resolution}</strong></span>
                <span>Format: <strong>{format}</strong></span>
              </div>
              <div className="export-modal__subtext">Rendering with FFmpeg</div>

              <div className="export-modal__progress-container">
                <div className="export-modal__progress-labels">
                  <span>Progres</span>
                  <span className="export-modal__progress-percent">{progress}%</span>
                </div>
                <div className="export-modal__progress-bar">
                  <div
                    className="export-modal__progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="export-modal__status export-modal__status--processing">
                <span className="export-modal__status-dot"></span>
                <span>Status: Processing...</span>
              </div>
            </div>

            <div className="export-modal__actions">
              <button
                className="export-modal__btn export-modal__btn--wait"
                disabled
              >
                ⌛ Please Wait...
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EXPORT COMPLETED (SUCCESS) */}
        {step === "success" && (
          <div className="export-modal__step">
            <div className="export-modal__header">
              <div className="export-modal__icon-badge export-modal__icon-badge--success">
                ✓
              </div>
              <h3 className="export-modal__title">Export Completed!</h3>
            </div>

            <div className="export-modal__body">
              <div className="export-modal__details-grid">
                <div className="export-modal__detail-item">
                  <span className="export-modal__detail-label">File</span>
                  <span className="export-modal__detail-val">
                    {projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.{format.toLowerCase()}
                  </span>
                </div>
                <div className="export-modal__detail-item">
                  <span className="export-modal__detail-label">Size</span>
                  <span className="export-modal__detail-val">{currentEstSize},4 MB</span>
                </div>
                <div className="export-modal__detail-item">
                  <span className="export-modal__detail-label">Duration</span>
                  <span className="export-modal__detail-val">{formatDuration(totalDuration)}</span>
                </div>
              </div>

              <div className="export-modal__status export-modal__status--ready">
                <span className="export-modal__status-dot"></span>
                <span>Status: Ready!</span>
              </div>
            </div>

            <div className="export-modal__actions">
              <button
                className="export-modal__btn export-modal__btn--download"
                onClick={handleDownload}
              >
                📥 Download {format}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: EXPORT FAILED (ERROR) */}
        {step === "failed" && (
          <div className="export-modal__step">
            <div className="export-modal__header">
              <div className="export-modal__icon-badge export-modal__icon-badge--failed">
                ✕
              </div>
              <h3 className="export-modal__title">Export Failed</h3>
            </div>

            <div className="export-modal__body">
              <label className="export-modal__label">Reason</label>
              <div className="export-modal__error-box">
                <p className="export-modal__error-title">FFmpeg Rendering Error</p>
                <p className="export-modal__error-desc">(Timeout/Corrupt File)</p>
              </div>

              <div className="export-modal__status export-modal__status--failed">
                <span className="export-modal__status-dot"></span>
                <span>Status: Failed</span>
              </div>
            </div>

            <div className="export-modal__actions export-modal__actions--split">
              <button
                className="export-modal__btn export-modal__btn--cancel"
                onClick={onClose}
              >
                Close
              </button>
              <button
                className="export-modal__btn export-modal__btn--retry"
                onClick={handleRetry}
              >
                ↻ Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
