import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TrackType } from '@prisma/client';

export class CreateTrackDto {
  @IsEnum(TrackType)
  type: TrackType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
