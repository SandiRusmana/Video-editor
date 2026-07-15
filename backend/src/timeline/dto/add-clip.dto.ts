import { IsNotEmpty, IsString } from 'class-validator';

// Story 7: user cukup pilih media dari Media Library untuk ditambahkan
// ke timeline — posisi (timelineStart) dihitung otomatis oleh backend
// berdasarkan urutan penambahan, bukan diinput manual oleh user.
export class AddClipDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;
}
