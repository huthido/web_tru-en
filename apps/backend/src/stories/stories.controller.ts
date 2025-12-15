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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryQueryDto } from './dto/story-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('stories')
export class StoriesController {
    constructor(
        private readonly storiesService: StoriesService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    @Public()
    @Get()
    findAll(@Query() query: StoryQueryDto, @CurrentUser() user?: any) {
        return this.storiesService.findAll(query, user?.id);
    }

    @Public()
    @Get('homepage/newest')
    async getNewest(@Query('limit') limit?: number) {
        const limitNum = limit ? parseInt(limit.toString(), 10) : 15;
        return this.storiesService.getNewest(Math.min(limitNum, 20));
    }

    @Public()
    @Get('homepage/best-of-month')
    async getBestOfMonth(@Query('limit') limit?: number) {
        const limitNum = limit ? parseInt(limit.toString(), 10) : 15;
        return this.storiesService.getBestOfMonth(Math.min(limitNum, 20));
    }

    @Public()
    @Get('homepage/recommended')
    async getRecommended(@Query('limit') limit?: number) {
        const limitNum = limit ? parseInt(limit.toString(), 10) : 15;
        return this.storiesService.getRecommended(Math.min(limitNum, 20));
    }

    @Public()
    @Get('homepage/top-rated')
    async getTopRated(@Query('limit') limit?: number) {
        const limitNum = limit ? parseInt(limit.toString(), 10) : 15;
        return this.storiesService.getTopRated(Math.min(limitNum, 20));
    }

    @Public()
    @Get('homepage/most-liked')
    async getMostLiked(@Query('limit') limit?: number) {
        const limitNum = limit ? parseInt(limit.toString(), 10) : 15;
        return this.storiesService.getMostLiked(Math.min(limitNum, 20));
    }

    @Public()
    @Get(':slug')
    async findOne(@Param('slug') slug: string, @CurrentUser() user?: any) {
        const story = await this.storiesService.findOne(slug, user?.id);
        // Increment view count (async, don't wait)
        this.storiesService.incrementViewCount(slug).catch(() => { });
        return story;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@CurrentUser() user: any, @Body() createStoryDto: CreateStoryDto) {
        return this.storiesService.create(user.id, user.role, createStoryDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() updateStoryDto: UpdateStoryDto
    ) {
        return this.storiesService.update(id, user.id, user.role, updateStoryDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.storiesService.remove(id, user.id, user.role);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard)
    publish(@Param('id') id: string, @CurrentUser() user: any) {
        return this.storiesService.publish(id, user.id);
    }

    @Get('me/list')
    @UseGuards(JwtAuthGuard)
    findMyStories(@CurrentUser() user: any, @Query() query: StoryQueryDto) {
        return this.storiesService.findMyStories(user.id, query);
    }

    @Post('upload-cover')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
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
    async uploadCover(@UploadedFile() file: Express.Multer.File | undefined) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const imageUrl = await this.cloudinaryService.uploadImage(file, 'story-covers');

        return {
            success: true,
            data: { coverImage: imageUrl },
            message: 'Cover image uploaded successfully',
            timestamp: new Date().toISOString(),
        };
    }
}

