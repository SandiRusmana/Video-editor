import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddClipDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timelineStart?: number;
}
