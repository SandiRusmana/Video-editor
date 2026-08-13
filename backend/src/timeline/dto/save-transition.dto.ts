import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveTransitionDto {
  @IsString()
  @IsNotEmpty()
  leftClipId: string;

  @IsString()
  @IsNotEmpty()
  rightClipId: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  duration?: number;
}
