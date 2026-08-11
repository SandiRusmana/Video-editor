import React, { useState, useEffect } from "react";
import "./ExportHistoryPage.css";
import {
  getExportHistory,
  calculateStats,
  downloadExportedFile,
  updateExportRecord,
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

export default function ExportHistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    setIsRefreshing(true);
    const items = getExportHistory();
    setHistoryItems(items);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = calculateStats(historyItems);

  const handleDownload = (item) => {
    downloadExportedFile(item);
  };

  const handleRetry = (item) => {
    // Retry simulation logic
    updateExportRecord(item.id, {
      status: "Rendering",
      progress: 0,
      errorMessage: null,
    });
    setHistoryItems(getExportHistory());

    let currProgress = 0;
    const interval = setInterval(() => {
      currProgress += 20;
      if (currProgress >= 100) {
        clearInterval(interval);
        updateExportRecord(item.id, {
          status: "Done",
          progress: 100,
          sizeMb: item.sizeMb > 0 ? item.sizeMb : 45,
          errorMessage: null,
        });
        setHistoryItems(getExportHistory());
      } else {
        updateExportRecord(item.id, {
          progress: currProgress,
        });
        setHistoryItems(getExportHistory());
      }
    }, 400);
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
          onClick={loadData}
          title="Refresh daftar export history"
        >
          <IconRefresh />
          <span>{isRefreshing ? "Refreshing..." : "Refresh List"}</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="export-history__table-card">
        {historyItems.length === 0 ? (
          <div className="export-history__empty">
            <div className="export-history__empty-icon">📁</div>
            <div className="export-history__empty-title">Belum Ada Riwayat Export</div>
            <div className="export-history__empty-desc">
              Video yang Anda export di editor akan muncul di halaman ini.
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
                const isRendering = item.status === "Rendering" || item.progress < 100;
                const isFailed = item.status === "Failed";

                return (
                  <tr key={item.id}>
                    {/* 1. Project Name */}
                    <td>
                      <span className="export-history__proj-name">{item.projectName}</span>
                    </td>

                    {/* 2. File & Format */}
                    <td>
                      <div className="export-history__file-cell">
                        <span className="export-history__file-name">{item.fileName}</span>
                        <span className="export-history__file-format">
                          {item.resolution}/{item.format}
                        </span>
                      </div>
                    </td>

                    {/* 3. Size */}
                    <td>
                      <span className="export-history__size-val">{item.sizeDisplay}</span>
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
                            <span>Done</span>
                          </div>
                        )}

                        {isRendering && (
                          <>
                            <div className="export-history__status-row export-history__status--rendering">
                              <span className="export-history__dot"></span>
                              <span>{item.progress || 65}%</span>
                            </div>
                            <span className="export-history__status-sub">Rendering</span>
                          </>
                        )}

                        {isFailed && (
                          <>
                            <div className="export-history__status-row export-history__status--failed">
                              <span className="export-history__dot"></span>
                              <span>Failed</span>
                            </div>
                            <span className="export-history__status-sub">
                              {item.errorMessage || "FFmpeg error"}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 6. Action */}
                    <td style={{ textAlign: "center" }}>
                      {isDone && (
                        <button
                          className="export-history__action-btn export-history__action-btn--download"
                          onClick={() => handleDownload(item)}
                          title="Download Video"
                        >
                          <IconDownload />
                        </button>
                      )}

                      {isRendering && (
                        <button
                          className="export-history__action-btn export-history__action-btn--rendering"
                          disabled
                          title="Proses rendering sedang berlangsung..."
                        >
                          <IconHourglass />
                        </button>
                      )}

                      {isFailed && (
                        <button
                          className="export-history__action-btn export-history__action-btn--retry"
                          onClick={() => handleRetry(item)}
                          title="Coba Lagi Rendering"
                        >
                          <IconRefresh />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Hint Banner */}
      <div className="export-history__hint-banner">
        <span className="export-history__hint-icon">💡</span>
        <span>
          Klik <span className="export-history__hint-highlight">Download</span> untuk mengunduh tanpa rendering ulang
        </span>
      </div>
    </main>
  );
}
