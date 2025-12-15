import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ApprovalStatus } from '@prisma/client';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('stories/:storyId')
  @UseGuards(JwtAuthGuard)
  createStoryRequest(
    @Param('storyId') storyId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateApprovalRequestDto
  ) {
    return this.approvalsService.createRequest(user.id, storyId, null, createDto);
  }

  @Post('chapters/:chapterId')
  @UseGuards(JwtAuthGuard)
  createChapterRequest(
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateApprovalRequestDto
  ) {
    return this.approvalsService.createRequest(user.id, null, chapterId, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ApprovalStatus
  ) {
    return this.approvalsService.findAll(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      status
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyRequests(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.approvalsService.findMyRequests(
      user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined
    );
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewDto: ReviewApprovalDto
  ) {
    return this.approvalsService.review(id, user.id, reviewDto);
  }
}

