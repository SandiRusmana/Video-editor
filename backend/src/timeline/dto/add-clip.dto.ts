import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TrackType } from '@prisma/client';

export class AddClipDto {
  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsEnum(TrackType)
  trackType?: TrackType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timelineStart?: number;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  duration?: number;

  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsString()
  fontColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  textPosition?: string;
}
