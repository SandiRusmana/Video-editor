import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_IMAGE_DURATION = 5; // detik, dipakai kalau media tidak punya durasi (gambar)

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  // Pastikan project ini milik user yang login (dipakai di semua method di bawah)
  private async assertProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.ownerId !== userId) throw new ForbiddenException('Bukan pemilik project ini');
    return project;
  }

  // Story 7, Acceptance 2: track utama untuk proses editing.
  // Dibuat otomatis kalau project belum punya track sama sekali —
  // user tidak perlu membuat track secara manual.
  private async getOrCreateMainTrack(projectId: string) {
    const existing = await this.prisma.track.findFirst({
      where: { projectId, type: 'VIDEO' },
      orderBy: { order: 'asc' },
    });
    if (existing) return existing;

    return this.prisma.track.create({
      data: { projectId, type: 'VIDEO', order: 0 },
    });
  }

  // Acceptance 1, 4, 5, 6, 7, 11, 12: ambil seluruh isi timeline sebuah
  // project — track beserta clip-clip di dalamnya, terurut sesuai posisi,
  // masing-masing clip menyertakan info media (nama & durasi).
  async getTimeline(userId: string, projectId: string) {
    await this.assertProjectOwnership(userId, projectId);

    const tracks = await this.prisma.track.findMany({
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

    return tracks;
  }

  // Acceptance 3, 6, 7, 11: tambahkan media dari Media Library ke timeline.
  // Posisi (timelineStart) dihitung otomatis: ditempel di ujung clip
  // terakhir pada track utama, sehingga urutan selalu mengikuti urutan
  // penambahan seperti yang diminta acceptance criteria.
  async addClip(userId: string, projectId: string, mediaId: string) {
    await this.assertProjectOwnership(userId, projectId);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media tidak ditemukan');
    if (media.projectId !== projectId) {
      throw new ForbiddenException('Media ini bukan bagian dari project yang dimaksud');
    }

    const track = await this.getOrCreateMainTrack(projectId);

    const lastClip = await this.prisma.clip.findFirst({
      where: { trackId: track.id },
      orderBy: { timelineStart: 'desc' },
    });

    const clipDuration = media.duration ?? DEFAULT_IMAGE_DURATION;
    const timelineStart = lastClip ? lastClip.timelineStart + (lastClip.outPoint - lastClip.inPoint) : 0;

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
