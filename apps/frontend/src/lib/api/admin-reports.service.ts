import { apiClient } from './client';
import { ReportReason, ReportTargetType } from './reports.service';

export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

/** Nội dung bị báo cáo, backend giải nghĩa sẵn từ targetType + targetId. */
export interface ReportTarget {
  label: string;
  url: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  deleted?: boolean;
}

export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason | string;
  note?: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  target: ReportTarget;
  reporter: { id: string; username: string; displayName?: string | null };
  resolvedBy?: { id: string; username: string } | null;
}

export interface AdminReportsResponse {
  data: AdminReport[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Nhãn tiếng Việt cho loại nội dung. */
export const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  STORY: 'Truyện',
  CHAPTER: 'Chương',
  COMMENT: 'Bình luận',
  USER: 'Người dùng',
  PAINTING: 'Tranh',
};

/** Nhãn tiếng Việt cho lý do — khớp REPORT_REASONS ở reports.service.ts. */
export const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam / lừa đảo',
  ABUSE: 'Lăng mạ / quấy rối',
  SEXUAL: 'Nội dung khiêu dâm',
  HATE: 'Thù ghét / phân biệt',
  COPYRIGHT: 'Vi phạm bản quyền',
  ILLEGAL: 'Vi phạm pháp luật',
  OTHER: 'Khác',
};

export const adminReportsService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: ReportStatus | '';
    targetType?: ReportTargetType | '';
  }): Promise<AdminReportsResponse> => {
    const r = await apiClient.get<AdminReportsResponse>('/admin/reports', {
      params: {
        page: params?.page,
        limit: params?.limit,
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.targetType ? { targetType: params.targetType } : {}),
      },
    });
    return r.data as unknown as AdminReportsResponse;
  },

  resolve: async (id: string, status: Extract<ReportStatus, 'RESOLVED' | 'DISMISSED'>) => {
    const r = await apiClient.patch(`/admin/reports/${id}`, { status });
    return r.data;
  },
};
