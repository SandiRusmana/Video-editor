import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) { }

  // POST /media/upload?projectId=xxx  (Acceptance 8)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 }, // batas hard limit multer, validasi detail per-tipe ada di service
    }),
  )
  async upload(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('projectId') projectId: string,
  ) {
    if (!file) throw new BadRequestException('File tidak ditemukan pada request');
    if (!projectId) throw new BadRequestException('projectId wajib diisi');

    return this.mediaService.uploadAndSave(req.user.userId, projectId, file);
  }

  // GET /media?projectId=xxx  (Acceptance 9)
  @Get()
  findAll(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId wajib diisi');
    return this.mediaService.findAllForProject(projectId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}