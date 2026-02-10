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
    UseInterceptors,
    UploadedFile,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('stories/:storySlug/chapters')
export class ChaptersController {
    constructor(
        private readonly chaptersService: ChaptersService,
        private readonly prisma: PrismaService
    ) { }

    @Public()
    @Get()
    async findAll(@Param('storySlug') storySlug: string, @CurrentUser() user?: any) {
        // First find story by slug to get ID
        const story = await this.prisma.story.findUnique({
            where: { slug: storySlug },
            select: {
                id: true,
                authorId: true,
            },
        });
        if (!story) {
            throw new NotFoundException('Truyện không tồn tại');
        }
        // For story authors, include unpublished chapters
        const includeUnpublished = user && (story.authorId === user.id || user.role === UserRole.ADMIN);
        return this.chaptersService.findAll(story.id, includeUnpublished);
    }

    @Public()
    @Get(':chapterSlug')
    async findOne(
        @Param('storySlug') storySlug: string,
        @Param('chapterSlug') chapterSlug: string,
        @CurrentUser() user?: any
    ) {
        const chapter = await this.chaptersService.findOne(
            storySlug,
            chapterSlug,
            user?.id
        );
        // Increment view count (async, don't wait)
        this.chaptersService
            .incrementViewCount(storySlug, chapterSlug)
            .catch(() => { });
        return chapter;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Param('storySlug') storySlug: string,
        @CurrentUser() user: any,
        @Body() createChapterDto: CreateChapterDto
    ) {
        // Service will handle slug lookup
        return this.chaptersService.create(storySlug, user.id, createChapterDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() updateChapterDto: UpdateChapterDto
    ) {
        return this.chaptersService.update(id, user.id, user.role, updateChapterDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.chaptersService.remove(id, user.id, user.role);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard)
    publish(@Param('id') id: string, @CurrentUser() user: any) {
        return this.chaptersService.publish(id, user.id);
    }

    @Post(':id/unpublish')
    @UseGuards(JwtAuthGuard)
    unpublish(@Param('id') id: string, @CurrentUser() user: any) {
        return this.chaptersService.unpublish(id, user.id);
    }

    @Post(':id/buy')
    @UseGuards(JwtAuthGuard)
    buy(@Param('id') id: string, @CurrentUser() user: any) {
        return this.chaptersService.buyChapter(user.id, id);
    }
}

@Controller('admin/chapters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChaptersController {
    constructor(private readonly chaptersService: ChaptersService) { }

    @Get()
    async getAllChapters(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('storyId') storyId?: string,
        @Query('isPublished') isPublished?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc'
    ) {
        return this.chaptersService.findAllForAdmin({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            search,
            storyId,
            isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
            sortBy: sortBy as any,
            sortOrder: sortOrder || 'desc',
        });
    }

    @Get('stats')
    async getChaptersStats() {
        return this.chaptersService.getChaptersStats();
    }

    @Get('chart-data')
    async getChaptersChartData(@Query('days') days?: string) {
        return this.chaptersService.getChaptersChartData(days ? parseInt(days) : 30);
    }
}

@Controller('chapters')
export class ChapterUploadController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    @Post('upload-image')
    @UseGuards(JwtAuthGuard)
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
    async uploadImage(
        @UploadedFile() file: Express.Multer.File | undefined,
        @CurrentUser() user: any,
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const imageUrl = await this.cloudinaryService.uploadImage(file, 'chapter-images', user.id);

        return {
            success: true,
            data: { url: imageUrl },
            message: 'Image uploaded successfully',
            timestamp: new Date().toISOString(),
        };
    }

    @Get('my-images')
    @UseGuards(JwtAuthGuard)
    async getMyImages(
        @CurrentUser() user: any,
        @Query('folder') folder?: string,
    ) {
        const images = await this.cloudinaryService.getUserImages(user.id, folder || 'chapter-images');
        return {
            success: true,
            data: images,
        };
    }

    @Delete('images/:id')
    @UseGuards(JwtAuthGuard)
    async deleteImage(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        await this.cloudinaryService.deleteUserImage(user.id, id);
        return {
            success: true,
            message: 'Image deleted successfully',
        };
    }
}

