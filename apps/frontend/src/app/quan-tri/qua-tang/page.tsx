'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Gift, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';

interface GiftCode {
    id: string;
    code: string;
    reward: number;
    maxUses: number | null;
    usedCount: number;
    expiresAt: string | null;
    isActive: boolean;
    note: string | null;
    createdAt: string;
    createdBy: { username: string; displayName: string | null } | null;
}

interface CreateGiftCodeBody {
    code?: string;
    reward: number;
    maxUses?: number;
    expiresAt?: string;
    note?: string;
}

const QUERY_KEY = ['admin', 'gift-codes'];
const CODE_RE = /^[A-Z0-9_-]{6,64}$/;

// Client đã bóc envelope {success,data} — vẫn phòng hờ trường hợp còn lồng `data`.
const unwrap = <T,>(payload: unknown): T => {
    const p = payload as any;
    return (p && typeof p === 'object' && 'data' in p && !Array.isArray(p) && p.success !== undefined ? p.data : p) as T;
};

const errorMessage = (e: any, fallback: string) => {
    const d = e?.response?.data;
    if (Array.isArray(d?.error)) return d.error.join('. ');
    if (Array.isArray(d?.message)) return d.message.join('. ');
    return d?.message || d?.error || fallback;
};

const fmtNum = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (s: string | null) =>
    s
        ? new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

type CodeState = 'active' | 'off' | 'expired' | 'used-up';
const codeState = (g: GiftCode): CodeState => {
    if (!g.isActive) return 'off';
    if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) return 'expired';
    if (g.maxUses != null && g.usedCount >= g.maxUses) return 'used-up';
    return 'active';
};
const STATE_LABEL: Record<CodeState, string> = {
    active: 'Đang chạy',
    off: 'Đã tắt',
    expired: 'Hết hạn',
    'used-up': 'Hết lượt',
};
const STATE_CLS: Record<CodeState, string> = {
    active: 'bg-primary/10 text-primary border-primary/30',
    off: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    expired: 'bg-error/10 text-error border-error/30',
    'used-up': 'bg-error/10 text-error border-error/30',
};

/** Copy có fallback execCommand cho trình duyệt cũ (iOS 12 chưa có navigator.clipboard). */
async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* thử cách cũ bên dưới */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

function CopyCodeButton({ code }: { code: string }) {
    const { showToast } = useToast();
    const [done, setDone] = useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                const ok = await copyText(code);
                if (ok) {
                    setDone(true);
                    setTimeout(() => setDone(false), 1500);
                } else {
                    showToast('Không sao chép được — hãy chọn và copy tay', 'error');
                }
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
            aria-label={`Sao chép mã ${code}`}
            title="Sao chép mã"
        >
            {done ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
        </button>
    );
}

