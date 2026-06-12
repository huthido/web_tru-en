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
import { BugPlatform, BugReportStatus, BugSeverity, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto } from './dto/create-bug-report.dto';
import { UpdateBugReportDto } from './dto/update-bug-report.dto';

/** Người dùng báo bug từ web/mobile. */
@Controller('bug-reports')
@UseGuards(JwtAuthGuard)
export class BugReportsController {
  constructor(private readonly service: BugReportsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBugReportDto) {
    return this.service.create(user.id, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: any) {
    return this.service.listMine(user.id);
  }
}

/** Admin xem + xử lý bug. */
@Controller('admin/bug-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminBugReportsController {
  constructor(private readonly service: BugReportsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BugReportStatus,
    @Query('platform') platform?: BugPlatform,
    @Query('severity') severity?: BugSeverity,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      platform,
      severity,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBugReportDto) {
    return this.service.update(id, dto);
  }
}

/**
 * AI agent đọc/cập nhật bug qua API key (header `x-api-key` = AGENT_API_KEY).
 * @Public() để JWT global guard bỏ qua; ApiKeyGuard mới là lớp xác thực.
 * Dùng bởi MCP server tools/mcp-bug-reports.
 */
@Controller('agent/bug-reports')
@Public()
@UseGuards(ApiKeyGuard)
export class AgentBugReportsController {
  constructor(private readonly service: BugReportsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BugReportStatus,
    @Query('platform') platform?: BugPlatform,
    @Query('severity') severity?: BugSeverity,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      platform,
      severity,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBugReportDto) {
    return this.service.update(id, dto);
  }
}
