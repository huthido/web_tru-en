import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient, unwrap } from './client';

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
    /** Tên màn hình nơi gặp lỗi. */
    pageUrl?: string;
}

/** Nhãn mức độ — dùng trong picker UI. */
export const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
    { value: 'LOW', label: 'Nhẹ' },
    { value: 'MEDIUM', label: 'Vừa' },
    { value: 'HIGH', label: 'Nặng' },
    { value: 'CRITICAL', label: 'Nghiêm trọng' },
];

export const STATUS_LABELS: Record<BugReportStatus, string> = {
    OPEN: 'Mới',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã sửa',
    CLOSED: 'Đã đóng',
};

export const BugReportsApi = {
    async create(input: CreateBugReportInput): Promise<BugReport> {
        const res = await apiClient.post('/bug-reports', {
            ...input,
            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
            deviceInfo: `${Platform.OS} ${Platform.Version}`,
            appVersion:
                (Constants?.expoConfig?.version as string | undefined) ?? undefined,
        });
        return unwrap<BugReport>(res);
    },

    async listMine(): Promise<BugReport[]> {
        const res = await apiClient.get('/bug-reports/mine');
        const data = unwrap<BugReport[]>(res);
        return Array.isArray(data) ? data : [];
    },
};
