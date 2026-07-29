import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateClipDto {
  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timelineStart?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outPoint?: number;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsNumber()
  scale?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsNumber()
  opacity?: number;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsString()
  fontColor?: string;

  @IsOptional()
  @IsString()
  filter?: string;

  @IsOptional()
  @IsString()
  transitionIn?: string;

  @IsOptional()
  @IsString()
  transitionOut?: string;
}
