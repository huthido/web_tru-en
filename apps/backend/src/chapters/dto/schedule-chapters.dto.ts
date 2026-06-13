import { IsOptional, IsInt, IsISO8601, Min, Max, IsBoolean } from 'class-validator';

/**
 * Đặt lịch rải đều xuất bản các chương NHÁP của một truyện.
 * Gán scheduledPublishAt = startAt + index * intervalHours theo thứ tự `order`.
 */
export class ScheduleChaptersDto {
  /** Mốc giờ (ISO 8601, tuyệt đối/UTC) chương nháp đầu tiên sẽ lên. */
  @IsISO8601()
  startAt!: string;

  /** Khoảng cách giữa các chương, tính bằng giờ. Mặc định 24 (1 chương/ngày). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  intervalHours?: number;

  /** Số chương đăng mỗi đợt (cùng một mốc giờ). Mặc định 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  perBatch?: number;

  /** true = xoá lịch cũ rồi đặt lại từ đầu. Mặc định false (chỉ chương chưa có lịch). */
  @IsOptional()
  @IsBoolean()
  reset?: boolean;
}
