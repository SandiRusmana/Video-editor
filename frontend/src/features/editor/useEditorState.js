import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { API_BASE } from "../../config/api.js";

export const PIXELS_PER_SECOND = 20;
const MIN_CLIP_DURATION = 1; // detik, durasi minimum saat di-trim

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

// Fetch khusus untuk upload file (FormData)
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

  const [tracks, setTracks] = useState([]);
  const [clips, setClips] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ---- AUTO SAVE SYSTEM STATE & MANAGERS ----
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saved" | "Saving..." | "Failed" | "Retry Saving..."
  const [toastMessage, setToastMessage] = useState(null);
  const pendingSaveRef = useRef(null);
  const isRetryingRef = useRef(false);
  const propTimersRef = useRef({});
  const trimTimersRef = useRef({});

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Main Auto Save Executor
  const executeAutoSave = useCallback(
    async (saveAction, isRetry = false) => {
      if (!saveAction) return false;
      setSaveStatus(isRetry ? "Retry Saving..." : "Saving...");
      if (isRetry) isRetryingRef.current = true;
      try {
        await saveAction();
        setSaveStatus("Saved");
        pendingSaveRef.current = null;
        isRetryingRef.current = false;
        if (isRetry) {
          showToast("✓ Auto Save berhasil: Perubahan project tersimpan");
        }
        return true;
      } catch (err) {
        console.error("Auto Save error:", err);
        pendingSaveRef.current = saveAction;
        isRetryingRef.current = false;
        setSaveStatus("Failed");
        showToast(`❌ Auto Save gagal: ${err.message || "Koneksi terputus"}. Mencoba menyimpan kembali...`);
        return false;
      }
    },
    [showToast]
  );

  const retryAutoSave = useCallback(() => {
    if (pendingSaveRef.current && !isRetryingRef.current) {
      executeAutoSave(pendingSaveRef.current, true);
    }
  }, [executeAutoSave]);

  // Online listener & Periodic Retry for Failed Auto Saves
  useEffect(() => {
    const handleOnline = () => {
      if (pendingSaveRef.current && (saveStatus === "Failed" || saveStatus === "Retry Saving...")) {
        showToast("🌐 Koneksi terhubung kembali. Melakukan Auto Save...");
        retryAutoSave();
      }
    };
    window.addEventListener("online", handleOnline);

    const interval = setInterval(() => {
      if (pendingSaveRef.current && saveStatus === "Failed" && !isRetryingRef.current) {
        retryAutoSave();
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [saveStatus, retryAutoSave, showToast]);

  // Browser navigation guard for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === "Saving..." || saveStatus === "Retry Saving..." || saveStatus === "Failed") {
        e.preventDefault();
        e.returnValue = "Perubahan belum berhasil disimpan ke server. Yakin ingin keluar?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Project Metadata Auto Save endpoint
  const autoSaveProjectMetadata = useCallback(
    async (dto) => {
      if (!projectId) return;
      return executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/auto-save`, {
          method: "PATCH",
          body: JSON.stringify(dto),
        });
      });
    },
    [projectId, executeAutoSave]
  );

  // ---- Ambil Media Library dari backend ----
  const loadMedia = useCallback(async () => {
    if (!projectId) return;
    setMediaLoading(true);
    setMediaError("");
    try {
      const data = await apiFetch(`/media?projectId=${projectId}`);
      const safeMedia = Array.isArray(data) ? data : [];
      setMediaLibrary(
        safeMedia.map((m) => ({
          id: m.id,
          name: m.name,
          type: (m.type || "video").toLowerCase(),
          sourceDuration: m.duration ?? 5,
          thumbnail: m.thumbnail ? `${API_BASE}${m.thumbnail}` : null,
          url: m.path ? `${API_BASE}${m.path}` : null,
        })),
      );
    } catch (err) {
      setMediaError(err.message || "Gagal memuat Media Library");
    } finally {
      setMediaLoading(false);
    }
  }, [projectId]);

  // ---- Upload file media baru ke backend ----
  const uploadMedia = useCallback(
    async (file) => {
      if (!projectId || !file) return;
      setIsUploading(true);
      setMediaError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const created = await apiUploadFetch(
          `/media/upload?projectId=${encodeURIComponent(projectId)}`,
          formData,
        );

        setMediaLibrary((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            type: (created.type || "video").toLowerCase(),
            sourceDuration: created.duration ?? 5,
            thumbnail: created.thumbnail ? `${API_BASE}${created.thumbnail}` : null,
            url: `${API_BASE}${created.path}`,
          },
        ]);
        showToast("✓ Media berhasil diunggah");
      } catch (err) {
        showToast(err.message || "Gagal mengunggah media");
      } finally {
        setIsUploading(false);
      }
    },
    [projectId, showToast],
  );

  // ---- Hapus media dari library ----
  const deleteMedia = useCallback(async (mediaId) => {
    if (!mediaId) return;
    try {
      await apiFetch(`/media/${mediaId}`, { method: "DELETE" });
      setMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
      showToast("✓ Media berhasil dihapus dari library");
    } catch (err) {
      showToast(err.message || "Gagal menghapus media");
    }
  }, [showToast]);

  // ---- Ambil Timeline (semua track + clip) dari backend ----
  const loadTimeline = useCallback(async () => {
    if (!projectId) return;
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const trackData = await apiFetch(`/projects/${projectId}/timeline`);
      const safeTracks = Array.isArray(trackData) ? trackData : [];
      setTracks(safeTracks);

      const flatClips = safeTracks
        .flatMap((track) =>
          (track.clips || []).map((clip) => {
            const isText = track.type === "TEXT" || !!clip.textContent;
            return {
              ...clip,
              trackId: track.id,
              trackName: track.name || `${track.type} Track`,
              trackType: track.type,
              trackOrder: track.order,
              mediaId: clip.mediaId,
              name: isText
                ? clip.textContent || "Teks Baru"
                : clip.media?.name ?? "(media tidak ditemukan)",
              type: isText ? "text" : (clip.media?.type ?? "video").toLowerCase(),
              duration: Math.max(0.1, (clip.outPoint ?? 5) - (clip.inPoint ?? 0)),
              sourceDuration: isText ? 9999 : (clip.media?.duration ?? clip.outPoint ?? 5),
              trimStart: clip.inPoint ?? 0,
              trimEnd: clip.outPoint ?? 5,
              timelineStart: clip.timelineStart ?? 0,
              x: clip.x ?? 0,
              y: clip.y ?? 0,
              scale: clip.scale ?? 1,
              rotation: clip.rotation ?? 0,
              opacity: clip.opacity ?? 1,
              cropX: clip.cropX ?? 0,
              cropY: clip.cropY ?? 0,
              cropW: clip.cropW ?? 0,
              cropH: clip.cropH ?? 0,
              textContent: clip.textContent,
              fontSize: clip.fontSize ?? 36,
              fontColor: clip.fontColor ?? "#ffffff",
              fontFamily: clip.fontFamily || "Poppins",
              textPosition: clip.textPosition || (isText ? "Bottom Center" : "Top Right"),
              volume: clip.volume ?? 1,
              muted: clip.muted ?? false,
              url: clip.media?.path ? `${API_BASE}${clip.media.path}` : null,
            };
          }),
        )
        .sort((a, b) => (a.timelineStart ?? 0) - (b.timelineStart ?? 0));

      const flatTransitions = (Array.isArray(trackData) ? trackData : []).flatMap((track) =>
        (track.transitions || []).map((t) => {
          const fullLeft = flatClips.find((c) => c.id === t.leftClipId) || t.leftClip || null;
          const fullRight = flatClips.find((c) => c.id === t.rightClipId) || t.rightClip || null;
          return {
            ...t,
            trackId: track.id,
            leftClip: fullLeft,
            rightClip: fullRight,
          };
        })
      );

      setClips(flatClips);
      setTransitions(flatTransitions);
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

  // Tambah clip media ke track dengan Auto Save
  const addClipToTimeline = useCallback(
    async (media, targetTrackId, timelineStart) => {
      if (!projectId) return;
      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/timeline/clips`, {
          method: "POST",
          body: JSON.stringify({
            mediaId: media.id,
            ...(targetTrackId ? { trackId: targetTrackId } : {}),
            ...(timelineStart !== undefined ? { timelineStart } : {}),
          }),
        });
        await loadTimeline();
      });
    },
    [projectId, loadTimeline, executeAutoSave],
  );

  // Tambah text clip ke DB dengan Auto Save
  const addTextClip = useCallback(
    async (opts = {}) => {
      if (!projectId) return;
      await executeAutoSave(async () => {
        const created = await apiFetch(`/projects/${projectId}/timeline/clips`, {
          method: "POST",
          body: JSON.stringify({
            textContent: opts.textContent || "Teks Baru",
            trackId: opts.trackId,
            trackType: "TEXT",
            timelineStart: opts.timelineStart ?? currentTime,
            duration: opts.duration ?? 5,
          }),
        });
        await loadTimeline();
        setSelectedClipId(created.id);
      });
    },
    [projectId, currentTime, loadTimeline, executeAutoSave],
  );

  // Tambah image overlay ke track dengan Auto Save
  const addImageOverlay = useCallback(
    async (media, targetTrackId) => {
      if (!projectId || !media) return;
      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/timeline/clips`, {
          method: "POST",
          body: JSON.stringify({
            mediaId: media.id,
            trackId: targetTrackId,
            timelineStart: currentTime,
            duration: 5,
          }),
        });
        await loadTimeline();
      });
    },
    [projectId, currentTime, loadTimeline, executeAutoSave],
  );

  const clipsWithLayout = useMemo(() => {
    return (clips || []).map((clip) => {
      const duration = (clip.trimEnd ?? 5) - (clip.trimStart ?? 0);
      const validDuration = isNaN(duration) || duration <= 0 ? 1 : duration;
      return {
        ...clip,
        duration: validDuration,
        left: (clip.timelineStart ?? 0) * PIXELS_PER_SECOND,
        width: validDuration * PIXELS_PER_SECOND,
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

  // Trim Clip dengan Debounced Auto Save
  const updateClipTrim = useCallback(
    (clipId, { trimStart, trimEnd }) => {
      let computedStart, computedEnd, computedTimelineStart;

      setClips((prev) =>
        prev.map((clip) => {
          if (clip.id !== clipId) return clip;

          let newStart = trimStart ?? clip.trimStart;
          let newEnd = trimEnd ?? clip.trimEnd;

          newStart = Math.max(0, Math.min(newStart, clip.trimEnd - MIN_CLIP_DURATION));
          const maxAllowedDuration =
            clip.type === "image" || clip.type === "text" || clip.trackType === "TEXT" || !clip.mediaId
              ? 9999
              : clip.sourceDuration || 9999;

          newEnd = Math.min(
            maxAllowedDuration,
            Math.max(newEnd, clip.trimStart + MIN_CLIP_DURATION),
          );

          let timelineStartDelta = 0;
          if (trimStart !== undefined) {
            timelineStartDelta = newStart - clip.trimStart;
          }

          computedStart = newStart;
          computedEnd = newEnd;
          computedTimelineStart = clip.timelineStart + timelineStartDelta;

          return {
            ...clip,
            trimStart: newStart,
            trimEnd: newEnd,
            timelineStart: computedTimelineStart,
          };
        }),
      );

      if (computedStart === undefined) return;

      setSaveStatus("Saving...");
      clearTimeout(trimTimersRef.current[clipId]);
      trimTimersRef.current[clipId] = setTimeout(() => {
        executeAutoSave(async () => {
          await apiFetch(`/clips/${clipId}/trim`, {
            method: "PATCH",
            body: JSON.stringify({
              inPoint: computedStart,
              outPoint: computedEnd,
              timelineStart: computedTimelineStart,
            }),
          });
        });
      }, 400);
    },
    [executeAutoSave],
  );

  // Update Properti Clip dengan Debounced Auto Save
  const updateClipProperties = useCallback(
    (clipId, properties) => {
      if (!clipId) return;

      // Optimistic update pada local state
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, ...properties } : c)),
      );

      setSaveStatus("Saving...");
      clearTimeout(propTimersRef.current[clipId]);
      propTimersRef.current[clipId] = setTimeout(() => {
        executeAutoSave(async () => {
          await apiFetch(`/clips/${clipId}`, {
            method: "PATCH",
            body: JSON.stringify(properties),
          });
        });
      }, 500);
    },
    [executeAutoSave],
  );

  // Memindahkan Clip antar Track dengan Auto Save
  const moveClipToTrack = useCallback(
    async (clipId, targetTrackId, dropTimelineStart) => {
      if (!clipId || !targetTrackId || !projectId) return;

      const movedClip = clips.find((c) => c.id === clipId);
      if (!movedClip) return;

      const sourceTrackId = movedClip.trackId;

      const targetTrackClips = clips
        .filter((c) => c.trackId === targetTrackId && c.id !== clipId)
        .sort((a, b) => a.timelineStart - b.timelineStart);

      let insertIndex = targetTrackClips.length;
      for (let i = 0; i < targetTrackClips.length; i++) {
        const c = targetTrackClips[i];
        const midpoint = c.timelineStart + (c.duration || (c.trimEnd - c.trimStart)) / 2;
        if (dropTimelineStart < midpoint) {
          insertIndex = i;
          break;
        }
      }

      const newTargetClips = [...targetTrackClips];
      newTargetClips.splice(insertIndex, 0, { ...movedClip, trackId: targetTrackId });

      const updates = [];
      let targetCursor = 0;
      newTargetClips.forEach((c) => {
        const clipDuration = c.trimEnd - c.trimStart;
        updates.push({
          id: c.id,
          trackId: targetTrackId,
          timelineStart: targetCursor,
        });
        targetCursor += clipDuration;
      });

      if (sourceTrackId !== targetTrackId) {
        const sourceTrackClips = clips
          .filter((c) => c.trackId === sourceTrackId && c.id !== clipId)
          .sort((a, b) => a.timelineStart - b.timelineStart);

        let sourceCursor = 0;
        sourceTrackClips.forEach((c) => {
          const clipDuration = c.trimEnd - c.trimStart;
          updates.push({
            id: c.id,
            trackId: sourceTrackId,
            timelineStart: sourceCursor,
          });
          sourceCursor += clipDuration;
        });
      }

      // Optimistic update
      setClips((prev) =>
        prev.map((c) => {
          const update = updates.find((u) => u.id === c.id);
          return update ? { ...c, trackId: update.trackId, timelineStart: update.timelineStart } : c;
        }),
      );

      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/timeline/move-clips`, {
          method: "PATCH",
          body: JSON.stringify({ updates }),
        });
        await loadTimeline();
      });
    },
    [clips, projectId, loadTimeline, executeAutoSave],
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

    await executeAutoSave(async () => {
      await apiFetch(`/clips/${selectedClip.id}/split`, {
        method: "POST",
        body: JSON.stringify({ atTime: currentTime }),
      });
      await loadTimeline();
      deselectClip();
    });
  }, [selectedClip, currentTime, loadTimeline, deselectClip, executeAutoSave]);

  const splitClipAt = useCallback(
    async (clipId, atTime) => {
      if (!clipId) return;
      await executeAutoSave(async () => {
        await apiFetch(`/clips/${clipId}/split`, {
          method: "POST",
          body: JSON.stringify({ atTime }),
        });
        await loadTimeline();
        deselectClip();
      });
    },
    [loadTimeline, deselectClip, executeAutoSave],
  );

  const canSplit =
    !!selectedClip &&
    currentTime > selectedClip.timelineStart &&
    currentTime < selectedClip.timelineStart + selectedClip.duration;

  const deleteClip = useCallback(
    async (clipId) => {
      if (!projectId || !clipId) return;

      const clipToDelete = clips.find((c) => c.id === clipId);
      const clipName = clipToDelete?.name || "Clip";
      const trackId = clipToDelete?.trackId;

      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/timeline/clips/${clipId}`, {
          method: "DELETE",
        });

        if (selectedClipId === clipId) deselectClip();

        if (trackId) {
          const remainingClips = clips
            .filter((c) => c.trackId === trackId && c.id !== clipId)
            .sort((a, b) => a.timelineStart - b.timelineStart);

          if (remainingClips.length > 0) {
            let cursor = 0;
            const updates = [];
            remainingClips.forEach((c) => {
              const duration = c.trimEnd - c.trimStart;
              updates.push({
                id: c.id,
                trackId: c.trackId,
                timelineStart: cursor,
              });
              cursor += duration;
            });

            await apiFetch(`/projects/${projectId}/timeline/move-clips`, {
              method: "PATCH",
              body: JSON.stringify({ updates }),
            });
          }
        }

        showToast(`Clip "${clipName}" berhasil dihapus dari timeline`);
        await loadTimeline();
      });
    },
    [projectId, clips, selectedClipId, deselectClip, showToast, loadTimeline, executeAutoSave],
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

  const addTrack = useCallback(
    async (type = "VIDEO", name) => {
      if (!projectId) return;
      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/tracks`, {
          method: "POST",
          body: JSON.stringify({ type, name }),
        });
        await loadTimeline();
      });
    },
    [projectId, loadTimeline, executeAutoSave],
  );

  const deleteTrack = useCallback(
    async (trackId) => {
      if (!projectId || !trackId) return;
      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/tracks/${trackId}`, {
          method: "DELETE",
        });
        await loadTimeline();
      });
    },
    [projectId, loadTimeline, executeAutoSave],
  );

  // ---- TRANSITIONS API INTEGRATION ----
  const saveTransition = useCallback(
    async ({ leftClipId, rightClipId, type = "Fade", duration = 1.0 }) => {
      if (!projectId || !leftClipId || !rightClipId) return null;
      let result = null;
      await executeAutoSave(async () => {
        result = await apiFetch(`/projects/${projectId}/timeline/transitions`, {
          method: "POST",
          body: JSON.stringify({ leftClipId, rightClipId, type, duration }),
        });
        showToast(`Transisi "${type}" berhasil diterapkan`);
        await loadTimeline();
      });
      return result;
    },
    [projectId, loadTimeline, showToast, executeAutoSave],
  );

  const updateTransition = useCallback(
    async (transitionId, { type, duration }) => {
      if (!projectId || !transitionId) return null;
      let result = null;
      await executeAutoSave(async () => {
        result = await apiFetch(`/projects/${projectId}/timeline/transitions/${transitionId}`, {
          method: "PATCH",
          body: JSON.stringify({ type, duration }),
        });
        showToast("Transisi berhasil diperbarui");
        await loadTimeline();
      });
      return result;
    },
    [projectId, loadTimeline, showToast, executeAutoSave],
  );

  const deleteTransition = useCallback(
    async (transitionId) => {
      if (!projectId || !transitionId) return;
      await executeAutoSave(async () => {
        await apiFetch(`/projects/${projectId}/timeline/transitions/${transitionId}`, {
          method: "DELETE",
        });
        showToast("Transisi berhasil dihapus dari timeline");
        await loadTimeline();
      });
    },
    [projectId, loadTimeline, showToast, executeAutoSave],
  );

  return {
    mediaLibrary,
    mediaLoading,
    mediaError,
    isUploading,
    uploadMedia,
    deleteMedia,
    tracks,
    clips: clipsWithLayout,
    timelineLoading,
    timelineError,
    totalDuration,
    selectedClip,
    selectedClipId,
    selectClip,
    setSelectedClipId: selectClip,
    deselectClip,
    updateClipTrim,
    updateClipProperties,
    moveClipToTrack,
    addClipToTimeline,
    addImageOverlay,
    addTextClip,
    addTrack,
    deleteTrack,
    reorderClip,
    splitSelectedClip,
    splitClipAt,
    canSplit,
    deleteClip,
    onDeleteClip: deleteClip,
    onSplitClip: splitClipAt,
    transitions,
    saveTransition,
    updateTransition,
    deleteTransition,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isSaving: saveStatus === "Saving..." || saveStatus === "Retry Saving...",
    saveStatus,
    retryAutoSave,
    autoSaveProjectMetadata,
    toastMessage,
    showToast,
    refreshTimeline: loadTimeline,
    refreshMedia: loadMedia,
  };
}