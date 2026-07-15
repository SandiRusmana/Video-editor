import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import { AddClipDto } from './dto/add-clip.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/timeline')
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  // GET /projects/:projectId/timeline
  // Dipanggil saat editor dibuka — memuat seluruh track & clip yang
  // tersimpan, supaya timeline "tetap sama ketika project dibuka kembali"
  // (Acceptance 12).
  @Get()
  getTimeline(@Req() req, @Param('projectId') projectId: string) {
    return this.timelineService.getTimeline(req.user.userId, projectId);
  }

  // POST /projects/:projectId/timeline/clips
  // Menambahkan media dari Media Library ke timeline sebagai clip baru.
  @Post('clips')
  addClip(@Req() req, @Param('projectId') projectId: string, @Body() dto: AddClipDto) {
    return this.timelineService.addClip(req.user.userId, projectId, dto.mediaId);
  }
}
