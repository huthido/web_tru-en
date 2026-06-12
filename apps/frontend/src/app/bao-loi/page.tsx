'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Bug, CheckCircle2, Loader2 } from 'lucide-react';
import {
  bugReportsService,
  type BugReport,
  type BugSeverity,
} from '@/lib/api/bug-reports.service';

const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
  { value: 'LOW', label: 'Nhẹ — không ảnh hưởng sử dụng' },
  { value: 'MEDIUM', label: 'Vừa — gây bất tiện' },
  { value: 'HIGH', label: 'Nặng — không dùng được tính năng' },
  { value: 'CRITICAL', label: 'Nghiêm trọng — mất dữ liệu / sập app' },
];

const STATUS_LABEL: Record<BugReport['status'], { text: string; cls: string }> = {
  OPEN: { text: 'Mới', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  IN_PROGRESS: { text: 'Đang xử lý', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  RESOLVED: { text: 'Đã sửa', cls: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  CLOSED: { text: 'Đã đóng', cls: 'bg-surface-variant text-on-surface-variant' },
};

function BugReportContent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM');
  const [pageUrl, setPageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [myReports, setMyReports] = useState<BugReport[]>([]);

  const loadMine = () => {
    bugReportsService
      .listMine()
      .then(setMyReports)
      .catch(() => setMyReports([]));
  };

  useEffect(loadMine, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (title.trim().length < 5) {
      setErrorMsg('Tiêu đề cần ít nhất 5 ký tự.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg('Mô tả cần ít nhất 10 ký tự — hãy ghi rõ các bước tái hiện lỗi.');
      return;
    }
    setSubmitting(true);
    try {
      await bugReportsService.create({
        title: title.trim(),
        description: description.trim(),
        severity,
        pageUrl: pageUrl.trim() || undefined,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
      });
      setSubmitted(true);
      setTitle('');
      setDescription('');
      setSeverity('MEDIUM');
      setPageUrl('');
      loadMine();
    } catch {
      setErrorMsg('Gửi báo lỗi thất bại, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg bg-surface-container border border-outline-variant/60 px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/60 outline-none focus:border-primary transition-colors';

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center">
                  <Bug size={24} className="text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Báo lỗi</h1>
              </div>
              <p className="text-sm md:text-base text-on-surface-variant ml-[52px] md:ml-[60px]">
                Gặp lỗi khi dùng YÊU? Mô tả càng chi tiết, đội ngũ sửa càng nhanh.
              </p>
            </div>

            {submitted && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3">
                <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-on-surface">
                  Đã gửi báo lỗi — cảm ơn bạn! Theo dõi trạng thái xử lý ở danh sách bên dưới.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container rounded-2xl border border-outline-variant/40 p-4 md:p-6">
              <div>
                <label htmlFor="bug-title" className="block text-sm font-semibold text-on-surface mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  id="bug-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="VD: Không lưu được tiến độ đọc khi chuyển chương"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="bug-desc" className="block text-sm font-semibold text-on-surface mb-1.5">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bug-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  placeholder={'Các bước tái hiện lỗi:\n1. Mở trang...\n2. Nhấn vào...\n3. Lỗi xảy ra: ...'}
                  className={inputCls}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bug-severity" className="block text-sm font-semibold text-on-surface mb-1.5">
                    Mức độ
                  </label>
                  <select
                    id="bug-severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                    className={inputCls}
                  >
                    {SEVERITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bug-url" className="block text-sm font-semibold text-on-surface mb-1.5">
                    Trang gặp lỗi (tuỳ chọn)
                  </label>
                  <input
                    id="bug-url"
                    type="text"
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    maxLength={500}
                    placeholder="VD: /truyen/ten-truyen"
                    className={inputCls}
                  />
                </div>
              </div>

              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Đang gửi...' : 'Gửi báo lỗi'}
              </button>
            </form>

            {/* Báo lỗi đã gửi */}
            {myReports.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-on-surface mb-3">Báo lỗi đã gửi</h2>
                <ul className="space-y-2">
                  {myReports.map((r) => {
                    const badge = STATUS_LABEL[r.status] ?? STATUS_LABEL.OPEN;
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl bg-surface-container border border-outline-variant/40 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface truncate">{r.title}</p>
                          <p className="text-xs text-on-surface-variant">
                            {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function BugReportPage() {
  return (
    <ProtectedRoute>
      <BugReportContent />
    </ProtectedRoute>
  );
}
