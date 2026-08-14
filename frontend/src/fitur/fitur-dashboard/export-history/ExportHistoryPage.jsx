import React, { useState, useEffect } from "react";
import "./ExportHistoryPage.css";
import {
  fetchUserExportHistory,
  calculateStats,
  downloadExportedFile,
} from "../../../services/exportHistoryService";

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconHourglass() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function ExportHistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const items = await fetchUserExportHistory();
      setHistoryItems(items || []);
    } catch (err) {
      console.error("Gagal memuat data export history:", err);
    } finally {
      setIsLoading(false);
      if (showRefresh) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  useEffect(() => {
    loadData();

    // Auto-poll status every 3 seconds if there are active rendering jobs
    const pollInterval = setInterval(async () => {
      const items = await fetchUserExportHistory();
      if (items) setHistoryItems(items);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const stats = calculateStats(historyItems);

  const handleDownload = (item, e) => {
    if (e) e.stopPropagation();
    downloadExportedFile(item);
  };

  const openDetailModal = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedDetailItem(item);
  };

  const closeDetailModal = () => {
    setSelectedDetailItem(null);
  };

  const renderDate = (dateTimeStr) => {
    if (!dateTimeStr) return { main: "-", sub: "" };
    const parts = dateTimeStr.split(" ");
    if (parts.length >= 4) {
      const datePart = `${parts[0]} ${parts[1]} ${parts[2]}`;
      const timePart = parts.slice(3).join(" ");
      return { main: datePart, sub: timePart };
    }
    return { main: dateTimeStr, sub: "" };
  };

  return (
    <main className="export-history-page">
      {/* Header */}
      <div className="export-history__header">
        <div className="export-history__title-group">
          <h1 className="export-history__title">EXPORT HISTORY & DOWNLOADS</h1>
          <div className="export-history__meta">
            <span>Total Export: </span>
            <span className="export-history__meta-val">{stats.totalFiles} Files</span>
            <span className="export-history__meta-sep">·</span>
            <span>Storage Used: </span>
            <span className="export-history__meta-val">{stats.storageDisplay}</span>
          </div>
        </div>

        <button
          className="export-history__btn-refresh"
          onClick={() => loadData(true)}
          title="Refresh daftar export history"
        >
          <IconRefresh />
          <span>{isRefreshing ? "Refreshing..." : "Refresh List"}</span>
        </button>
      </div>

      {/* Table Card / Content */}
      <div className="export-history__table-card">
        {isLoading ? (
          <div className="export-history__loading">
            <div className="export-history__spinner"></div>
            <p>Memuat riwayat export dari database...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="export-history__empty">
            <div className="export-history__empty-icon">📁</div>
            <div className="export-history__empty-title">Belum Ada Riwayat Export</div>
            <div className="export-history__empty-desc">
              Video yang Anda ekspor di editor akan otomatis tersimpan di halaman ini.
            </div>
          </div>
        ) : (
          <table className="export-history__table">
            <thead>
              <tr>
                <th>PROJECT NAME</th>
                <th>FILE & FORMAT</th>
                <th>SIZE</th>
                <th>DATE & TIME</th>
                <th>STATUS</th>
                <th style={{ textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item) => {
                const dateObj = renderDate(item.dateTime);
                const isDone = item.status === "Done";
                const isRendering = item.status === "Rendering" || (item.progress > 0 && item.progress < 100);
                const isFailed = item.status === "Failed";

                return (
                  <tr key={item.id} onClick={(e) => openDetailModal(item, e)} className="export-history__tr-clickable">
                    {/* 1. Project Name */}
                    <td>
                      <span className="export-history__proj-name">{item.projectName}</span>
                    </td>

                    {/* 2. File & Format */}
                    <td>
                      <div className="export-history__file-cell">
                        <span className="export-history__file-name">{item.fileName}</span>
                        <span className="export-history__file-format">
                          {item.resolution || "1080p"}/{item.format || "MP4"}
                        </span>
                      </div>
                    </td>

                    {/* 3. Size */}
                    <td>
                      <span className="export-history__size-val">{item.sizeDisplay || "- MB"}</span>
                    </td>

                    {/* 4. Date & Time */}
                    <td>
                      <div className="export-history__date-cell">
                        <span className="export-history__date-main">{dateObj.main}</span>
                        {dateObj.sub && (
                          <span className="export-history__date-time">{dateObj.sub}</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Status */}
                    <td>
                      <div className="export-history__status-cell">
                        {isDone && (
                          <div className="export-history__status-row export-history__status--done">
                            <span className="export-history__dot"></span>
                            <span>Completed</span>
                          </div>
                        )}

                        {isRendering && (
                          <>
                            <div className="export-history__status-row export-history__status--rendering">
                              <span className="export-history__dot"></span>
                              <span>{item.progress || 10}%</span>
                            </div>
                            <span className="export-history__status-sub">Processing</span>
                          </>
                        )}

                        {isFailed && (
                          <>
                            <div className="export-history__status-row export-history__status--failed">
                              <span className="export-history__dot"></span>
                              <span>Failed</span>
                            </div>
                            <span className="export-history__status-sub" title={item.errorMessage}>
                              {item.errorMessage || "FFmpeg Error"}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 6. Action */}
                    <td style={{ textAlign: "center" }}>
                      <div className="export-history__action-group">
                        {isDone && (
                          <button
                            className="export-history__action-btn export-history__action-btn--download"
                            onClick={(e) => handleDownload(item, e)}
                            title="Unduh Kembali Video"
                          >
                            <IconDownload />
                            <span>Download</span>
                          </button>
                        )}

                        {isRendering && (
                          <button
                            className="export-history__action-btn export-history__action-btn--rendering"
                            disabled
                            title="Proses rendering sedang berlangsung..."
                          >
                            <IconHourglass />
                            <span>Rendering</span>
                          </button>
                        )}

                        {isFailed && (
                          <button
                            className="export-history__action-btn export-history__action-btn--failed"
                            onClick={(e) => openDetailModal(item, e)}
                            title="Lihat Alasan Kegagalan"
                          >
                            <IconInfo />
                            <span>Detail</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDetailItem && (
        <div className="export-history__modal-backdrop" onClick={closeDetailModal}>
          <div className="export-history__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="export-history__modal-header">
              <h3>DETAIL HASIL EXPORT</h3>
              <button className="export-history__modal-close" onClick={closeDetailModal}>
                <IconClose />
              </button>
            </div>

            <div className="export-history__modal-body">
              <div className="export-history__detail-grid">
                <div className="export-history__detail-item">
                  <label>Nama Project</label>
                  <span>{selectedDetailItem.projectName}</span>
                </div>
                <div className="export-history__detail-item">
                  <label>Nama File</label>
                  <span>{selectedDetailItem.fileName}</span>
                </div>
                <div className="export-history__detail-item">
                  <label>Resolusi & Format</label>
                  <span>{selectedDetailItem.resolution} / {selectedDetailItem.format}</span>
                </div>
                <div className="export-history__detail-item">
                  <label>Ukuran File</label>
                  <span>{selectedDetailItem.sizeDisplay}</span>
                </div>
                <div className="export-history__detail-item">
                  <label>Status Export</label>
                  <span className={`export-history__badge export-history__badge--${selectedDetailItem.status.toLowerCase()}`}>
                    {selectedDetailItem.status === "Done" ? "✔ Completed" : selectedDetailItem.status === "Failed" ? "❌ Failed" : "⏳ Processing"}
                  </span>
                </div>
                <div className="export-history__detail-item">
                  <label>Tanggal & Waktu</label>
                  <span>{selectedDetailItem.dateTime}</span>
                </div>
              </div>

              {selectedDetailItem.errorMessage && (
                <div className="export-history__detail-error">
                  <label>Penyebab Kegagalan (Reason)</label>
                  <p>{selectedDetailItem.errorMessage}</p>
                </div>
              )}
            </div>

            <div className="export-history__modal-footer">
              {selectedDetailItem.status === "Done" && (
                <button
                  className="export-history__btn-modal-download"
                  onClick={() => handleDownload(selectedDetailItem)}
                >
                  <IconDownload />
                  <span>Download Video</span>
                </button>
              )}
              <button className="export-history__btn-modal-close" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="export-history__hint-banner">
        <span className="export-history__hint-icon">💡</span>
        <span>
          Klik <span className="export-history__hint-highlight">Download</span> untuk mengunduh ulang video tanpa harus melakukan proses rendering ulang.
        </span>
      </div>
    </main>
  );
}
