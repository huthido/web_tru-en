import { apiClient } from './client';

export type ReportTargetType = 'STORY' | 'CHAPTER' | 'COMMENT' | 'USER' | 'PAINTING';

/** Mã lý do backend chấp nhận (xem ALLOWED_REASONS trong ugc-reports.service.ts). */
export type ReportReason =
  | 'SPAM'
  | 'ABUSE'
  | 'SEXUAL'
  | 'HATE'
  | 'COPYRIGHT'
  | 'ILLEGAL'
  | 'OTHER';

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
}

/** Nhãn hiển thị — giữ khớp với apps/mobile/src/lib/api/reports.service.ts. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam / lừa đảo' },
  { value: 'ABUSE', label: 'Lăng mạ / quấy rối' },
  { value: 'SEXUAL', label: 'Nội dung khiêu dâm' },
  { value: 'HATE', label: 'Thù ghét / phân biệt' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
  { value: 'ILLEGAL', label: 'Vi phạm pháp luật' },
  { value: 'OTHER', label: 'Khác' },
];

export const reportsService = {
  create: async (input: CreateReportInput) => {
    const r = await apiClient.post('/reports', input);
    return r.data;
  },
};
