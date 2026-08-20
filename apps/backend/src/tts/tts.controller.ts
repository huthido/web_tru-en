import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TtsService } from './tts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('chapters')
export class TtsController {
    constructor(private readonly ttsService: TtsService) { }

    /** Trạng thái audio AI của chương — public để reader poll trong lúc chờ. */
    @Public()
    @Get(':id/tts')
    getStatus(@Param('id') id: string) {
        return this.ttsService.getStatus(id);
    }

    /**
     * Yêu cầu sinh audio AI. Cần đăng nhập (chống script ẩn danh spam job —
     * mỗi job chiếm CPU worker nhiều phút); audio sinh xong là public cho
     * mọi người nghe.
     */
    @Post(':id/tts')
    @UseGuards(JwtAuthGuard)
    request(@Param('id') id: string) {
        return this.ttsService.requestGeneration(id);
    }
}
