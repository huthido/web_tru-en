import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UgcReportStatus, UgcReportTargetType, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UgcReportsService } from './ugc-reports.service';

/** Báo cáo UGC từ người dùng (Apple §1.2). */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class UgcReportsController {
  constructor(private readonly service: UgcReportsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.service.create(user.id, dto);
  }
}

/** Admin xem + xử lý báo cáo. */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUgcReportsController {
  constructor(private readonly service: UgcReportsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: UgcReportStatus,
    @Query('targetType') targetType?: UgcReportTargetType,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      targetType,
    });
  }

  @Patch(':id')
  resolve(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.service.resolve(id, admin.id, dto.status);
  }
}
