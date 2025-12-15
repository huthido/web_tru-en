import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

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
}

