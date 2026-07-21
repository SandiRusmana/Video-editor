import { IsNumber, Min } from 'class-validator';

export class SplitClipDto {
  // Posisi playhead (dalam detik, absolut terhadap timeline project)
  // tempat clip akan dipotong menjadi dua.
  @IsNumber()
  @Min(0)
  atTime: number;
}
