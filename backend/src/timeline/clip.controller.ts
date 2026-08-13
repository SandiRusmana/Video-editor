import { Body, Controller, Param, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import { SplitClipDto } from './dto/split-clip.dto';
import { TrimClipDto } from './dto/trim-clip.dto';
import { UpdateClipDto } from './dto/update-clip.dto';

@UseGuards(JwtAuthGuard)
@Controller('clips')
export class ClipController {
  constructor(private timelineService: TimelineService) {}

  // PATCH /clips/:id — update general properties (trackId, timelineStart, text, transform, etc.)
  @Patch(':id')
  updateClip(@Req() req, @Param('id') id: string, @Body() dto: UpdateClipDto) {
    return this.timelineService.updateClip(req.user.userId, id, dto);
  }

  // POST /clips/:id/split
  @Post(':id/split')
  splitClip(@Req() req, @Param('id') id: string, @Body() dto: SplitClipDto) {
    return this.timelineService.splitClip(req.user.userId, id, dto.atTime);
  }

  // PATCH /clips/:id/trim
  @Patch(':id/trim')
  trimClip(@Req() req, @Param('id') id: string, @Body() dto: TrimClipDto) {
    return this.timelineService.trimClip(req.user.userId, id, dto);
  }

  // PATCH /clips/:id/rotate — update clip rotation metadata
  @Patch(':id/rotate')
  rotateClip(@Req() req, @Param('id') id: string, @Body() dto: { rotation: number }) {
    return this.timelineService.updateClip(req.user.userId, id, { rotation: dto.rotation });
  }

  // PATCH /clips/:id/crop — update clip crop metadata
  @Patch(':id/crop')
  cropClip(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { cropX?: number; cropY?: number; cropW?: number; cropH?: number },
  ) {
    return this.timelineService.updateClip(req.user.userId, id, dto);
  }

  // PATCH /clips/:id/scale — update clip scale/zoom metadata
  @Patch(':id/scale')
  scaleClip(@Req() req, @Param('id') id: string, @Body() dto: { scale: number }) {
    return this.timelineService.updateClip(req.user.userId, id, { scale: dto.scale });
  }

  // PATCH /clips/:id/position — update clip X & Y position metadata
  @Patch(':id/position')
  positionClip(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { x?: number; y?: number },
  ) {
    return this.timelineService.updateClip(req.user.userId, id, dto);
  }
}
