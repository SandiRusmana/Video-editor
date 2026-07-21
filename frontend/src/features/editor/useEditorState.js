import { useState, useCallback, useMemo, useEffect, useRef } from "react";

export const PIXELS_PER_SECOND = 20;
const MIN_CLIP_DURATION = 1; // detik, durasi minimum saat di-trim
const API_BASE = "http://localhost:3000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Request gagal (${res.status})`);
  }
  return data;
}

// Fetch khusus untuk upload file (FormData) — TIDAK boleh set header
// Content-Type: application/json seperti apiFetch di atas, karena itu
// akan merusak multipart/form-data. Biarkan browser yang set
// Content-Type + boundary-nya secara otomatis.
async function apiUploadFetch(path, formData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Upload gagal (${res.status})`);
  }
  return data;
}

export default function useEditorState(projectId) {
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [clips, setClips] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ---- Ambil Media Library dari backend ----
  const loadMedia = useCallback(async () => {
    if (!projectId) return;
    setMediaLoading(true);
    setMediaError("");
    try {
      const data = await apiFetch(`/media?projectId=${projectId}`);
      setMediaLibrary(
        data.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type.toLowerCase(),
          sourceDuration: m.duration ?? 5,
          thumbnail: m.thumbnail ? `${API_BASE}${m.thumbnail}` : null,
          url: `${API_BASE}${m.path}`,
        })),
      );
    } catch (err) {
      setMediaError(err.message || "Gagal memuat Media Library");
    } finally {
      setMediaLoading(false);
    }
  }, [projectId]);

  // ---- Upload file media baru ke backend ----
  // Endpoint: POST /media/upload (bukan POST /media — itu route GET)
  const uploadMedia = useCallback(
    async (file) => {
      if (!projectId || !file) return;
      setIsUploading(true);
      setMediaError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        // projectId dikirim lewat query string, BUKAN body FormData —
        // karena backend baca pakai @Query('projectId')
        const created = await apiUploadFetch(
          `/media/upload?projectId=${encodeURIComponent(projectId)}`,
          formData,
        );

        setMediaLibrary((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            type: created.type.toLowerCase(),
            sourceDuration: created.duration ?? 5,
            thumbnail: created.thumbnail ? `${API_BASE}${created.thumbnail}` : null,
            url: `${API_BASE}${created.path}`,
          },
        ]);
      } catch (err) {
        alert(err.message || "Gagal mengunggah media");
      } finally {
        setIsUploading(false);
      }
    },
    [projectId],
  );

  // ---- Hapus media dari library ----
  const deleteMedia = useCallback(async (mediaId) => {
    if (!mediaId) return;
    try {
      await apiFetch(`/media/${mediaId}`, { method: "DELETE" });
      setMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      alert(err.message || "Gagal menghapus media");
    }
  }, []);

  // ---- Ambil Timeline (semua track + clip) dari backend ----
  const loadTimeline = useCallback(async () => {
    if (!projectId) return;
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const tracks = await apiFetch(`/projects/${projectId}/timeline`);
      const flatClips = tracks
        .flatMap((track) => track.clips.map((clip) => ({ ...clip, trackType: track.type })))
        .sort((a, b) => a.timelineStart - b.timelineStart)
        .map((clip) => ({
          id: clip.id,
          mediaId: clip.mediaId,
          name: clip.media?.name ?? "(media tidak ditemukan)",
          type: (clip.media?.type ?? "video").toLowerCase(),
          sourceDuration: clip.media?.duration ?? clip.outPoint,
          trimStart: clip.inPoint,
          trimEnd: clip.outPoint,
          timelineStart: clip.timelineStart,
          trackType: clip.trackType,
          url: clip.media?.path ? `${API_BASE}${clip.media.path}` : null,
        }));
      setClips(flatClips);
    } catch (err) {
      setTimelineError(err.message || "Gagal memuat Timeline");
    } finally {
      setTimelineLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMedia();
    loadTimeline();
  }, [loadMedia, loadTimeline]);

  const addClipToTimeline = useCallback(
    async (media) => {
      if (!projectId) return;
      try {
        const created = await apiFetch(`/projects/${projectId}/timeline/clips`, {
          method: "POST",
          body: JSON.stringify({ mediaId: media.id }),
        });
        setClips((prev) => [
          ...prev,
          {
            id: created.id,
            mediaId: created.mediaId,
            name: created.media?.name ?? media.name,
            type: (created.media?.type ?? media.type).toLowerCase(),
            sourceDuration: created.media?.duration ?? created.outPoint,
            trimStart: created.inPoint,
            trimEnd: created.outPoint,
            timelineStart: created.timelineStart,
            trackType: created.track?.type ?? (media.type === "audio" ? "AUDIO" : "VIDEO"),
            url: created.media?.path ? `${API_BASE}${created.media.path}` : media.url,
          },
        ]);
      } catch (err) {
        alert(err.message || "Gagal menambahkan media ke timeline");
      }
    },
    [projectId],
  );

  const clipsWithLayout = useMemo(() => {
    return clips.map((clip) => {
      const duration = clip.trimEnd - clip.trimStart;
      return {
        ...clip,
        duration,
        left: clip.timelineStart * PIXELS_PER_SECOND,
        width: duration * PIXELS_PER_SECOND,
      };
    });
  }, [clips]);

  const totalDuration = useMemo(
    () =>
      clipsWithLayout.reduce(
        (max, c) => Math.max(max, c.timelineStart + c.duration),
        0,
      ),
    [clipsWithLayout],
  );

  const selectedClip = clipsWithLayout.find((c) => c.id === selectedClipId) || null;

  const trimTimersRef = useRef({});

  const updateClipTrim = useCallback(
    (clipId, { trimStart, trimEnd }) => {
      let computedStart, computedEnd, computedTimelineStart;

      setClips((prev) =>
        prev.map((clip) => {
          if (clip.id !== clipId) return clip;

          let newStart = trimStart ?? clip.trimStart;
          let newEnd = trimEnd ?? clip.trimEnd;

          newStart = Math.max(0, Math.min(newStart, clip.trimEnd - MIN_CLIP_DURATION));
          newEnd = Math.min(clip.sourceDuration, Math.max(newEnd, clip.trimStart + MIN_CLIP_DURATION));

          let timelineStartDelta = 0;
          if (trimStart !== undefined) {
            timelineStartDelta = newStart - clip.trimStart;
          }

          computedStart = newStart;
          computedEnd = newEnd;
          computedTimelineStart = clip.timelineStart + timelineStartDelta;

          return { ...clip, trimStart: newStart, trimEnd: newEnd, timelineStart: computedTimelineStart };
        }),
      );

      if (computedStart === undefined) return;

      clearTimeout(trimTimersRef.current[clipId]);
      trimTimersRef.current[clipId] = setTimeout(async () => {
        try {
          await apiFetch(`/clips/${clipId}/trim`, {
            method: "PATCH",
            body: JSON.stringify({ inPoint: computedStart, outPoint: computedEnd, timelineStart: computedTimelineStart }),
          });
        } catch (err) {
          alert(err.message || "Gagal menyimpan hasil trim");
          loadTimeline();
        }
      }, 400);
    },
    [loadTimeline],
  );

  const selectClip = useCallback((clipId) => setSelectedClipId(clipId), []);
  const deselectClip = useCallback(() => setSelectedClipId(null), []);

  const splitSelectedClip = useCallback(async () => {
    if (!selectedClip) return;

    const clipEnd = selectedClip.timelineStart + selectedClip.duration;
    if (currentTime <= selectedClip.timelineStart || currentTime >= clipEnd) {
      alert("Posisi playhead harus berada di dalam clip yang dipilih untuk melakukan split");
      return;
    }

    try {
      await apiFetch(`/clips/${selectedClip.id}/split`, {
        method: "POST",
        body: JSON.stringify({ atTime: currentTime }),
      });
      await loadTimeline();
      deselectClip();
    } catch (err) {
      alert(err.message || "Gagal melakukan split clip");
    }
  }, [selectedClip, currentTime, loadTimeline, deselectClip]);

  const splitClipAt = useCallback(
    async (clipId, atTime) => {
      if (!clipId) return;
      try {
        await apiFetch(`/clips/${clipId}/split`, {
          method: "POST",
          body: JSON.stringify({ atTime }),
        });
        await loadTimeline();
        deselectClip();
      } catch (err) {
        alert(err.message || "Gagal melakukan split clip");
      }
    },
    [loadTimeline, deselectClip],
  );

  const canSplit =
    !!selectedClip &&
    currentTime > selectedClip.timelineStart &&
    currentTime < selectedClip.timelineStart + selectedClip.duration;

  const deleteClip = useCallback(
    async (clipId) => {
      if (!projectId || !clipId) return;
      try {
        await apiFetch(`/projects/${projectId}/timeline/clips/${clipId}`, {
          method: "DELETE",
        });
        setClips((prev) => prev.filter((c) => c.id !== clipId));
        if (selectedClipId === clipId) deselectClip();
      } catch (err) {
        alert(err.message || "Gagal menghapus clip");
      }
    },
    [projectId, selectedClipId, deselectClip],
  );

  const reorderClip = useCallback((clipId, targetIndex) => {
    setClips((prev) => {
      const currentIndex = prev.findIndex((c) => c.id === clipId);
      if (currentIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(currentIndex, 1);

      let insertAt = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
      insertAt = Math.max(0, Math.min(insertAt, updated.length));

      updated.splice(insertAt, 0, moved);
      return updated;
    });
  }, []);

  return {
    mediaLibrary,
    mediaLoading,
    mediaError,
    isUploading,
    uploadMedia,
    deleteMedia,
    clips: clipsWithLayout,
    timelineLoading,
    timelineError,
    totalDuration,
    selectedClip,
    selectClip,
    deselectClip,
    updateClipTrim,
    addClipToTimeline,
    reorderClip,
    splitSelectedClip,
    splitClipAt,
    canSplit,
    deleteClip,
    onDeleteClip: deleteClip,
    onSplitClip: splitClipAt,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    refreshTimeline: loadTimeline,
    refreshMedia: loadMedia,
  };
}