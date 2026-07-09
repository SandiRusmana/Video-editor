import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() supaya PrismaService bisa dipakai di module manapun
// tanpa perlu import PrismaModule berulang-ulang di setiap module.
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }