import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType, TrackType } from '@prisma/client';
import { AddClipDto } from './dto/add-clip.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateClipDto } from './dto/update-clip.dto';

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
    const nameMap = {
      VIDEO: `Video Track ${trackCount + 1}`,
      AUDIO: `Audio Track`,
      TEXT: `Text Track`,
    };
    return this.prisma.track.create({
      data: {
        projectId,
        type: trackType,
        name: nameMap[trackType] || `${trackType} Track`,
        order: trackCount,
      },
    });
  }

  private async getOrCreateUpperVideoTrack(projectId: string) {
    const videoTracks = await this.prisma.track.findMany({
      where: { projectId, type: TrackType.VIDEO },
      orderBy: { order: 'asc' },
    });

    if (videoTracks.length >= 2) {
      return videoTracks[1]; // Video Track 2 (Upper Overlay Track)
    }

    if (videoTracks.length === 1) {
      const trackCount = await this.prisma.track.count({ where: { projectId } });
      return this.prisma.track.create({
        data: {
          projectId,
          type: TrackType.VIDEO,
          name: 'Video Track 2',
          order: trackCount,
        },
      });
    }

    return this.getOrCreateTrack(projectId, TrackType.VIDEO);
  }

  async createTrack(userId: string, projectId: string, dto: CreateTrackDto) {
    await this.assertProjectOwnership(userId, projectId);
    const trackCount = await this.prisma.track.count({ where: { projectId } });
    const defaultName =
      dto.type === TrackType.VIDEO
        ? `Video Track ${trackCount + 1}`
        : dto.type === TrackType.AUDIO
        ? `Audio Track`
        : `Text Track`;

    return this.prisma.track.create({
      data: {
        projectId,
        type: dto.type,
        name: dto.name ?? defaultName,
        order: dto.order ?? trackCount,
      },
      include: {
        clips: true,
      },
    });
  }

  async deleteTrack(userId: string, projectId: string, trackId: string) {
    await this.assertProjectOwnership(userId, projectId);
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track tidak ditemukan');
    if (track.projectId !== projectId) {
      throw new ForbiddenException('Track bukan bagian dari project ini');
    }
    return this.prisma.track.delete({ where: { id: trackId } });
  }

  async getTimeline(userId: string, projectId: string) {
    await this.assertProjectOwnership(userId, projectId);

    const existingCount = await this.prisma.track.count({ where: { projectId } });
    if (existingCount === 0) {
      await this.prisma.track.createMany({
        data: [
          { projectId, type: TrackType.VIDEO, name: 'Video Track 1', order: 0 },
          { projectId, type: TrackType.VIDEO, name: 'Video Track 2', order: 1 },
          { projectId, type: TrackType.TEXT, name: 'Text Track', order: 2 },
          { projectId, type: TrackType.AUDIO, name: 'Audio Track', order: 3 },
        ],
      });
    }

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

  // Story 7, 8, & Text Track: tambahkan media / teks ke timeline sebagai clip baru.
  // Supports media clips and text clips, with explicit trackId or auto track creation.
  async addClip(userId: string, projectId: string, dto: AddClipDto) {
    await this.assertProjectOwnership(userId, projectId);

    let track: any;
    let clipDuration = dto.duration ?? DEFAULT_IMAGE_DURATION;
    let media: any = null;

    if (dto.mediaId) {
      media = await this.prisma.media.findUnique({ where: { id: dto.mediaId } });
      if (!media) throw new NotFoundException('Media tidak ditemukan');
      if (media.projectId !== projectId) {
        throw new ForbiddenException('Media ini bukan bagian dari project yang dimaksud');
      }
      clipDuration = media.duration ?? DEFAULT_IMAGE_DURATION;
    } else if (!dto.textContent && !dto.trackType && !dto.trackId) {
      throw new BadRequestException('mediaId atau textContent harus diisi');
    }

    if (dto.trackId) {
      track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
      if (!track) throw new NotFoundException('Track tidak ditemukan');
      if (track.projectId !== projectId) {
        throw new ForbiddenException('Track bukan bagian dari project ini');
      }
    } else if (dto.trackType) {
      track = await this.getOrCreateTrack(projectId, dto.trackType);
    } else if (media) {
      if (media.type === 'IMAGE') {
        track = await this.getOrCreateUpperVideoTrack(projectId);
      } else {
        const trackType = this.mapMediaTypeToTrackType(media.type);
        track = await this.getOrCreateTrack(projectId, trackType);
      }
    } else {
      // Text Clip
      track = await this.getOrCreateTrack(projectId, TrackType.TEXT);
    }

    let timelineStart: number;
    if (dto.timelineStart !== undefined) {
      timelineStart = dto.timelineStart;
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
        mediaId: media ? media.id : null,
        timelineStart,
        inPoint: 0,
        outPoint: clipDuration,
        textContent: dto.textContent ?? null,
        fontSize: dto.fontSize ?? (dto.textContent ? 36 : null),
        fontColor: dto.fontColor ?? (dto.textContent ? '#ffffff' : null),
        fontFamily: dto.fontFamily ?? (dto.textContent ? 'Poppins' : null),
        textPosition: dto.textPosition ?? (dto.textContent ? 'Bottom Center' : null),
      },
      include: {
        track: true,
        media: {
          select: { id: true, name: true, type: true, duration: true, thumbnail: true, path: true },
        },
      },
    });
  }

  // Update clip properties or move clip to another track
  async updateClip(userId: string, clipId: string, dto: UpdateClipDto) {
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { track: { include: { project: true } } },
    });
    if (!clip) throw new NotFoundException('Clip tidak ditemukan');
    if (clip.track.project.ownerId !== userId) {
      throw new ForbiddenException('Bukan pemilik project ini');
    }

    if (dto.trackId && dto.trackId !== clip.trackId) {
      const targetTrack = await this.prisma.track.findUnique({
        where: { id: dto.trackId },
      });
      if (!targetTrack) throw new NotFoundException('Target track tidak ditemukan');
      if (targetTrack.projectId !== clip.track.projectId) {
        throw new ForbiddenException('Target track berada di project yang berbeda');
      }
    }

    return this.prisma.clip.update({
      where: { id: clipId },
      data: dto,
      include: {
        track: true,
        media: {
          select: { id: true, name: true, type: true, duration: true, thumbnail: true, path: true },
        },
      },
    });
  }

  // Story 9: potong satu clip jadi dua pada posisi playhead (atTime).
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

    if (atTime <= clip.timelineStart + 0.05 || atTime >= clipEnd - 0.05) {
      throw new BadRequestException('Posisi playhead harus berada di dalam rentang clip untuk melakukan split');
    }

    const localSplitPoint = clip.inPoint + (atTime - clip.timelineStart);
    const originalOutPoint = clip.outPoint;

    const firstClip = await this.prisma.clip.update({
      where: { id: clipId },
      data: { outPoint: localSplitPoint },
      include: {
        media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
      },
    });

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
        textContent: clip.textContent,
        fontSize: clip.fontSize,
        fontColor: clip.fontColor,
        fontFamily: clip.fontFamily,
        textPosition: clip.textPosition,
        filter: clip.filter,
      },
      include: {
        media: { select: { id: true, name: true, type: true, duration: true, thumbnail: true } },
      },
    });

    return { first: firstClip, second: secondClip };
  }

  // Story 12: Trim clip dengan mengubah titik awal (inPoint) atau titik akhir (outPoint).
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

    if (clip.media && clip.media.duration != null && (clip.media.type === 'VIDEO' || clip.media.type === 'AUDIO')) {
      if (outPoint > clip.media.duration) {
        throw new BadRequestException('Nilai trim tidak boleh melebihi durasi media asli');
      }
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

  async updateClipsPositions(
    userId: string,
    projectId: string,
    updates: { id: string; trackId: string; timelineStart: number }[],
  ) {
    await this.assertProjectOwnership(userId, projectId);

    const updatedClips: any[] = [];
    for (const update of updates) {
      const clip = await this.prisma.clip.update({
        where: { id: update.id },
        data: {
          trackId: update.trackId,
          timelineStart: update.timelineStart,
        },
        include: {
          media: {
            select: { id: true, name: true, type: true, duration: true, thumbnail: true, path: true },
          },
        },
      });
      updatedClips.push(clip);
    }
    return updatedClips;
  }
}