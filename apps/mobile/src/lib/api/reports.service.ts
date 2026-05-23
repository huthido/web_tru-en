import { apiClient } from './client';

export type ReportTargetType = 'STORY' | 'CHAPTER' | 'COMMENT' | 'USER';

/** Mã lý do được backend chấp nhận (xem ugc-reports.service.ts ALLOWED_REASONS). */
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

/** Nhãn hiển thị cho từng lý do — dùng trong picker UI. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: 'SPAM', label: 'Spam / lừa đảo' },
    { value: 'ABUSE', label: 'Lăng mạ / quấy rối' },
    { value: 'SEXUAL', label: 'Nội dung khiêu dâm' },
    { value: 'HATE', label: 'Thù ghét / phân biệt' },
    { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
    { value: 'ILLEGAL', label: 'Vi phạm pháp luật' },
    { value: 'OTHER', label: 'Khác' },
];

export const ReportsApi = {
    async create(input: CreateReportInput): Promise<void> {
        await apiClient.post('/reports', input);
    },
};
