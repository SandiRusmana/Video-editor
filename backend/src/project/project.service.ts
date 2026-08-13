import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) { }

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { ...dto, ownerId: userId },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.ownerId !== userId) throw new ForbiddenException('Bukan pemilik project ini');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(userId, id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async autoSave(userId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(userId, id);
    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
    return {
      message: 'Project auto-saved successfully',
      updatedAt: updatedProject.updatedAt,
      project: updatedProject,
    };
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.project.delete({ where: { id } });
  }
}