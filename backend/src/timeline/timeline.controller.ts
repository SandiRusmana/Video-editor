import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import { AddClipDto } from './dto/add-clip.dto';
import { CreateTrackDto } from './dto/create-track.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId')
export class TimelineController {
  constructor(private timelineService: TimelineService) { }

  // GET /projects/:projectId/timeline
  @Get('timeline')
  getTimeline(@Req() req, @Param('projectId') projectId: string) {
    return this.timelineService.getTimeline(req.user.userId, projectId);
  }

  // POST /projects/:projectId/tracks
  @Post('tracks')
  createTrack(@Req() req, @Param('projectId') projectId: string, @Body() dto: CreateTrackDto) {
    return this.timelineService.createTrack(req.user.userId, projectId, dto);
  }

  // DELETE /projects/:projectId/tracks/:trackId
  @Delete('tracks/:trackId')
  deleteTrack(@Req() req, @Param('projectId') projectId: string, @Param('trackId') trackId: string) {
    return this.timelineService.deleteTrack(req.user.userId, projectId, trackId);
  }

  // POST /projects/:projectId/timeline/clips
  @Post('timeline/clips')
  addClip(@Req() req, @Param('projectId') projectId: string, @Body() dto: AddClipDto) {
    return this.timelineService.addClip(req.user.userId, projectId, dto);
  }

  // PATCH /projects/:projectId/timeline/reorder
  @Patch('timeline/reorder')
  reorderClips(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: { clipIds: string[] },
  ) {
    return this.timelineService.reorderClips(req.user.userId, projectId, dto.clipIds);
  }

  // PATCH /projects/:projectId/timeline/move-clips
  @Patch('timeline/move-clips')
  updateClipsPositions(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: { updates: { id: string; trackId: string; timelineStart: number }[] },
  ) {
    return this.timelineService.updateClipsPositions(req.user.userId, projectId, dto.updates);
  }

  // DELETE /projects/:projectId/timeline/clips/:clipId
  @Delete('timeline/clips/:clipId')
  deleteClip(@Req() req, @Param('projectId') projectId: string, @Param('clipId') clipId: string) {
    return this.timelineService.deleteClip(req.user.userId, projectId, clipId);
  }

  // POST /projects/:projectId/timeline/transitions
  @Post('timeline/transitions')
  saveTransition(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: { leftClipId: string; rightClipId: string; type?: string; duration?: number },
  ) {
    return this.timelineService.saveTransition(req.user.userId, projectId, dto);
  }

  // PATCH /projects/:projectId/timeline/transitions/:transitionId
  @Patch('timeline/transitions/:transitionId')
  updateTransition(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('transitionId') transitionId: string,
    @Body() dto: { type?: string; duration?: number },
  ) {
    return this.timelineService.updateTransition(req.user.userId, projectId, transitionId, dto);
  }

  // DELETE /projects/:projectId/timeline/transitions/:transitionId
  @Delete('timeline/transitions/:transitionId')
  deleteTransition(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('transitionId') transitionId: string,
  ) {
    return this.timelineService.deleteTransition(req.user.userId, projectId, transitionId);
  }
}
