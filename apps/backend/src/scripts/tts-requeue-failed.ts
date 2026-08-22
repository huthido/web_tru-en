/**
 * Xếp lại hàng đợi sinh giọng AI cho chương FAILED (và PROCESSING treo >60
 * phút do worker chết giữa job). Chương đã có audio/khoá phí bị bỏ qua.
 *
 * Cách chạy (trong container backend, KHÔNG cần đăng nhập):
 *   docker exec <backend> node dist/scripts/tts-requeue-failed.js            # xem trước
 *   docker exec <backend> node dist/scripts/tts-requeue-failed.js --apply    # xếp hàng thật
 *   ... --apply --limit 200                                                  # tối đa 200 chương
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { TtsService } from '../tts/tts.service';

async function main() {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const limitIdx = args.indexOf('--limit');
    const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 1000 : 1000;
    const logger = new Logger('tts-requeue-failed');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const tts = app.get(TtsService);
        if (!tts.enabled) {
            logger.error('TTS_WORKER_URL chưa cấu hình — không có worker để sinh.');
            return;
        }
        const preview = await tts.requeueFailed({ limit, dryRun: true });
        logger.log(
            `FAILED: ${preview.failed} chương, PROCESSING treo: ${preview.stale} chương (limit ${limit})`,
        );
        if (!apply) {
            logger.log('Chạy lại với --apply để xếp hàng.');
            return;
        }
        const result = await tts.requeueFailed({ limit });
        logger.log(`Đã xếp hàng ${result.queued} chương.`);
    } finally {
        await app.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
