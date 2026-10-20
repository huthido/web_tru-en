import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentsService, CommentSort } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AdminCommentQueryDto } from './dto/admin-comment-query.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

const parseSort = (sort?: string): CommentSort => (sort === 'top' ? 'top' : 'newest');

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get('stories/:storyId/count')
  async getStoryCommentCount(@Param('storyId') storyId: string) {
    const count = await this.commentsService.getCount(storyId, undefined);
    return { count };
  }

  @Public()
  @Get('chapters/:chapterId/count')
  async getChapterCommentCount(@Param('chapterId') chapterId: string) {
    const count = await this.commentsService.getCount(undefined, chapterId);
    return { count };
  }

  @Public()
  @Get('stories/:storyId')
  async getStoryComments(
    @Param('storyId') storyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @CurrentUser() user?: any
  ) {
    try {
      return await this.commentsService.findAll(
        storyId,
        undefined,
        page ? parseInt(page) : undefined,
        limit ? parseInt(limit) : undefined,
        parseSort(sort),
        user?.id
      );
    } catch (error) {
      console.error('Error in getStoryComments:', error);
      throw error;
    }
  }

  @Public()
  @Get('chapters/:chapterId')
  async getChapterComments(
    @Param('chapterId') chapterId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @CurrentUser() user?: any
  ) {
    return this.commentsService.findAll(
      undefined,
      chapterId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      parseSort(sort),
      user?.id
    );
  }

  @Public()
  @Get(':commentId')
  async getComment(@Param('commentId') commentId: string) {
    return this.commentsService.findOne(commentId);
  }

  @Post('stories/:storyId')
  @UseGuards(JwtAuthGuard)
  async createStoryComment(
    @Param('storyId') storyId: string,
    @CurrentUser() user: any,
    @Body() createCommentDto: CreateCommentDto
  ) {
    return this.commentsService.create(
      user.id,
      storyId,
      undefined,
      createCommentDto
    );
  }

  @Post('chapters/:chapterId')
  @UseGuards(JwtAuthGuard)
  async createChapterComment(
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: any,
    @Body() createCommentDto: CreateCommentDto
  ) {
    return this.commentsService.create(
      user.id,
      undefined,
      chapterId,
      createCommentDto
    );
  }

  // Thích / bỏ thích bình luận — idempotent, trả { liked, likeCount }.
  @Post(':commentId/like')
  @UseGuards(JwtAuthGuard)
  async likeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.like(commentId, user.id);
  }

  @Delete(':commentId/like')
  @UseGuards(JwtAuthGuard)
  async unlikeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.unlike(commentId, user.id);
  }

  @Post(':commentId/reply')
  @UseGuards(JwtAuthGuard)
  async replyToComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body() createCommentDto: CreateCommentDto
  ) {
    // Get parent comment to determine storyId/chapterId
    const parent = await this.commentsService.findOne(commentId);
    
    return this.commentsService.create(
      user.id,
      parent.storyId,
      parent.chapterId,
      {
        ...createCommentDto,
        parentId: commentId,
      }
    );
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body() updateCommentDto: UpdateCommentDto
  ) {
    return this.commentsService.update(
      commentId,
      user.id,
      user.role,
      updateCommentDto
    );
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any
  ) {
    await this.commentsService.delete(commentId, user.id, user.role);
    return {
      success: true,
      message: 'Comment đã được xóa',
      timestamp: new Date().toISOString(),
    };
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllComments(@Query() query: AdminCommentQueryDto) {
    return this.commentsService.getAllComments(query);
  }

  @Patch('admin/:commentId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async moderateComment(
    @Param('commentId') commentId: string,
    @Body() moderateDto: ModerateCommentDto
  ) {
    return this.commentsService.moderateComment(commentId, moderateDto.action);
  }
}

