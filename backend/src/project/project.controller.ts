import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private projectService: ProjectService) { }

  @Post()
  create(@Req() req, @Body() dto: CreateProjectDto) {
    return this.projectService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.projectService.findAllForUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.projectService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.projectService.remove(req.user.userId, id);
  }
}