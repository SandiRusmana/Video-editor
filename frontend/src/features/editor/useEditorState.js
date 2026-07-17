import { useState, useCallback, useMemo, useEffect } from "react";

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
          thumbnail: m.thumbnail,
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
          // Tentukan trackType dari tipe media, bukan dari track di database,
          // agar clip audio lama yang salah masuk track VIDEO tetap tampil di Audio Track.
          trackType: (clip.media?.type ?? clip.trackType) === "AUDIO" ? "AUDIO" : "VIDEO",
          url: clip.media?.path ? `http://localhost:3000${clip.media.path}` : null,
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
            url: created.media?.path ? `http://localhost:3000${created.media.path}` : null,
            // created.media.type dari backend = uppercase (AUDIO/VIDEO/IMAGE)
            // media.type dari mediaLibrary = lowercase (audio/video/image)
            trackType: (created.media?.type ?? media.type).toUpperCase() === 'AUDIO' ? 'AUDIO' : 'VIDEO',
          },
        ]);
      } catch (err) {
        alert(err.message || "Gagal menambahkan media ke timeline");
      }
    },
    [projectId],
  );

  // Upload file media baru ke backend
  const uploadMedia = useCallback(
    async (file) => {
      if (!projectId) return;
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/media/upload?projectId=${projectId}`, {
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

        // Segarkan Media Library setelah berhasil mengunggah
        await loadMedia();
      } catch (err) {
        alert(err.message || "Gagal mengunggah media");
      }
    },
    [projectId, loadMedia]
  );

  // Hapus file media dari library & backend
  const deleteMedia = useCallback(
    async (mediaId) => {
      if (!projectId) return;
      if (!window.confirm("Apakah Anda yakin ingin menghapus media ini? Klip yang menggunakan media ini di timeline juga akan terhapus.")) return;

      try {
        await apiFetch(`/media/${mediaId}`, {
          method: "DELETE",
        });
        // Segarkan Media Library dan Timeline setelah berhasil dihapus
        await loadMedia();
        await loadTimeline();
      } catch (err) {
        alert(err.message || "Gagal menghapus media");
      }
    },
    [projectId, loadMedia, loadTimeline]
  );

  // Hitung posisi (left) tiap clip secara magnetik per jenis track (independen)
  const clipsWithLayout = useMemo(() => {
    const videoClips = clips.filter((c) => c.trackType === "VIDEO");
    const audioClips = clips.filter((c) => c.trackType === "AUDIO");

    const layoutTrack = (trackClips) => {
      let currentStart = 0;
      return trackClips.map((clip) => {
        const duration = clip.trimEnd - clip.trimStart;
        const left = currentStart * PIXELS_PER_SECOND;
        const calculatedStart = currentStart;
        currentStart += duration;
        return {
          ...clip,
          duration,
          timelineStart: calculatedStart,
          left,
          width: duration * PIXELS_PER_SECOND,
        };
      });
    };

    return [...layoutTrack(videoClips), ...layoutTrack(audioClips)];
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

  // TODO: begitu endpoint PATCH /clips/:id (Trim Clip) sudah tersedia di
  // backend, tambahkan pemanggilan apiFetch di sini supaya perubahan
  // trim juga tersimpan ke database, bukan cuma state lokal seperti sekarang.
  const updateClipTrim = useCallback((clipId, { trimStart, trimEnd }) => {
    setClips((prev) =>
      prev.map((clip) => {
        if (clip.id !== clipId) return clip;

        let newStart = trimStart ?? clip.trimStart;
        let newEnd = trimEnd ?? clip.trimEnd;

        newStart = Math.max(0, Math.min(newStart, clip.trimEnd - MIN_CLIP_DURATION));
        newEnd = Math.min(clip.sourceDuration, Math.max(newEnd, clip.trimStart + MIN_CLIP_DURATION));

        return { ...clip, trimStart: newStart, trimEnd: newEnd };
      }),
    );
  }, []);

  const selectClip = useCallback((clipId) => setSelectedClipId(clipId), []);
  const deselectClip = useCallback(() => setSelectedClipId(null), []);

  // Hapus clip dari timeline — panggil API DELETE lalu hapus dari state lokal
  const deleteClip = useCallback(
    async (clipId) => {
      if (!projectId) return;
      try {
        await apiFetch(`/projects/${projectId}/timeline/clips/${clipId}`, {
          method: "DELETE",
        });
        setClips((prev) => {
          const updatedClips = prev.filter((c) => c.id !== clipId);
          // Update database order di background agar tidak tumpang tindih
          if (updatedClips.length > 0) {
            apiFetch(`/projects/${projectId}/timeline/reorder`, {
              method: "PATCH",
              body: JSON.stringify({ clipIds: updatedClips.map((c) => c.id) }),
            }).catch(console.error);
          }
          return updatedClips;
        });
        // Kalau clip yang dihapus sedang dipilih, batalkan seleksi
        setSelectedClipId((prev) => (prev === clipId ? null : prev));
      } catch (err) {
        alert(err.message || "Gagal menghapus clip dari timeline");
      }
    },
    [projectId],
  );

  // Memindahkan urutan clip (Reorder) di track yang sesuai secara independen
  const reorderClip = useCallback((clipId, targetIndex) => {
    setClips((prev) => {
      const clipToMove = prev.find((c) => c.id === clipId);
      if (!clipToMove) return prev;

      const trackType = clipToMove.trackType;
      // Pisahkan klip track yang sama dengan track lainnya
      const sameTrackClips = prev.filter((c) => c.trackType === trackType);
      const otherTrackClips = prev.filter((c) => c.trackType !== trackType);

      const currentIndex = sameTrackClips.findIndex((c) => c.id === clipId);
      if (currentIndex === -1) return prev;

      const updatedSameTrack = [...sameTrackClips];
      const [moved] = updatedSameTrack.splice(currentIndex, 1);

      let insertAt = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
      insertAt = Math.max(0, Math.min(insertAt, updatedSameTrack.length));
      updatedSameTrack.splice(insertAt, 0, moved);

      const updatedAll = [...updatedSameTrack, ...otherTrackClips];

      // Simpan urutan baru ke database
      apiFetch(`/projects/${projectId}/timeline/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ clipIds: updatedAll.map((c) => c.id) }),
      }).catch((err) => {
        alert(err.message || "Gagal menyimpan urutan baru");
      });

      return updatedAll;
    });
  }, [projectId]);

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
    deleteClip,
    deleteMedia,
    reorderClip,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    refreshTimeline: loadTimeline,
    refreshMedia: loadMedia,
    uploadMedia,
  };
}