function StatusToggle({ g, busy, onToggle }: { g: GiftCode; busy: boolean; onToggle: (g: GiftCode) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={g.isActive}
            aria-label={g.isActive ? `Tắt mã ${g.code}` : `Bật mã ${g.code}`}
            disabled={busy}
            onClick={() => onToggle(g)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
                g.isActive ? 'bg-primary border-primary' : 'bg-surface-container-high border-outline-variant'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 rounded-full transition-transform ${
                    g.isActive ? 'translate-x-6 bg-on-primary' : 'translate-x-1 bg-on-surface-variant'
                }`}
            />
        </button>
    );
}

export default function AdminGiftCodesPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: codes = [], isLoading, isError } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const res = await apiClient.get<GiftCode[]>('/rewards/admin/gift-codes');
            const list = unwrap<GiftCode[]>(res.data);
            return Array.isArray(list) ? list : [];
        },
    });

    // --- Form tạo mã ---
    const [code, setCode] = useState('');
    const [reward, setReward] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiresOn, setExpiresOn] = useState(''); // YYYY-MM-DD, hết hạn cuối ngày đó (giờ máy admin)
    const [note, setNote] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: async (body: CreateGiftCodeBody) => {
            const res = await apiClient.post<GiftCode>('/rewards/admin/gift-codes', body);
            return unwrap<GiftCode>(res.data);
        },
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            showToast(`Đã tạo mã ${created?.code ?? ''}`.trim(), 'success');
            setCode('');
            setReward('');
            setMaxUses('');
            setExpiresOn('');
            setNote('');
            setFormError(null);
        },
        onError: (e: any) => setFormError(errorMessage(e, 'Không tạo được giftcode')),
    });

    const [togglingId, setTogglingId] = useState<string | null>(null);
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            await apiClient.patch(`/rewards/admin/gift-codes/${encodeURIComponent(id)}`, { isActive });
        },
        onMutate: ({ id }) => setTogglingId(id),
        onSuccess: (_d, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            showToast(isActive ? 'Đã bật mã' : 'Đã tắt mã', 'success');
        },
        onError: (e: any) => showToast(errorMessage(e, 'Không đổi được trạng thái'), 'error'),
        onSettled: () => setTogglingId(null),
    });
    const onToggle = (g: GiftCode) => toggleMutation.mutate({ id: g.id, isActive: !g.isActive });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        const body: CreateGiftCodeBody = { reward: 0 };

        const c = code.trim().toUpperCase();
        if (c) {
            if (!CODE_RE.test(c)) {
                setFormError('Mã chỉ gồm A-Z, 0-9, dấu _ hoặc -, dài 6–64 ký tự (để trống để tự sinh)');
                return;
            }
            body.code = c;
        }

        const r = Number(reward);
        if (!Number.isInteger(r) || r < 1 || r > 10000) {
            setFormError('Số xu thưởng phải là số nguyên 1–10.000');
            return;
        }
        body.reward = r;

        if (maxUses.trim()) {
            const m = Number(maxUses);
            if (!Number.isInteger(m) || m < 1) {
                setFormError('Số lượt dùng phải là số nguyên ≥ 1 (để trống = không giới hạn)');
                return;
            }
            body.maxUses = m;
        }

        if (expiresOn) {
            const parts = expiresOn.split('-').map((x) => parseInt(x, 10));
            // Dựng Date theo từng thành phần (không parse chuỗi) — Safari cũ hiểu sai chuỗi không múi giờ.
            const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 23, 59, 59);
            if (Number.isNaN(d.getTime())) {
                setFormError('Ngày hết hạn không hợp lệ');
                return;
            }
            if (d.getTime() <= Date.now()) {
                setFormError('Ngày hết hạn phải ở tương lai');
                return;
            }
            body.expiresAt = d.toISOString();
        }

        const n = note.trim();
        if (n) body.note = n.slice(0, 200);

        createMutation.mutate(body);
    };

    const inputCls =
        'w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary focus:border-transparent';

    const usage = (g: GiftCode) => `${fmtNum(g.usedCount)} / ${g.maxUses == null ? '∞' : fmtNum(g.maxUses)}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-2">
                        <Gift className="w-7 h-7 text-primary" /> Quà tặng (giftcode)
                    </h1>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Mỗi tài khoản nhập một mã một lần, nhận <b>xu thưởng</b> — chỉ dùng mua chương/truyện VIP, không cộng
                        doanh thu tác giả, không rút/chuyển được. Cần bật &quot;Chương trình thưởng&quot; trong{' '}
                        <a href="/quan-tri/cai-dat#rewards" className="text-primary hover:underline">Cài đặt</a>.
                    </p>
                </div>
                <RefreshButton queryKeys={[QUERY_KEY]} />
            </div>

            {/* Tạo mã */}
            <form onSubmit={submit} className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-on-surface">Tạo giftcode</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="gc-code" className="block text-xs text-on-surface-variant mb-1">
                            Mã (để trống = tự sinh 10 ký tự)
                        </label>
                        <input
                            id="gc-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                            maxLength={64}
                            placeholder="VD: TET2027"
                            autoCapitalize="characters"
                            autoComplete="off"
                            className={`${inputCls} font-mono`}
                        />
                    </div>
                    <div>
                        <label htmlFor="gc-reward" className="block text-xs text-on-surface-variant mb-1">
                            Xu thưởng (1–10.000) *
                        </label>
                        <input
                            id="gc-reward"
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            required
                            value={reward}
                            onChange={(e) => setReward(e.target.value)}
                            placeholder="VD: 50"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label htmlFor="gc-max" className="block text-xs text-on-surface-variant mb-1">
                            Tổng lượt dùng (trống = không giới hạn)
                        </label>
                        <input
                            id="gc-max"
                            type="number"
                            min={1}
                            step={1}
                            value={maxUses}
                            onChange={(e) => setMaxUses(e.target.value)}
                            placeholder="∞"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label htmlFor="gc-exp" className="block text-xs text-on-surface-variant mb-1">
                            Hết hạn sau ngày (tuỳ chọn)
                        </label>
                        <input
                            id="gc-exp"
                            type="date"
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className={inputCls}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="gc-note" className="block text-xs text-on-surface-variant mb-1">
                        Ghi chú nội bộ (tuỳ chọn, ≤ 200 ký tự)
                    </label>
                    <input
                        id="gc-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={200}
                        placeholder="VD: Sự kiện fanpage tháng 11"
                        className={inputCls}
                    />
                </div>
                {formError && (
                    <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">{formError}</p>
                )}
                <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    Tạo mã
                </button>
            </form>

            {/* Danh sách */}
            <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-on-surface">Danh sách mã</h2>
                    <span className="text-xs text-on-surface-variant">{codes.length} mã (mới nhất trước, tối đa 200)</span>
                </div>

                {isLoading ? (
                    <Loading />
                ) : isError ? (
                    <p className="text-sm text-error">Không tải được danh sách giftcode.</p>
                ) : codes.length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic bg-surface-container rounded-lg border border-outline-variant p-6 text-center">
                        Chưa có giftcode nào.
                    </p>
                ) : (
                    <>
                        {/* Mobile: thẻ */}
                        <div className="space-y-3 md:hidden">
                            {codes.map((g) => {
                                const st = codeState(g);
                                return (
                                    <div key={g.id} className="bg-surface-container rounded-lg border border-outline-variant p-4 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span className="font-mono font-semibold text-on-surface break-all">{g.code}</span>
                                                <CopyCodeButton code={g.code} />
                                            </div>
                                            <StatusToggle g={g} busy={togglingId === g.id} onToggle={onToggle} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="font-semibold text-primary">+{fmtNum(g.reward)} xu</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATE_CLS[st]}`}>{STATE_LABEL[st]}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                                            <span>Đã dùng: <b className="text-on-surface">{usage(g)}</b></span>
                                            <span>Hết hạn: <span className="text-on-surface">{fmtDate(g.expiresAt)}</span></span>
                                            <span className="col-span-2">
                                                Tạo {fmtDate(g.createdAt)}
                                                {g.createdBy ? ` · ${g.createdBy.displayName || g.createdBy.username}` : ''}
                                            </span>
                                        </div>
                                        {g.note && <p className="text-xs text-on-surface-variant break-words">{g.note}</p>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: bảng */}
                        <div className="hidden md:block overflow-x-auto bg-surface-container rounded-lg border border-outline-variant">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-on-surface-variant border-b border-outline-variant">
                                        <th className="px-4 py-3 font-medium">Mã</th>
                                        <th className="px-4 py-3 font-medium text-right">Thưởng</th>
                                        <th className="px-4 py-3 font-medium text-right">Đã dùng</th>
                                        <th className="px-4 py-3 font-medium">Hết hạn</th>
                                        <th className="px-4 py-3 font-medium">Trạng thái</th>
                                        <th className="px-4 py-3 font-medium">Ghi chú</th>
                                        <th className="px-4 py-3 font-medium">Tạo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map((g) => {
                                        const st = codeState(g);
                                        return (
                                            <tr key={g.id} className="border-b border-outline-variant last:border-b-0 align-middle">
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono font-semibold text-on-surface">{g.code}</span>
                                                        <CopyCodeButton code={g.code} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">
                                                    +{fmtNum(g.reward)} xu
                                                </td>
                                                <td className="px-4 py-2 text-right text-on-surface whitespace-nowrap">{usage(g)}</td>
                                                <td className="px-4 py-2 text-on-surface-variant whitespace-nowrap">{fmtDate(g.expiresAt)}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <StatusToggle g={g} busy={togglingId === g.id} onToggle={onToggle} />
                                                        <span className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${STATE_CLS[st]}`}>
                                                            {STATE_LABEL[st]}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-on-surface-variant max-w-xs break-words">{g.note || '—'}</td>
                                                <td className="px-4 py-2 text-xs text-on-surface-variant whitespace-nowrap">
                                                    {fmtDate(g.createdAt)}
                                                    {g.createdBy && (
                                                        <div>{g.createdBy.displayName || g.createdBy.username}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
