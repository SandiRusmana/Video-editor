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

/**
 * Hook utama untuk state Editor — sekarang terhubung ke backend:
 * - mediaLibrary  -> GET  /media?projectId=
 * - clips (timeline) -> GET  /projects/:projectId/timeline
 * - addClipToTimeline -> POST /projects/:projectId/timeline/clips
 *
 * CATATAN: updateClipTrim & reorderClip untuk sekarang masih mengubah
 * state lokal saja (belum memanggil API) karena endpoint PATCH /clips/:id
 * (Trim) dan endpoint Move Clip belum tersedia di backend. Begitu endpoint
 * itu jadi, tinggal tambahkan pemanggilan API di dalam kedua fungsi ini,
 * mengikuti pola apiFetch yang sudah ada.
 */
export default function useEditorState(projectId) {
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");

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
          type: m.type.toLowerCase(), // backend: VIDEO/AUDIO/IMAGE -> video/audio/image
          sourceDuration: m.duration ?? 5, // gambar tidak punya duration, default 5 detik
          thumbnail: m.thumbnail ? `${API_BASE}${m.thumbnail}` : null,
          url: `${API_BASE}${m.path}`, // dipakai Canvas/Preview untuk src video/gambar
        })),
      );
    } catch (err) {
      setMediaError(err.message || "Gagal memuat Media Library");
    } finally {
      setMediaLoading(false);
    }
  }, [projectId]);

  // ---- Ambil Timeline (semua track + clip) dari backend ----
  const loadTimeline = useCallback(async () => {
    if (!projectId) return;
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const tracks = await apiFetch(`/projects/${projectId}/timeline`);
      // Untuk sekarang UI masih menampilkan satu baris timeline saja,
      // jadi seluruh clip dari semua track digabung & diurutkan waktunya.
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
          timelineStart: clip.timelineStart, // posisi asli dari backend, dipakai untuk layout
          trackType: clip.trackType,
          url: clip.media?.path ? `${API_BASE}${clip.media.path}` : null, // dipakai CanvasPreview
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

  // Tambah clip baru ke timeline dari Media Library — memanggil backend,
  // lalu clip hasil response (sudah punya id & timelineStart asli) dimasukkan ke state.
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

  // Hitung posisi (left) tiap clip berdasarkan timelineStart ASLI dari
  // backend (bukan cumulative sum) — supaya jarak/gap antar clip hasil
  // drag & drop ke posisi tertentu (Story 8) tetap tergambar benar.
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

  // Story 12 — Trim Clip: update local state langsung (biar drag handle
  // terasa responsif/real-time di Canvas & Timeline — Acceptance 5, 9),
  // lalu kirim ke backend dengan DEBOUNCE 400ms supaya tidak mengirim
  // request berkali-kali tiap piksel saat user masih menggeser handle —
  // baru benar-benar tersimpan (Acceptance 8) begitu user berhenti drag.
  const trimTimersRef = useRef({});

  const updateClipTrim = useCallback(
    (clipId, { trimStart, trimEnd }) => {
      let computedStart, computedEnd, computedTimelineStart;

      setClips((prev) =>
        prev.map((clip) => {
          if (clip.id !== clipId) return clip;

          let newStart = trimStart ?? clip.trimStart;
          let newEnd = trimEnd ?? clip.trimEnd;

          // Acceptance 6: start tidak boleh >= end (jaga jarak minimum)
          newStart = Math.max(0, Math.min(newStart, clip.trimEnd - MIN_CLIP_DURATION));
          // Acceptance 7: tidak boleh melebihi durasi media asli
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

      if (computedStart === undefined) return; // clip tidak ditemukan

      clearTimeout(trimTimersRef.current[clipId]);
      trimTimersRef.current[clipId] = setTimeout(async () => {
        try {
          await apiFetch(`/clips/${clipId}/trim`, {
            method: "PATCH",
            body: JSON.stringify({ inPoint: computedStart, outPoint: computedEnd, timelineStart: computedTimelineStart }),
          });
        } catch (err) {
          alert(err.message || "Gagal menyimpan hasil trim");
          loadTimeline(); // sinkronkan ulang ke kondisi asli dari backend kalau gagal
        }
      }, 400);
    },
    [loadTimeline],
  );

  const selectClip = useCallback((clipId) => setSelectedClipId(clipId), []);
  const deselectClip = useCallback(() => setSelectedClipId(null), []);

  // Story 9 — Split Clip: potong clip yang sedang dipilih, tepat di posisi
  // playhead saat ini. Backend yang menghitung ulang metadata (start/end)
  // kedua clip hasil potongan; setelah berhasil, timeline di-refresh penuh
  // supaya Canvas/Preview & daftar clip otomatis ikut ter-update (Acceptance 9).
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

  // Versi split yang menerima clipId & atTime langsung sebagai parameter —
  // ini yang dipanggil TimelineEditor.jsx lewat prop "onSplitClip"
  // (tombol Split bawaan TimelineEditor sudah punya validasi & clip
  // terpilihnya sendiri, jadi cukup teruskan ke backend di sini).
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

  // Dipakai untuk mengaktifkan/nonaktifkan tombol Split di UI —
  // true hanya kalau ada clip terpilih DAN playhead ada di dalam rentangnya.
  const canSplit =
    !!selectedClip &&
    currentTime > selectedClip.timelineStart &&
    currentTime < selectedClip.timelineStart + selectedClip.duration;

  // Hapus satu clip dari timeline (dipanggil TimelineEditor.jsx sebagai
  // prop "onDelete"). Backend endpoint-nya sudah ada dari Story 8/9 kemarin:
  // DELETE /projects/:projectId/timeline/clips/:clipId
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

  // TODO: sama seperti trim, begitu endpoint Move Clip tersedia di backend,
  // panggil API di sini supaya urutan/posisi baru tersimpan permanen.
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