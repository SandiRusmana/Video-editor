import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/export')
  async createExport(
    @Param('projectId') projectId: string,
    @Body() dto: CreateExportDto,
    @Request() req: any,
  ) {
    return this.exportService.createExportJob(projectId, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/export/:jobId/status')
  async getExportStatus(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/export/history')
  async getExportHistory(@Param('projectId') projectId: string) {
    return this.exportService.getProjectExportHistory(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export-history')
  async getUserExportHistory(@Request() req: any) {
    return this.exportService.getUserExportHistory(req.user.userId || req.user.id);
  }

  @Get('export/download/:jobId')
  async downloadFile(@Param('jobId') jobId: string, @Res() res: Response) {
    const jobInfo = await this.exportService.getJobStatus(jobId);

    if (!jobInfo.outputPath || !fs.existsSync(jobInfo.outputPath)) {
      throw new NotFoundException('Exported video file not found or rendering failed');
    }

    const cleanProjectName = (jobInfo.projectName || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
    const downloadFileName = `${cleanProjectName}.mp4`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('Content-Type', 'video/mp4');

    const fileStream = fs.createReadStream(jobInfo.outputPath);
    fileStream.pipe(res);
  }
}
