import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ExportResolution {
  HD_720P = '720p',
  FHD_1080P = '1080p',
}

export enum ExportFormat {
  MP4 = 'mp4',
}

export class CreateExportDto {
  @IsEnum(ExportResolution)
  @IsOptional()
  resolution?: ExportResolution = ExportResolution.FHD_1080P;

  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.MP4;
}
