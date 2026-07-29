import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminReportsService,
  ReportStatus,
} from '../admin-reports.service';
import { ReportTargetType } from '../reports.service';

export const adminReportKeys = {
  list: (params?: object) => ['admin', 'reports', params] as const,
};

export function useAdminReports(params: {
  page?: number;
  limit?: number;
  status?: ReportStatus | '';
  targetType?: ReportTargetType | '';
}) {
  return useQuery({
    queryKey: adminReportKeys.list(params),
    queryFn: () => adminReportsService.list(params),
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<ReportStatus, 'RESOLVED' | 'DISMISSED'>;
    }) => adminReportsService.resolve(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}
