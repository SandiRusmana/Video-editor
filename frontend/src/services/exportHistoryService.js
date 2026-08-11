// Service module to manage Export History in LocalStorage
const STORAGE_KEY = "export_history_v1";

const INITIAL_MOCK_DATA = [
  {
    id: "exp-101",
    projectId: "proj-1",
    projectName: "My Gameplay",
    fileName: "gameplay.mp4",
    resolution: "1080p",
    format: "MP4",
    sizeMb: 54,
    sizeDisplay: "54 MB",
    dateTime: "27 Jul 2026 14.30 WIB",
    timestamp: new Date("2026-07-27T14:30:00").getTime(),
    status: "Done", // "Done" | "Rendering" | "Failed"
    progress: 100,
    errorMessage: null,
    editingData: {
      timeline: { tracksCount: 3, clipsCount: 5 },
    },
  },
  {
    id: "exp-102",
    projectId: "proj-2",
    projectName: "Youtube Promo",
    fileName: "trailer.mp4",
    resolution: "1080p",
    format: "MP4",
    sizeMb: 68,
    sizeDisplay: "68 MB",
    dateTime: "27 Jul 2026 15.30 WIB",
    timestamp: new Date("2026-07-27T15:30:00").getTime(),
    status: "Rendering",
    progress: 65,
    errorMessage: null,
    editingData: {
      timeline: { tracksCount: 2, clipsCount: 3 },
    },
  },
  {
    id: "exp-103",
    projectId: "proj-3",
    projectName: "Intro Chanel",
    fileName: "intro.mp4",
    resolution: "720p",
    format: "MP4",
    sizeMb: 0,
    sizeDisplay: "- MB",
    dateTime: "26 Jul 2026 09.30 WIB",
    timestamp: new Date("2026-07-26T09:30:00").getTime(),
    status: "Failed",
    progress: 0,
    errorMessage: "FFmpeg error",
    editingData: {
      timeline: { tracksCount: 1, clipsCount: 2 },
    },
  },
];

export function getExportHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
      return INITIAL_MOCK_DATA;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_MOCK_DATA;
  } catch (err) {
    console.error("Gagal membaca export history dari localStorage:", err);
    return INITIAL_MOCK_DATA;
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
  
  const fileName = record.fileName || "exported_video.mp4";
  const content = `NERVE Video Editor - Exported Video Demo
Project: ${record.projectName}
File: ${fileName}
Resolution: ${record.resolution}
Format: ${record.format}
Export Date: ${record.dateTime}
Status: ${record.status}
Editing Payload Snapshot: ${JSON.stringify(record.editingData || {}, null, 2)}`;

  const blob = new Blob([content], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatIndonesianDateTime(date = new Date()) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}.${mins} WIB`;
}

export function calculateStats(records = []) {
  const totalFiles = records.length;
  const totalStorageMb = records.reduce((acc, curr) => {
    if (curr.status === "Done" && curr.sizeMb) {
      return acc + Number(curr.sizeMb);
    }
    return acc;
  }, 0);

  return {
    totalFiles,
    totalStorageMb,
    storageDisplay: `${totalStorageMb} MB`,
  };
}
