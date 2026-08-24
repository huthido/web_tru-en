import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TtsService } from './tts.service';
import { TtsProcessor } from './tts.processor';
import { TtsController, TtsStoryController, TtsVoiceController, AdminTtsController } from './tts.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';

/**
 * Giọng đọc AI cho chương truyện (VieNeu-TTS). Cần TTS_WORKER_URL trỏ tới
 * services/tts-worker; thiếu biến này thì endpoint trả 503 và frontend ẩn nút.
 */
@Module({
    imports: [ConfigModule, CloudinaryModule, SettingsModule, WalletModule],
    controllers: [TtsController, TtsStoryController, TtsVoiceController, AdminTtsController],
    providers: [TtsService, TtsProcessor],
    exports: [TtsService],
})
export class TtsModule { }
