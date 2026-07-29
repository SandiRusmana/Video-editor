import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { TrackType } from '@prisma/client';

export class CreateTrackDto {
  @IsEnum(TrackType)
  type: TrackType;

  @IsOptional()
  @IsNumber()
  order?: number;
}
