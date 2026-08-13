import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExportDto, ExportResolution } from './dto/create-export.dto';
import ffmpeg from 'fluent-ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs';

// Configure fluent-ffmpeg with bundled binaries
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private prisma: PrismaService) { }

  private resolveMediaPath(mediaPath: string): string | null {
    if (!mediaPath) return null;

    if (path.isAbsolute(mediaPath) && fs.existsSync(mediaPath)) {
      return mediaPath;
    }

    let cleanPath = mediaPath.replace(/^https?:\/\/[^\/]+/, '');
    cleanPath = cleanPath.replace(/^\//, '');

    const cwdPath = path.join(process.cwd(), cleanPath);
    if (fs.existsSync(cwdPath)) {
      return cwdPath;
    }

    const filename = path.basename(cleanPath);
    const uploadsPath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(uploadsPath)) {
      return uploadsPath;
    }

    return null;
  }

  async createExportJob(projectId: string, dto: CreateExportDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tracks: {
          include: {
            clips: {
              include: {
                media: true,
                leftTransitions: true,
                rightTransitions: true,
              },
            },
            transitions: true,
          },
          orderBy: { order: 'asc' },
        },
        transitions: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const exportJob = await this.prisma.exportJob.create({
      data: {
        projectId,
        status: 'QUEUED',
        progress: 0,
      },
    });

    // Run export in background asynchronously
    this.processExportJob(exportJob.id, project, dto).catch((err) => {
      this.logger.error(`Background export job ${exportJob.id} failed:`, err);
    });

    return {
      id: exportJob.id,
      projectId: exportJob.projectId,
      status: exportJob.status,
      progress: exportJob.progress,
      createdAt: exportJob.createdAt,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });

    if (!job) {
      throw new NotFoundException(`Export job with ID ${jobId} not found`);
    }

    let fileSize = 0;
    let fileName = `${job.project?.name || 'video'}.mp4`;
    let downloadUrl = job.outputPath ? `/uploads/exports/${path.basename(job.outputPath)}` : null;

    if (job.outputPath && fs.existsSync(job.outputPath)) {
      fileSize = fs.statSync(job.outputPath).size;
      fileName = path.basename(job.outputPath);
    }

    return {
      id: job.id,
      projectId: job.projectId,
      projectName: job.project?.name,
      status: job.status,
      progress: job.progress,
      outputPath: job.outputPath,
      downloadUrl,
      fileName,
      fileSize,
      errorMsg: job.errorMsg,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt,
    };
  }

  async getProjectExportHistory(projectId: string) {
    const jobs = await this.prisma.exportJob.findMany({
      where: { projectId },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => {
      let fileSize = 0;
      let fileName = `${job.project?.name || 'video'}.mp4`;
      let downloadUrl = job.outputPath ? `/uploads/exports/${path.basename(job.outputPath)}` : null;

      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fileSize = fs.statSync(job.outputPath).size;
        fileName = path.basename(job.outputPath);
      }

      return {
        id: job.id,
        projectId: job.projectId,
        projectName: job.project?.name,
        status: job.status,
        progress: job.progress,
        outputPath: job.outputPath,
        downloadUrl,
        fileName,
        fileSize,
        errorMsg: job.errorMsg,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
      };
    });
  }

  private async processExportJob(jobId: string, project: any, dto: CreateExportDto) {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', progress: 5 },
    });

    const is1080p = dto.resolution === ExportResolution.FHD_1080P;
    const outWidth = is1080p ? 1920 : 1280;
    const outHeight = is1080p ? 1080 : 720;
    const fps = project.fps || 30;

    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const sanitizedProjectName = (project.name || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
    const outputFilename = `${sanitizedProjectName}_${Date.now()}.${dto.format || 'mp4'}`;
    const outputPath = path.join(exportsDir, outputFilename);

    const allClips = project.tracks.flatMap((t: any) =>
      t.clips.map((c: any) => ({
        ...c,
        trackType: t.type,
        trackOrder: t.order,
      }))
    );

    // Collect all transitions defined in project or tracks
    const allTransitions = [
      ...(project.transitions || []),
      ...project.tracks.flatMap((t: any) => t.transitions || []),
    ];

    // Probe media files to detect which clips actually have an audio stream
    const mediaHasAudioMap: { [mediaId: string]: boolean } = {};
    await Promise.all(
      allClips.map(async (clip: any) => {
        if (clip.media?.path && clip.media?.id) {
          const resolved = this.resolveMediaPath(clip.media.path);
          if (resolved && fs.existsSync(resolved)) {
            return new Promise<void>((res) => {
              ffmpeg.ffprobe(resolved, (err, metadata) => {
                if (!err && metadata && metadata.streams) {
                  const hasAudio = metadata.streams.some((s) => s.codec_type === 'audio');
                  mediaHasAudioMap[clip.media.id] = hasAudio;
                } else {
                  mediaHasAudioMap[clip.media.id] = false;
                }
                res();
              });
            });
          }
        }
      })
    );

    // CRITICAL: Sort video clips chronologically by timelineStart to prevent index 0 mismatch
    const videoClips = allClips
      .filter(
        (c: any) =>
          (String(c.trackType).toUpperCase() === 'VIDEO' ||
            String(c.media?.type).toUpperCase() === 'VIDEO' ||
            String(c.media?.type).toUpperCase() === 'IMAGE') &&
          !c.textContent
      )
      .sort((a: any, b: any) => (a.timelineStart || 0) - (b.timelineStart || 0));

    // Check if project has dedicated clips on AUDIO track
    const dedicatedAudioClips = allClips.filter(
      (c: any) =>
        (String(c.trackType).toUpperCase() === 'AUDIO' || String(c.media?.type).toUpperCase() === 'AUDIO') &&
        c.muted !== true &&
        (c.volume == null || c.volume > 0) &&
        !c.textContent
    );

    const hasDedicatedAudioClips = dedicatedAudioClips.length > 0;

    const audioBearingClips = allClips.filter((c: any) => {
      if (!c.media || mediaHasAudioMap[c.media.id] !== true || c.muted === true || c.volume === 0 || !!c.textContent) {
        return false;
      }

      const isAudioTrackClip = String(c.trackType).toUpperCase() === 'AUDIO' || String(c.media?.type).toUpperCase() === 'AUDIO';

      // Exactly matching CanvasPreview.jsx: if dedicated audio clips exist on Audio track, mute Video track clip audio
      if (!isAudioTrackClip && hasDedicatedAudioClips) {
        return false;
      }

      return true;
    });

    const textClips = allClips
      .filter((c: any) => String(c.trackType).toUpperCase() === 'TEXT' || !!c.textContent)
      .sort((a: any, b: any) => (a.timelineStart || 0) - (b.timelineStart || 0));

    // Compute total project duration
    let totalDuration = allClips.reduce((max: number, c: any) => {
      const dur = (c.outPoint || 0) > (c.inPoint || 0) ? c.outPoint - c.inPoint : c.media?.duration || 5;
      return Math.max(max, (c.timelineStart || 0) + dur);
    }, 5);

    totalDuration = Math.max(2, Math.min(3600, totalDuration));

    this.logger.log(`Starting FFmpeg Export for "${project.name}" (${jobId}), Duration: ${totalDuration}s, Video Clips: ${videoClips.length}, Audio Clips: ${audioBearingClips.length}, Transitions: ${allTransitions.length}`);

    return new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      // Input 0: Virtual Color Canvas
      command
        .input(`color=c=black:s=${outWidth}x${outHeight}:r=${fps}:d=${totalDuration}`)
        .inputOptions(['-f', 'lavfi']);

      // Input 1: Virtual Silent Audio Track
      command
        .input(`anullsrc=channel_layout=stereo:sample_rate=44100`)
        .inputOptions(['-f', 'lavfi', `-t`, `${totalDuration}`]);

      const inputIndices: { [clipId: string]: number } = {};
      let inputCounter = 2;

      // Deduplicate media inputs by clip ID
      for (const clip of allClips) {
        if (clip.media?.path && inputIndices[clip.id] === undefined) {
          const rawPath = clip.media.path;
          const resolvedPath = this.resolveMediaPath(rawPath);

          if (resolvedPath) {
            const isImage = String(clip.media?.type).toUpperCase() === 'IMAGE';
            const dur = Math.max(0.5, (clip.outPoint || 0) > (clip.inPoint || 0) ? clip.outPoint - clip.inPoint : clip.media?.duration || 5);
            const inPt = clip.inPoint || 0;

            if (isImage) {
              command.input(resolvedPath).inputOptions(['-loop', '1', '-t', `${dur}`]);
            } else {
              command.input(resolvedPath).inputOptions([`-ss`, `${inPt}`, `-t`, `${dur}`]);
            }
            inputIndices[clip.id] = inputCounter++;
          }
        }
      }

      const filterGraph: string[] = [];
      let baseVideoLabel = 'v0';
      filterGraph.push(`[0:v]settb=AVTB[${baseVideoLabel}]`);

      let currentBase = baseVideoLabel;
      let clipIdx = 0;

      // Render Video Streams dengan Perbaikan Transisi Wipe Tepat di Sambungan Klip
      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        const inputIdx = inputIndices[clip.id];
        if (inputIdx === undefined) continue;

        const dur = Math.max(0.5, (clip.outPoint || 0) > (clip.inPoint || 0) ? clip.outPoint - clip.inPoint : clip.media?.duration || 5);
        const tStart = clip.timelineStart || 0;
        const tEnd = tStart + dur;

        // Cari transisi khusus antara klip sebelumnya dan klip saat ini
        const prevClip = i > 0 ? videoClips[i - 1] : null;
        const transition = i > 0 ? (
          allTransitions.find((t: any) =>
            (t.leftClipId === prevClip?.id && t.rightClipId === clip.id) ||
            t.rightClipId === clip.id ||
            t.leftClipId === prevClip?.id
          ) ||
          clip.leftTransitions?.[0] ||
          prevClip?.rightTransitions?.[0]
        ) : null;

        const duration = Math.min(1.0, dur / 2);
        const transType = (transition?.type || clip.transitionIn || 'Wipe').toLowerCase();
        const isWipe = transType.includes('wipe') || transType.includes('usap');
        const isDissolve = transType.includes('dissolve') || transType.includes('peleburan');
        const isFade = transType.includes('fade') || transType.includes('pudar');

        // Waktu Mulai & Selesai Animasi Transisi Tepat di Titik Potong
        const transStart = tStart;
        const transEnd = tStart + duration;

        let filters = `scale=${outWidth}:${outHeight}:force_original_aspect_ratio=decrease,pad=${outWidth}:${outHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}`;

        // Efek Pudar Mulus untuk Dissolve & Fade
        if (i > 0 && (isDissolve || isFade)) {
          filters += `,fade=t=in:st=0:d=${duration}`;
        }

        // Kunci titik mulai klip di timeline
        filters += `,setpts=PTS-STARTPTS+${tStart}/TB`;

        const vLabel = `vclip_${clipIdx}`;
        filterGraph.push(`[${inputIdx}:v]${filters}[${vLabel}]`);

        // PERBAIKAN UTAMA: Ekspresi Wipe & Overlay Transisi
        let overlayExpr = 'x=0:y=0';

        if (i > 0 && isWipe) {
          // Gambar masuk dari kiri ke kanan (-w ke 0) HANYA saat rentang transisi
          // Setelah transisi selesai, posisi x dikunci di 0
          overlayExpr = `x='if(gte(t,${transEnd}),0,if(gte(t,${transStart}),-w+(t-${transStart})*w/${duration},-w))':y=0`;
        }

        const nextBase = `v_ov_${clipIdx}`;
        filterGraph.push(
          `[${currentBase}][${vLabel}]overlay=${overlayExpr}:enable='between(t,${tStart},${tEnd})'[${nextBase}]`
        );

        currentBase = nextBase;
        clipIdx++;
      }

      // Render Text Overlays
      for (let tIdx = 0; tIdx < textClips.length; tIdx++) {
        const tClip = textClips[tIdx];
        const textStr = (tClip.textContent || tClip.name || 'Text')
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/:/g, '\\:');

        const tStart = tClip.timelineStart || 0;
        const dur = (tClip.outPoint || 0) > (tClip.inPoint || 0) ? tClip.outPoint - tClip.inPoint : 5;
        const tEnd = tStart + dur;
        const rawFontSize = tClip.fontSize || 36;
        const scaledFontSize = Math.max(24, Math.round(rawFontSize * (outHeight / 400)));
        const fontColor = tClip.fontColor || 'white';

        const nextBase = `v_txt_${tIdx}`;
        filterGraph.push(
          `[${currentBase}]drawtext=text='${textStr}':fontcolor=${fontColor}:fontsize=${scaledFontSize}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${tStart},${tEnd})'[${nextBase}]`
        );
        currentBase = nextBase;
      }

      // Render & Mix Audio Streams
      const realAudioLabels: string[] = [];
      let aIdx = 0;

      for (const clip of audioBearingClips) {
        const inputIdx = inputIndices[clip.id];
        if (inputIdx === undefined) continue;

        if (clip.muted === true || clip.volume === 0) {
          continue;
        }

        const dur = Math.max(0.5, (clip.outPoint || 0) > (clip.inPoint || 0) ? clip.outPoint - clip.inPoint : clip.media?.duration || 5);
        const tStart = clip.timelineStart || 0;
        const vol = clip.volume ?? 1;
        const delayMs = Math.round(tStart * 1000);

        const aLabel = `aclip_${aIdx}`;
        // Note: input has already been trimmed by -ss inPt -t dur at input level, so atrim is 0 to dur
        let audioPrep = `[${inputIdx}:a]atrim=0:${dur},asetpts=PTS-STARTPTS,volume=${vol}`;
        if (delayMs > 0) {
          audioPrep += `,adelay=${delayMs}|${delayMs}`;
        }
        audioPrep += `[${aLabel}]`;

        filterGraph.push(audioPrep);
        realAudioLabels.push(`[${aLabel}]`);
        aIdx++;
      }

      let finalAudioLabel = '1:a';
      if (realAudioLabels.length === 1) {
        finalAudioLabel = 'aclip_0';
      } else if (realAudioLabels.length > 1) {
        finalAudioLabel = 'aout';
        filterGraph.push(
          `${realAudioLabels.join('')}amix=inputs=${realAudioLabels.length}:duration=first:dropout_transition=2:normalize=0[${finalAudioLabel}]`
        );
      }

      command.complexFilter(filterGraph, [currentBase, finalAudioLabel]);

      command.outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-preset ultrafast',
        `-t ${totalDuration}`,
      ]);

      command.output(outputPath);

      command.on('start', (cmdLine) => {
        this.logger.log(`FFmpeg Command Executing: ${cmdLine}`);
      });

      command.on('progress', async (prog) => {
        let currentSec = 0;
        if (prog && prog.timemark) {
          const parts = prog.timemark.split(':');
          if (parts.length === 3) {
            currentSec = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          }
        }
        if (prog && prog.percent != null && !isNaN(prog.percent)) {
          currentSec = (prog.percent / 100) * totalDuration;
        }

        const calculatedProgress = Math.min(98, Math.max(5, Math.floor((currentSec / totalDuration) * 100)));
        await this.prisma.exportJob.update({
          where: { id: jobId },
          data: { progress: calculatedProgress },
        }).catch(() => null);
      });

      command.on('end', async () => {
        this.logger.log(`Export job ${jobId} completed successfully! Saved to ${outputPath}`);
        await this.prisma.exportJob.update({
          where: { id: jobId },
          data: {
            status: 'DONE',
            progress: 100,
            outputPath,
            finishedAt: new Date(),
          },
        });
        resolve();
      });

      command.on('error', async (err, stdout, stderr) => {
        this.logger.error(`Export job ${jobId} failed with FFmpeg error: ${err.message}`);
        if (stderr) {
          this.logger.error(`FFmpeg Stderr: ${stderr}`);
        }
        await this.prisma.exportJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMsg: err.message || 'FFmpeg rendering failed',
          },
        });
        reject(err);
      });

      command.run();
    });
  }
}
