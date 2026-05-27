// Backend mirror của packages/shared/src/monetization.ts. Inline để tránh
// rủi ro Nest runtime không resolve được path alias `@shared/*`. Nếu sửa
// ngưỡng phải đồng bộ cả 2 file.

export const MONETIZATION_THRESHOLDS = {
  MIN_TOTAL_VIEWS: 10_000,
  MIN_FOLLOWERS: 100,
  VIOLATION_WINDOW_DAYS: 90,
} as const;

export const ELIGIBILITY_REQUIRED_ERROR = 'ELIGIBILITY_REQUIRED';
/** @deprecated dùng ELIGIBILITY_REQUIRED_ERROR — alias giữ tạm cho code cũ. */
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
