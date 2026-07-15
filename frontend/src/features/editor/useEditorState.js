import { useState, useCallback, useMemo } from "react";

export const PIXELS_PER_SECOND = 20;
const MIN_CLIP_DURATION = 1; // detik, durasi minimum saat di-trim

/**
 * Hook utama untuk state Editor:
 * - daftar media di Media Library
 * - daftar clip di Track 1 (timeline)
 * - clip yang sedang dipilih (untuk Properties Panel & Trim)
 * - posisi playhead (waktu berjalan di Canvas Preview)
 */
export default function useEditorState() {
  const [mediaLibrary] = useState([
    { id: "m1", name: "intro.mp4", type: "video", sourceDuration: 20 },
    { id: "m2", name: "gameplay.mp4", type: "video", sourceDuration: 40 },
    { id: "m3", name: "music.mp3", type: "audio", sourceDuration: 60 },
  ]);

  const [clips, setClips] = useState([
    { id: "c1", mediaId: "m1", name: "intro.mp4", type: "video", sourceDuration: 20, trimStart: 0, trimEnd: 15 },
    { id: "c2", mediaId: "m2", name: "gameplay.mp4", type: "video", sourceDuration: 40, trimStart: 0, trimEnd: 25 },
  ]);

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentTime, setCurrentTime] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tambah clip baru ke timeline dari Media Library (drag/klik "+ Add to Timeline")
  const addClipToTimeline = useCallback((media) => {
    const newClip = {
      id: `c_${Date.now()}`,
      mediaId: media.id,
      name: media.name,
      type: media.type,
      sourceDuration: media.sourceDuration,
      trimStart: 0,
      trimEnd: Math.min(15, media.sourceDuration),
    };
    setClips((prev) => [...prev, newClip]);
  }, []);

  // Hitung posisi (left) tiap clip di timeline berdasar urutan array (sequential, gak overlap)
  const clipsWithLayout = useMemo(() => {
    let cursor = 0;
    return clips.map((clip) => {
      const duration = clip.trimEnd - clip.trimStart;
      const layout = {
        ...clip,
        duration,
        left: cursor * PIXELS_PER_SECOND,
        width: duration * PIXELS_PER_SECOND,
      };
      cursor += duration;
      return layout;
    });
  }, [clips]);

  const totalDuration = useMemo(
    () => clipsWithLayout.reduce((sum, c) => sum + c.duration, 0),
    [clipsWithLayout]
  );

  const selectedClip = clipsWithLayout.find((c) => c.id === selectedClipId) || null;

  // Update trimStart / trimEnd untuk clip tertentu, dipanggil saat drag handle ATAU edit input di Properties
  const updateClipTrim = useCallback((clipId, { trimStart, trimEnd }) => {
    setClips((prev) =>
      prev.map((clip) => {
        if (clip.id !== clipId) return clip;

        let newStart = trimStart ?? clip.trimStart;
        let newEnd = trimEnd ?? clip.trimEnd;

        // Batasi supaya gak keluar dari durasi asli file & gak lebih kecil dari minimum
        newStart = Math.max(0, Math.min(newStart, clip.trimEnd - MIN_CLIP_DURATION));
        newEnd = Math.min(clip.sourceDuration, Math.max(newEnd, clip.trimStart + MIN_CLIP_DURATION));

        return { ...clip, trimStart: newStart, trimEnd: newEnd };
      })
    );
  }, []);

  const selectClip = useCallback((clipId) => setSelectedClipId(clipId), []);
  const deselectClip = useCallback(() => setSelectedClipId(null), []);

  // Pindahkan urutan clip (drag clip ke posisi lain di Track 1)
  const reorderClip = useCallback((clipId, targetIndex) => {
    setClips((prev) => {
      const currentIndex = prev.findIndex((c) => c.id === clipId);
      if (currentIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(currentIndex, 1);

      // Kalau clip dipindah maju (ke kanan), index tujuan perlu dikurangi 1
      // karena array sudah menyusut duluan sebelum posisi itu
      let insertAt = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
      insertAt = Math.max(0, Math.min(insertAt, updated.length));

      updated.splice(insertAt, 0, moved);
      return updated;
    });
  }, []);

  return {
    mediaLibrary,
    clips: clipsWithLayout,
    totalDuration,
    selectedClip,
    selectClip,
    deselectClip,
    updateClipTrim,
    addClipToTimeline,
    reorderClip,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
  };
}