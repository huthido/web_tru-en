import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ReadingHistoryService } from '../reading-history/reading-history.service';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { ImageValidationPipe } from '../common/pipes/image-validation.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cloudinaryService: CloudinaryService,
    private readingHistoryService: ReadingHistoryService
  ) { }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  /**
   * Self-delete tài khoản (Apple §5.1.1(v) — bắt buộc cho App Store). Soft
   * delete + anonymise PII; xem `UsersService.deleteMyAccount`.
   */
  @Delete('me')
  async deleteMe(
    @CurrentUser() user: any,
    @Body() body: DeleteAccountDto,
  ) {
    await this.usersService.deleteMyAccount(user.id, body.password);
    return { success: true, message: 'Tài khoản đã được xoá.' };
  }

  @Post('me/avatar/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    })
  )
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile(new ImageValidationPipe({ maxSizeBytes: 1 * 1024 * 1024, maxWidth: 800 }))
    file: Express.Multer.File
  ) {
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'avatars');
    await this.usersService.updateProfile(user.id, { avatar: imageUrl });

    return {
      success: true,
      data: { avatar: imageUrl },
      message: 'Avatar uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me/stats')
  async getMyStats(@CurrentUser() user: any) {
    return this.usersService.getUserStats(user.id);
  }

  @Get('me/history')
  async getMyHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.readingHistoryService.getHistory(
      user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined
    );
  }

  @Get('me/continue-reading')
  async getMyContinueReading(
    @CurrentUser() user: any,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.readingHistoryService.getContinueReading(user.id, limitNum);
  }

  @Delete('me/history')
  async clearMyHistory(@CurrentUser() user: any) {
    return this.readingHistoryService.clearHistory(user.id);
  }

  /* ── Apple §1.2 — block user ─────────────────────────────────────────── */

  @Get('me/blocks')
  async listMyBlocks(@CurrentUser() user: any) {
    return this.usersService.listMyBlocks(user.id);
  }

  @Post(':userId/block')
  async blockUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.usersService.blockUser(user.id, userId);
  }

  @Delete(':userId/block')
  async unblockUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.usersService.unblockUser(user.id, userId);
  }

  // Public routes - must be after all 'me' routes to avoid route conflicts
  @Public()
  @Get(':id/public')
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Public()
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  // Admin endpoints
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      role,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUser(@Param('id') id: string, @Body() updateDto: AdminUpdateUserDto) {
    return this.usersService.updateUser(id, updateDto);
  }
}

