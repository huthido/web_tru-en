import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TtsService } from './tts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { audioMulterFilter } from '../common/audio/multer-filter';

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
     * mọi người nghe. Tác giả truyện/admin còn được sinh LẠI audio đã có
     * (sau khi đổi mẫu giọng).
     */
    @Post(':id/tts')
    @UseGuards(JwtAuthGuard)
    request(@Param('id') id: string, @CurrentUser() user: any) {
        return this.ttsService.requestGeneration(id, { id: user.id, role: user.role });
    }
}

/**
 * Mẫu giọng đọc của tác giả (voice cloning VieNeu-TTS): tải clip 3–10s,
 * audio AI của các chương thuộc truyện của họ sẽ đọc bằng giọng này.
 */
@Controller('tts/voice')
@UseGuards(JwtAuthGuard)
export class TtsVoiceController {
    constructor(private readonly ttsService: TtsService) { }

    @Get()
    getMyVoice(@CurrentUser() user: any) {
        return this.ttsService.getVoice(user.id);
    }

    /** Danh sách giọng preset của model để tác giả chọn. */
    @Public()
    @Get('list')
    listVoices() {
        return this.ttsService.listVoices();
    }

    /** Chọn giọng preset (voice = id từ /tts/voice/list; null = mặc định). */
    @Post('preset')
    setPreset(@CurrentUser() user: any, @Body() body: { voice?: string | null }) {
        return this.ttsService.setPreset(user.id, body?.voice ?? null);
    }

    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            // Clip 3–10 giây — 10MB là dư cho mọi định dạng phổ biến.
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: audioMulterFilter,
        }),
    )
    uploadVoice(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
        if (!file) {
            throw new BadRequestException('Không nhận được file audio');
        }
        return this.ttsService.setVoice(user.id, file);
    }

    @Delete()
    deleteVoice(@CurrentUser() user: any) {
        return this.ttsService.deleteVoice(user.id);
    }

    /**
     * Nghe thử giọng với câu ngắn (≤300 ký tự). Trả audio base64.
     * body.voice = nghe thử preset bất kỳ; bỏ trống = giọng đã cài của user.
     */
    @Post('preview')
    preview(@CurrentUser() user: any, @Body() body: { text?: string; voice?: string }) {
        return this.ttsService.previewVoice(user.id, body?.text, body?.voice);
    }
}
