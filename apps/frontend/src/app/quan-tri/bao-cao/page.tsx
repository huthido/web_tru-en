'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToastContext } from '@/components/providers/toast-provider';
import { useAdminReports, useResolveReport } from '@/lib/api/hooks/use-admin-reports';
import {
  AdminReport,
  REASON_LABELS,
  ReportStatus,
  TARGET_TYPE_LABELS,
} from '@/lib/api/admin-reports.service';
import { ReportTargetType } from '@/lib/api/reports.service';

const STATUS_BADGE: Record<ReportStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  DISMISSED: 'bg-surface-variant text-on-surface-variant',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: 'Chờ xử lý',
  RESOLVED: 'Đã xử lý',
  DISMISSED: 'Đã bỏ qua',
};

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  // Mặc định mở ở PENDING — việc cần làm nằm hết ở đây.
  const [status, setStatus] = useState<ReportStatus | ''>('PENDING');
  const [targetType, setTargetType] = useState<ReportTargetType | ''>('');
  const [pending, setPending] = useState<{
    report: AdminReport;
    action: 'RESOLVED' | 'DISMISSED';
  } | null>(null);

  const { showToast } = useToastContext();
  const { data, isLoading, isFetching, refetch } = useAdminReports({
    page,
    limit,
    status,
    targetType,
  });
  const resolveMutation = useResolveReport();

  const reports = data?.data ?? [];
  const meta = data?.meta;

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      await resolveMutation.mutateAsync({ id: pending.report.id, status: pending.action });
    } catch (e: any) {
      const raw = e?.response?.data?.error ?? e?.response?.data?.message;
      showToast(
        typeof raw === 'string' ? raw : 'Không cập nhật được báo cáo. Thử lại nhé.',
        'error',
      );
      setPending(null);
      return;
    }
    showToast(
      pending.action === 'RESOLVED' ? 'Đã đánh dấu đã xử lý' : 'Đã bỏ qua báo cáo',
      'success',
    );
    setPending(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo vi phạm</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Báo cáo do người dùng gửi về truyện, chương, bình luận, tranh và tài khoản.
          </p>
        </div>
        <RefreshButton onRefresh={refetch} />
      </div>

      {/* Bộ lọc */}
      <div className="bg-surface-container p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ReportStatus | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg bg-surface text-on-surface"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="RESOLVED">Đã xử lý</option>
              <option value="DISMISSED">Đã bỏ qua</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Loại nội dung</label>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as ReportTargetType | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg bg-surface text-on-surface"
            >
              <option value="">Tất cả</option>
              {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Số dòng / trang</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg bg-surface text-on-surface"
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : reports.length === 0 ? (
        <div className="bg-surface-container rounded-lg py-20 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="text-4xl">🕊️</span>
          <p className="font-medium">
            {status === 'PENDING' ? 'Không có báo cáo nào chờ xử lý' : 'Không có báo cáo nào'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-outline-variant/30">
              <tr className="text-on-surface-variant">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Thời gian</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Loại</th>
                <th className="px-4 py-3 font-medium">Nội dung bị báo cáo</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Lý do</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Người báo</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/20 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {TARGET_TYPE_LABELS[r.targetType] ?? r.targetType}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="flex gap-3">
                      {r.target.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.target.imageUrl}
                          alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        {r.target.url ? (
                          <Link
                            href={r.target.url}
                            target="_blank"
                            className="text-primary hover:underline break-words"
                          >
                            {r.target.label}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant italic break-words">
                            {r.target.label}
                          </span>
                        )}
                        {r.target.authorName && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Tác giả: {r.target.authorName}
                          </p>
                        )}
                        {r.note && (
                          <p className="text-xs text-on-surface-variant mt-1 break-words">
                            Ghi chú: {r.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {REASON_LABELS[r.reason] ?? r.reason}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/u/${r.reporter.username}`}
                      target="_blank"
                      className="hover:underline"
                    >
                      {r.reporter.displayName || r.reporter.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.resolvedBy && (
                      <p className="text-xs text-on-surface-variant mt-1">
                        bởi {r.resolvedBy.username}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPending({ report: r, action: 'RESOLVED' })}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                        >
                          Đã xử lý
                        </button>
                        <button
                          onClick={() => setPending({ report: r, action: 'DISMISSED' })}
                          className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-medium hover:bg-surface-variant"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phân trang */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Trang {meta.page}/{meta.totalPages} — {meta.total} báo cáo
            {isFetching && ' (đang tải...)'}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-variant"
            >
              Trước
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm disabled:opacity-40 hover:bg-surface-variant"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title={pending?.action === 'RESOLVED' ? 'Đánh dấu đã xử lý' : 'Bỏ qua báo cáo'}
        message={
          pending
            ? `Báo cáo "${REASON_LABELS[pending.report.reason] ?? pending.report.reason}" về ${
                TARGET_TYPE_LABELS[pending.report.targetType] ?? pending.report.targetType
              }: ${pending.report.target.label.slice(0, 80)}.\n\nBáo cáo đã xử lý không thể đổi trạng thái lại.`
            : ''
        }
        confirmText={pending?.action === 'RESOLVED' ? 'Đã xử lý' : 'Bỏ qua'}
        confirmColor={pending?.action === 'RESOLVED' ? 'green' : 'blue'}
        isLoading={resolveMutation.isPending}
      />
    </div>
  );
}
