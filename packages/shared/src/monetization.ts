/// Điều kiện bật kiếm tiền — chia sẻ giữa backend, frontend và mobile.
/// Mọi nơi check eligibility phải đọc ngưỡng từ đây, không hard-code lại.

export const MONETIZATION_THRESHOLDS = {
  MIN_TOTAL_VIEWS: 10_000,
  MIN_FOLLOWERS: 100,
  VIOLATION_WINDOW_DAYS: 90,
} as const;

/**
 * Error code khi backend từ chối hành động cần tính năng nâng cao
 * (tạo paid chapter / VIP story / bật ad revenue share / …).
 *
 * Lưu ý: KHÔNG dùng cho donate / mua chương / mua truyện — các luồng
 * "nhận coin" cơ bản này mở tự do cho mọi tác giả.
 *
 * Giữ alias `AUTHOR_NOT_MONETIZED_ERROR` cho tương thích ngược tạm thời.
 */
export const ELIGIBILITY_REQUIRED_ERROR = 'ELIGIBILITY_REQUIRED';
export const AUTHOR_NOT_MONETIZED_ERROR = ELIGIBILITY_REQUIRED_ERROR;

export interface MonetizationEligibilityCriteria {
  totalViews: boolean;
  followers: boolean;
  accountOk: boolean;
  contentOk: boolean;
}

export interface MonetizationEligibilityProgress {
  totalViews: { current: number; required: number };
  followers: { current: number; required: number };
}

export interface MonetizationEligibility {
  eligible: boolean;
  criteria: MonetizationEligibilityCriteria;
  progress: MonetizationEligibilityProgress;
  reasons?: {
    accountOk?: string;
    contentOk?: string;
  };
}
