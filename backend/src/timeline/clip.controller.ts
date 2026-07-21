import { Body, Controller, Param, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import { SplitClipDto } from './dto/split-clip.dto';
import { TrimClipDto } from './dto/trim-clip.dto';

// Controller terpisah dari TimelineController karena route di sini tidak
// perlu projectId di URL — satu clipId sudah cukup untuk menentukan
// project pemiliknya lewat relasi clip -> track -> project.
@UseGuards(JwtAuthGuard)
@Controller('clips')
export class ClipController {
  constructor(private timelineService: TimelineService) {}

  // POST /clips/:id/split
  // Body: { atTime } — posisi playhead (detik) tempat clip akan dipotong.
  @Post(':id/split')
  splitClip(@Req() req, @Param('id') id: string, @Body() dto: SplitClipDto) {
    return this.timelineService.splitClip(req.user.userId, id, dto.atTime);
  }

  // PATCH /clips/:id/trim
  // Body: { inPoint, outPoint }
  @Patch(':id/trim')
  trimClip(@Req() req, @Param('id') id: string, @Body() dto: TrimClipDto) {
    return this.timelineService.trimClip(req.user.userId, id, dto);
  }
}
