import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { ClipController } from './clip.controller';

@Module({
  controllers: [TimelineController, ClipController],
  providers: [TimelineService]
})
export class TimelineModule {}
