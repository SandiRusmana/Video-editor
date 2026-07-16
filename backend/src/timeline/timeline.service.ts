import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
              // tambah field path supaya frontend tahu URL file aslinya
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

  // Hapus clip dari timeline berdasarkan clipId — pastikan clip memang milik
  // project yang sama (lewat track.projectId) supaya tidak bisa hapus clip orang lain.
  async deleteClip(userId: string, projectId: string, clipId: string) {
    await this.assertProjectOwnership(userId, projectId);

    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { track: { select: { projectId: true } } },
    });
    if (!clip) throw new NotFoundException('Clip tidak ditemukan');
    if (clip.track.projectId !== projectId) {
      throw new ForbiddenException('Clip ini bukan bagian dari project yang dimaksud');
    }

    await this.prisma.clip.delete({ where: { id: clipId } });
    return { message: 'Clip berhasil dihapus' };
  }

  // Story 8: Urutkan dan update timelineStart secara berurutan agar tidak nimpa (magnetic)
  async reorderClips(userId: string, projectId: string, clipIds: string[]) {
    await this.assertProjectOwnership(userId, projectId);

    // Ambil HANYA clip yang benar-benar ada di project ini (filter by clipIds juga)
    const clips = await this.prisma.clip.findMany({
      where: {
        id: { in: clipIds },      // hanya proses clipId yang dikirim frontend
        track: { projectId },     // pastikan clip memang milik project ini
      },
    });

    // Buat map id -> clip agar lookup O(1)
    const clipMap = new Map(clips.map((c) => [c.id, c]));

    let currentStart = 0;
    for (const id of clipIds) {
      const clip = clipMap.get(id);
      if (!clip) continue; // clip sudah dihapus atau tidak valid, lewati saja

      const duration = clip.outPoint - clip.inPoint;

      // updateMany tidak throw P2025 jika record tidak ditemukan (aman dari race condition)
      await this.prisma.clip.updateMany({
        where: { id, track: { projectId } },
        data: { timelineStart: currentStart },
      });

      currentStart += duration;
    }

    return { message: 'Urutan clip berhasil diperbarui' };
  }
}
