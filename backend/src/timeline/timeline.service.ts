import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType, TrackType } from '@prisma/client';

const DEFAULT_IMAGE_DURATION = 5; // detik, dipakai kalau media tidak punya durasi (gambar)

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) { }

  private async assertProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.ownerId !== userId) throw new ForbiddenException('Bukan pemilik project ini');
    return project;
  }

  // Story 8: video & gambar otomatis masuk track VIDEO, audio masuk
  // track AUDIO — supaya media dari tipe berbeda tidak tercampur di satu
  // track yang sama. Track dibuat otomatis kalau belum ada.
  private mapMediaTypeToTrackType(mediaType: MediaType): TrackType {
    return mediaType === 'AUDIO' ? 'AUDIO' : 'VIDEO';
  }

  private async getOrCreateTrack(projectId: string, trackType: TrackType) {
    const existing = await this.prisma.track.findFirst({
      where: { projectId, type: trackType },
      orderBy: { order: 'asc' },
    });
    if (existing) return existing;

    const trackCount = await this.prisma.track.count({ where: { projectId } });
    return this.prisma.track.create({
      data: { projectId, type: trackType, order: trackCount },
    });
  }

  async getTimeline(userId: string, projectId: string) {
    await this.assertProjectOwnership(userId, projectId);

    return this.prisma.track.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        clips: {
          orderBy: { timelineStart: 'asc' },
          include: {
            media: {
              select: { id: true, name: true, type: true, duration: true, thumbnail: true, path: true },
            },
          },
        },
      },
    });
  }

  // Story 7 & 8: tambahkan media ke timeline sebagai clip baru.
  // - Kalau `customStart` dikirim (hasil drag & drop ke posisi tertentu),
  //   posisi itu yang dipakai.
  // - Kalau tidak dikirim, clip otomatis ditempel di ujung track yang
  //   sesuai (perilaku default / penambahan biasa dari Media Library).
  async addClip(userId: string, projectId: string, mediaId: string, customStart?: number) {
    await this.assertProjectOwnership(userId, projectId);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media tidak ditemukan');
    if (media.projectId !== projectId) {
      throw new ForbiddenException('Media ini bukan bagian dari project yang dimaksud');
    }

    const trackType = this.mapMediaTypeToTrackType(media.type);
    const track = await this.getOrCreateTrack(projectId, trackType);

    const clipDuration = media.duration ?? DEFAULT_IMAGE_DURATION;

    let timelineStart: number;
    if (customStart !== undefined) {
      timelineStart = customStart;
    } else {
      const lastClip = await this.prisma.clip.findFirst({
        where: { trackId: track.id },
        orderBy: { timelineStart: 'desc' },
      });
      timelineStart = lastClip ? lastClip.timelineStart + (lastClip.outPoint - lastClip.inPoint) : 0;
    }

    return this.prisma.clip.create({
      data: {
        trackId: track.id,
        mediaId: media.id,
        timelineStart,
        inPoint: 0,
        outPoint: clipDuration,
      },
      include: {
        media: {
          select: { id: true, name: true, type: true, duration: true, thumbnail: true, path: true },
        },
      },
    });
  }

  // Story 9: potong satu clip jadi dua pada posisi playhead (atTime).
  // Prinsipnya: clip lama diperpendek (outPoint dipotong sampai titik split),
  // lalu dibuat clip baru sebagai lanjutannya, mulai dari titik split itu.
  // File media asli TIDAK disentuh — cuma metadata timeline yang berubah.
  async splitClip(userId: string, clipId: string, atTime: number) {
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { track: { include: { project: true } } },
    });
    if (!clip) throw new NotFoundException('Clip tidak ditemukan');
    if (clip.track.project.ownerId !== userId) {
      throw new ForbiddenException('Bukan pemilik project ini');
    }

    const clipEnd = clip.timelineStart + (clip.outPoint - clip.inPoint);

    // Titik split harus berada di DALAM rentang clip, bukan pas di ujung
    // (kalau pas di ujung, hasilnya salah satu clip berdurasi 0 — tidak masuk akal)
    if (atTime <= clip.timelineStart + 0.05 || atTime >= clipEnd - 0.05) {
      throw new BadRequestException('Posisi playhead harus berada di dalam rentang clip untuk melakukan split');
    }

    // Posisi split, diterjemahkan ke "detik di dalam file sumber media"
    const localSplitPoint = clip.inPoint + (atTime - clip.timelineStart);
    const originalOutPoint = clip.outPoint; // simpan dulu sebelum di-overwrite

    // Clip pertama: dipendekkan, berakhir tepat di titik split
    const firstClip = await this.prisma.clip.update({
      where: { id: clipId },
      data: { outPoint: localSplitPoint },
      include: {
        media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
      },
    });

    // Clip kedua: kelanjutan dari titik split sampai akhir clip semula,
    // media sumber & properti visual/audio disalin supaya konsisten dengan
    // clip asalnya (Acceptance 5).
    const secondClip = await this.prisma.clip.create({
      data: {
        trackId: clip.trackId,
        mediaId: clip.mediaId,
        timelineStart: atTime,
        inPoint: localSplitPoint,
        outPoint: originalOutPoint,
        x: clip.x,
        y: clip.y,
        scale: clip.scale,
        rotation: clip.rotation,
        opacity: clip.opacity,
        volume: clip.volume,
        muted: clip.muted,
        filter: clip.filter,
      },
      include: {
        media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
      },
    });

    return { first: firstClip, second: secondClip };
  }

  // Story 12: Trim clip dengan mengubah titik awal (inPoint) atau titik akhir (outPoint).
  // Mengubah inPoint/outPoint tidak mengubah file media asli.
  async trimClip(userId: string, clipId: string, dto: { inPoint?: number, outPoint?: number, timelineStart?: number }) {
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { track: { include: { project: true } }, media: true },
    });
    if (!clip) throw new NotFoundException('Clip tidak ditemukan');
    if (clip.track.project.ownerId !== userId) {
      throw new ForbiddenException('Bukan pemilik project ini');
    }

    let { inPoint, outPoint, timelineStart } = dto;
    
    inPoint = inPoint ?? clip.inPoint;
    outPoint = outPoint ?? clip.outPoint;
    timelineStart = timelineStart ?? clip.timelineStart;

    if (inPoint >= outPoint) {
      throw new BadRequestException('Titik awal (start time) tidak boleh lebih besar atau sama dengan titik akhir (end time)');
    }

    const duration = clip.media?.duration ?? DEFAULT_IMAGE_DURATION;
    if (outPoint > duration) {
      throw new BadRequestException('Nilai trim tidak boleh melebihi durasi media asli');
    }
    
    if (inPoint < 0) {
      throw new BadRequestException('Titik awal tidak boleh kurang dari 0');
    }

    return this.prisma.clip.update({
      where: { id: clipId },
      data: { inPoint, outPoint, timelineStart },
      include: {
        media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
      },
    });
  }

  // Hapus satu clip dari timeline. File media aslinya tidak ikut terhapus
  // (cuma clip-nya, medianya tetap ada di Media Library).
  async deleteClip(userId: string, projectId: string, clipId: string) {
    await this.assertProjectOwnership(userId, projectId);

    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { track: true },
    });
    if (!clip) throw new NotFoundException('Clip tidak ditemukan');
    if (clip.track.projectId !== projectId) {
      throw new ForbiddenException('Clip ini bukan bagian dari project yang dimaksud');
    }

    return this.prisma.clip.delete({ where: { id: clipId } });
  }

  // Susun ulang urutan beberapa clip (Move Clip). `clipIds` dikirim sesuai
  // urutan BARU yang diinginkan user — backend menghitung ulang posisi
  // (timelineStart) masing-masing supaya berurutan nempel sesuai urutan itu.
  // Catatan: semua clip yang di-reorder harus berada di track yang sama.
  async reorderClips(userId: string, projectId: string, clipIds: string[]) {
    await this.assertProjectOwnership(userId, projectId);

    if (!clipIds.length) return [];

    const clips = await this.prisma.clip.findMany({
      where: { id: { in: clipIds } },
      include: { track: true },
    });

    if (clips.length !== clipIds.length) {
      throw new NotFoundException('Salah satu atau lebih clip tidak ditemukan');
    }
    for (const clip of clips) {
      if (clip.track.projectId !== projectId) {
        throw new ForbiddenException('Salah satu clip bukan bagian dari project yang dimaksud');
      }
    }
    const trackId = clips[0].trackId;
    if (clips.some((c) => c.trackId !== trackId)) {
      throw new BadRequestException('Semua clip yang di-reorder harus berada di track yang sama');
    }

    // Hitung ulang posisi tiap clip secara berurutan sesuai urutan
    // clipIds yang dikirim, saling nempel tanpa celah (nose-to-tail).
    let cursor = 0;
    const updated: any[] = [];
    for (const id of clipIds) {
      const clip = clips.find((c) => c.id === id)!;
      const duration = clip.outPoint - clip.inPoint;
      const result = await this.prisma.clip.update({
        where: { id },
        data: { timelineStart: cursor },
        include: {
          media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
        },
      });
      updated.push(result);
      cursor += duration;
    }

    return updated;
  }
}