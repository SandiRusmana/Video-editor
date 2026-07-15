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
              select: { id: true, name: true, type: true, duration: true, thumbnail: true },
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
          select: { id: true, name: true, type: true, duration: true, thumbnail: true },
        },
      },
    });
  }
}
