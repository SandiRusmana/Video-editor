import { IsNumber, IsOptional, Min } from 'class-validator';

export class TrimClipDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  inPoint?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  outPoint?: number;
  
  @IsNumber()
  @Min(0)
  @IsOptional()
  timelineStart?: number;
}
