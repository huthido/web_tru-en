import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HomepageSectionsService } from './homepage-sections.service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { ReorderHomepageSectionsDto } from './dto/reorder-homepage-sections.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@Controller('homepage-sections')
export class HomepageSectionsController {
  constructor(private readonly service: HomepageSectionsService) {}

  /** Public: chỉ trả về các sections đang active (dùng cho homepage). */
  @Public()
  @Get()
  findActive() {
    return this.service.findActive();
  }

  /** Admin: lấy tất cả sections (kể cả inactive). */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  /** Admin: seed defaults. */
  @Post('admin/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  seedDefaults() {
    return this.service.seedDefaults();
  }

  /** Admin: sắp xếp lại thứ tự. */
  @Post('admin/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reorder(@Body() dto: ReorderHomepageSectionsDto) {
    return this.service.reorder(dto);
  }

  /** Admin: tạo section mới. */
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateHomepageSectionDto) {
    return this.service.create(dto);
  }

  /** Admin: cập nhật section. */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateHomepageSectionDto) {
    return this.service.update(id, dto);
  }

  /** Admin: xoá section. */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
