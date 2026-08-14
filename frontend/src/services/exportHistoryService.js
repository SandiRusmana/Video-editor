import { API_BASE } from "../config/api.js";

// Service module to manage Export History via Backend API with LocalStorage fallback
const STORAGE_KEY = "export_history_v1";

export function formatIndonesianDateTime(date = new Date()) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}.${mins} WIB`;
}

export async function fetchUserExportHistory() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/export-history`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((job) => {
          const isDone = job.status === "DONE";
          const isFailed = job.status === "FAILED";
          const formattedDate = job.createdAt
            ? formatIndonesianDateTime(job.createdAt)
            : "-";

          return {
            id: job.id,
            projectId: job.projectId,
            projectName: job.projectName || "Project Video",
            fileName: job.fileName || `${job.projectName || "video"}.mp4`,
            resolution: job.resolution || "1080p",
            format: job.format || "MP4",
            fileSize: job.fileSize || 0,
            sizeDisplay: job.sizeDisplay || (job.fileSize > 0 ? `${(job.fileSize / (1024 * 1024)).toFixed(1)} MB` : "- MB"),
            dateTime: formattedDate,
            createdAt: job.createdAt,
            timestamp: new Date(job.createdAt || Date.now()).getTime(),
            status: isDone ? "Done" : isFailed ? "Failed" : "Rendering",
            progress: job.progress || (isDone ? 100 : 10),
            errorMessage: job.errorMsg || (isFailed ? "FFmpeg rendering error" : null),
            downloadUrl: job.downloadUrl,
          };
        });
      }
    }
  } catch (err) {
    console.error("Gagal mengambil data export history dari backend:", err);
  }

  // Fallback to localStorage if API fails or offline
  return getExportHistory();
}

export function getExportHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Gagal membaca export history dari localStorage:", err);
    return [];
  }
}

export function saveExportHistory(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Gagal menyimpan export history ke localStorage:", err);
  }
}

export function addExportRecord(record) {
  const current = getExportHistory();
  const formattedDate = formatIndonesianDateTime(new Date());
  
  const newRecord = {
    id: record.id || `exp-${Date.now()}`,
    projectId: record.projectId || "proj-unknown",
    projectName: record.projectName || "Project Tanpa Nama",
    fileName: record.fileName || `${(record.projectName || "video").toLowerCase().replace(/[^a-z0-9]/gi, "-")}.${(record.format || "mp4").toLowerCase()}`,
    resolution: record.resolution || "1080p",
    format: record.format || "MP4",
    sizeMb: record.sizeMb || 0,
    sizeDisplay: record.sizeDisplay || (record.sizeMb ? `${record.sizeMb} MB` : "- MB"),
    dateTime: record.dateTime || formattedDate,
    timestamp: Date.now(),
    status: record.status || "Rendering",
    progress: record.progress ?? 0,
    errorMessage: record.errorMessage || null,
    editingData: record.editingData || {},
  };

  const updated = [newRecord, ...current];
  saveExportHistory(updated);
  return newRecord;
}

export function updateExportRecord(id, updates) {
  const current = getExportHistory();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        ...(updates.sizeMb !== undefined ? { sizeDisplay: updates.sizeMb > 0 ? `${updates.sizeMb} MB` : "- MB" } : {}),
      };
    }
    return item;
  });
  saveExportHistory(updated);
  return updated;
}

export function deleteExportRecord(id) {
  const current = getExportHistory();
  const updated = current.filter((item) => item.id !== id);
  saveExportHistory(updated);
  return updated;
}

export function downloadExportedFile(record) {
  if (!record) return;
  if (record.id) {
    const downloadApiUrl = `http://localhost:3000/export/download/${record.id}`;
    const link = document.createElement("a");
    link.href = downloadApiUrl;
    link.setAttribute("download", record.fileName || `${record.projectName || "video"}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function calculateStats(records = []) {
  const totalFiles = records.length;
  const totalStorageMb = records.reduce((acc, curr) => {
    if (curr.status === "Done" && curr.fileSize) {
      return acc + (curr.fileSize / (1024 * 1024));
    }
    return acc;
  }, 0);

  return {
    totalFiles,
    totalStorageMb: Math.round(totalStorageMb),
    storageDisplay: `${Math.round(totalStorageMb)} MB`,
  };
}
