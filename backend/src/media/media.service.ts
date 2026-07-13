import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import * as sizeOf from 'image-size';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType } from '@prisma/client';

// Arahkan fluent-ffmpeg ke binary ffprobe yang sudah dibundel package
// ffprobe-static, jadi tidak perlu install FFmpeg manual di komputer.
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Tipe file yang diizinkan (Acceptance 3) + batas ukuran per tipe (Acceptance 4)
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

// Fallback berdasarkan ekstensi file — dipakai kalau mimetype yang terdeteksi
// OS/browser tidak akurat (sering terjadi di Windows untuk format .opus/.ogg
// yang suka salah kedetect sebagai "video/mpeg").
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

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) { }

  // Cek mimetype dulu; kalau tidak dikenali/salah deteksi, coba tebak dari
  // ekstensi nama file sebagai fallback.
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
    // Pastikan project ada & milik user ini (proteksi kepemilikan, konsisten sama Project module)
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      this.safeDelete(file.path);
      throw new NotFoundException('Project tidak ditemukan');
    }
    if (project.ownerId !== userId) {
      this.safeDelete(file.path);
      throw new ForbiddenException('Bukan pemilik project ini');
    }

    // Validasi tipe file (Acceptance 3)
    const resolved = MediaService.resolveType(file.mimetype, file.originalname);
    if (!resolved) {
      this.safeDelete(file.path);
      throw new BadRequestException(
        `Tipe file "${file.mimetype}" tidak didukung. Gunakan video (mp4/webm/mov), audio (mp3/wav/ogg/opus/m4a), atau gambar (png/jpg/webp).`,
      );
    }

    // Validasi ukuran file (Acceptance 4)
    if (file.size > resolved.maxSize) {
      this.safeDelete(file.path);
      throw new BadRequestException(
        `Ukuran file melebihi batas maksimal ${(resolved.maxSize / 1024 / 1024).toFixed(0)}MB untuk tipe ${resolved.type}.`,
      );
    }

    // Ekstrak metadata (durasi & resolusi) sesuai tipe file (Acceptance 7)
    const metadata = await this.extractMetadata(file.path, resolved.type);

    // Simpan metadata ke database (Acceptance 5, 6)
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
      },
    });
  }

  findAllForProject(projectId: string) {
    return this.prisma.media.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media tidak ditemukan');
    this.safeDelete(`.${media.path}`); // hapus file fisik juga
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
        return Promise.resolve({}); // gambar tetap tersimpan walau gagal baca dimensi
      }
    }

    // VIDEO & AUDIO: pakai ffprobe
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return resolve({}); // tetap simpan media walau metadata gagal diambil

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

  private safeDelete(path: string) {
    fs.unlink(path, () => { }); // abaikan error kalau file memang belum/tidak ada
  }
}
