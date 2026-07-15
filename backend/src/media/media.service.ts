import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import ffmpegStatic from 'ffmpeg-static';
import * as sizeOf from 'image-size';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType } from '@prisma/client';

// Arahkan fluent-ffmpeg ke binary ffmpeg & ffprobe yang sudah dibundel
// package *-static, jadi tidak perlu install FFmpeg manual di komputer.
ffmpeg.setFfprobePath(ffprobeStatic.path);
ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

const ALLOWED_MIME: Record<string, { type: MediaType; maxSize: number }> = {
  'video/mp4': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  'video/quicktime': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  'video/webm': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  'audio/mpeg': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/wav': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/mp3': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/ogg': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/opus': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/mp4': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'audio/x-m4a': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  'image/png': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
  'image/jpeg': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
  'image/webp': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
};

const ALLOWED_EXT: Record<string, { type: MediaType; maxSize: number }> = {
  '.mp4': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  '.mov': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  '.webm': { type: 'VIDEO', maxSize: 500 * 1024 * 1024 },
  '.mp3': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.wav': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.ogg': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.opus': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.m4a': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  // WhatsApp voice note kadang diekspor dengan ekstensi .mpeg/.mpg walau isinya
  // audio saja (tanpa video track) — mimetype yang terdeteksi browser/OS juga
  // sering salah jadi "video/mpeg". Diperlakukan sebagai AUDIO di sini.
  '.mpeg': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.mpg': { type: 'AUDIO', maxSize: 100 * 1024 * 1024 },
  '.png': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
  '.jpg': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
  '.jpeg': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
  '.webp': { type: 'IMAGE', maxSize: 20 * 1024 * 1024 },
};

const THUMBNAIL_DIR = './uploads';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(THUMBNAIL_DIR)) {
      fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
    }
  }

  static resolveType(mimetype: string, filename: string) {
    if (ALLOWED_MIME[mimetype]) return ALLOWED_MIME[mimetype];
    const ext = extname(filename).toLowerCase();
    return ALLOWED_EXT[ext] ?? null;
  }

  async uploadAndSave(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      this.safeDelete(file.path);
      throw new NotFoundException('Project tidak ditemukan');
    }
    if (project.ownerId !== userId) {
      this.safeDelete(file.path);
      throw new ForbiddenException('Bukan pemilik project ini');
    }

    const resolved = MediaService.resolveType(file.mimetype, file.originalname);
    if (!resolved) {
      this.safeDelete(file.path);
      throw new BadRequestException(
        `Tipe file "${file.mimetype}" tidak didukung. Gunakan video (mp4/webm/mov), audio (mp3/wav/ogg/opus/m4a), atau gambar (png/jpg/webp).`,
      );
    }

    if (file.size > resolved.maxSize) {
      this.safeDelete(file.path);
      throw new BadRequestException(
        `Ukuran file melebihi batas maksimal ${(resolved.maxSize / 1024 / 1024).toFixed(0)}MB untuk tipe ${resolved.type}.`,
      );
    }

    const metadata = await this.extractMetadata(file.path, resolved.type);
    const thumbnail = await this.generateThumbnail(file.path, file.filename, resolved.type);

    return this.prisma.media.create({
      data: {
        projectId,
        name: file.originalname,
        type: resolved.type,
        size: file.size,
        path: `/uploads/${file.filename}`,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        thumbnail,
      },
    });
  }

  // Acceptance 4 (story Media Library): ambil daftar media berdasar project,
  // sekaligus pastikan yang minta itu pemilik project-nya (konsisten dengan
  // proteksi kepemilikan di module Project).
  async findAllForProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.ownerId !== userId) throw new ForbiddenException('Bukan pemilik project ini');

    return this.prisma.media.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!media) throw new NotFoundException('Media tidak ditemukan');
    if (media.project.ownerId !== userId) throw new ForbiddenException('Bukan pemilik project ini');

    this.safeDelete(`.${media.path}`);
    if (media.thumbnail) this.safeDelete(`.${media.thumbnail}`);
    return this.prisma.media.delete({ where: { id } });
  }

  // ---- helper ----

  private extractMetadata(
    filePath: string,
    type: MediaType,
  ): Promise<{ duration?: number; width?: number; height?: number }> {
    if (type === 'IMAGE') {
      try {
        const dimensions = sizeOf.imageSize(fs.readFileSync(filePath));
        return Promise.resolve({ width: dimensions.width, height: dimensions.height });
      } catch {
        return Promise.resolve({});
      }
    }

    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return resolve({});
        const duration = data.format?.duration;
        const videoStream = data.streams?.find((s) => s.codec_type === 'video');
        resolve({
          duration: duration ? Math.round(duration * 100) / 100 : undefined,
          width: videoStream?.width,
          height: videoStream?.height,
        });
      });
    });
  }

  // Acceptance 5 (story Media Library): thumbnail untuk video diambil dari
  // frame di detik pertama. Untuk gambar, file itu sendiri dipakai sebagai
  // thumbnail-nya (tidak perlu proses tambahan). Audio tidak punya thumbnail
  // visual — biar ditampilkan pakai ikon generik di frontend.
  private generateThumbnail(
    filePath: string,
    filename: string,
    type: MediaType,
  ): Promise<string | undefined> {
    if (type === 'IMAGE') {
      return Promise.resolve(`/uploads/${filename}`);
    }

    if (type === 'VIDEO') {
      const thumbName = `thumb-${filename}.jpg`;
      return new Promise((resolve) => {
        ffmpeg(filePath)
          .on('end', () => resolve(`/uploads/${thumbName}`))
          .on('error', () => resolve(undefined))
          .screenshots({
            timestamps: ['1'],
            filename: thumbName,
            folder: THUMBNAIL_DIR,
            size: '320x?',
          });
      });
    }

    return Promise.resolve(undefined); // AUDIO
  }

  private safeDelete(path: string) {
    fs.unlink(path, () => { });
  }
}