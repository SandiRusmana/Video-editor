import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import { AddClipDto } from './dto/add-clip.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/timeline')
export class TimelineController {
  constructor(private timelineService: TimelineService) { }

  // GET /projects/:projectId/timeline
  @Get()
  getTimeline(@Req() req, @Param('projectId') projectId: string) {
    return this.timelineService.getTimeline(req.user.userId, projectId);
  }

  // POST /projects/:projectId/timeline/clips
  // Body: { mediaId, timelineStart? } — timelineStart opsional, dikirim
  // saat user melakukan drag & drop ke posisi tertentu (Story 8).
  @Post('clips')
  addClip(@Req() req, @Param('projectId') projectId: string, @Body() dto: AddClipDto) {
    return this.timelineService.addClip(req.user.userId, projectId, dto.mediaId, dto.timelineStart);
  }

  // PATCH /projects/:projectId/timeline/reorder
  @Patch('reorder')
  reorderClips(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: { clipIds: string[] },
  ) {
    return this.timelineService.reorderClips(req.user.userId, projectId, dto.clipIds);
  }

  // DELETE /projects/:projectId/timeline/clips/:clipId
  @Delete('clips/:clipId')
  deleteClip(@Req() req, @Param('projectId') projectId: string, @Param('clipId') clipId: string) {
    return this.timelineService.deleteClip(req.user.userId, projectId, clipId);
  }
}
