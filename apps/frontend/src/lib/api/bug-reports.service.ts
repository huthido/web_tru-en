import { apiClient } from './client';

export type BugSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface BugReport {
  id: string;
  title: string;
  platform: 'WEB' | 'ANDROID' | 'IOS' | 'OTHER';
  severity: BugSeverity;
  status: BugReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface CreateBugReportInput {
  title: string;
  description: string;
  severity?: BugSeverity;
  pageUrl?: string;
  deviceInfo?: string;
}

export const bugReportsService = {
  create: async (input: CreateBugReportInput): Promise<BugReport> => {
    const response = await apiClient.post<BugReport>('/bug-reports', {
      ...input,
      platform: 'WEB',
    });
    // Interceptor đã bóc envelope ở runtime — type của client chưa phản ánh.
    return response.data as unknown as BugReport;
  },

  listMine: async (): Promise<BugReport[]> => {
    const response = await apiClient.get<BugReport[]>('/bug-reports/mine');
    const data = response.data as unknown as BugReport[];
    return Array.isArray(data) ? data : [];
  },
};
