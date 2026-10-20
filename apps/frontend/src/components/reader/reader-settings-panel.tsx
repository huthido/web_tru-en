'use client';

import {
    READER_FONTS,
    READER_FONT_SIZE,
    READER_LINE_HEIGHTS,
    READER_THEMES,
    READER_WIDTHS,
    type ReaderSettings,
} from '@/hooks/use-reader-settings';

interface Props {
    settings: ReaderSettings;
    onChange: (patch: Partial<ReaderSettings>) => void;
    onReset: () => void;
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            aria-label={label}
            className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-sm font-medium border transition-colors ${active
                ? 'bg-primary text-on-primary border-transparent'
                : 'bg-surface-container-high text-on-surface border-outline-variant/60 hover:bg-surface-container-highest'
                }`}
        >
            {children}
        </button>
    );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">{title}</p>
            {children}
        </div>
    );
}

/** Bảng chỉnh khung đọc: cỡ chữ, font, giãn dòng, độ rộng, màu nền. */
export function ReaderSettingsPanel({ settings, onChange, onReset }: Props) {
    const { fontSize } = settings;
    return (
        <div>
            <Row title="Cỡ chữ">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ fontSize: Math.max(READER_FONT_SIZE.min, fontSize - READER_FONT_SIZE.step) })}
                        disabled={fontSize <= READER_FONT_SIZE.min}
                        className="w-11 h-10 rounded-lg bg-surface-container-high text-on-surface text-sm font-bold disabled:opacity-40"
                        aria-label="Giảm cỡ chữ"
                    >
                        A−
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold text-on-surface">{fontSize}px</span>
                    <button
                        type="button"
                        onClick={() => onChange({ fontSize: Math.min(READER_FONT_SIZE.max, fontSize + READER_FONT_SIZE.step) })}
                        disabled={fontSize >= READER_FONT_SIZE.max}
                        className="w-11 h-10 rounded-lg bg-surface-container-high text-on-surface text-lg font-bold disabled:opacity-40"
                        aria-label="Tăng cỡ chữ"
                    >
                        A+
                    </button>
                </div>
            </Row>

            <Row title="Kiểu chữ">
                <div className="flex gap-2">
                    {READER_FONTS.map((f) => (
                        <Chip key={f.value} active={settings.font === f.value} onClick={() => onChange({ font: f.value })}>
                            <span style={{ fontFamily: f.css }}>{f.label}</span>
                        </Chip>
                    ))}
                </div>
            </Row>

            <Row title="Giãn dòng">
                <div className="flex gap-2">
                    {READER_LINE_HEIGHTS.map((lh) => (
                        <Chip key={lh} active={settings.lineHeight === lh} onClick={() => onChange({ lineHeight: lh })} label={`Giãn dòng ${lh}`}>
                            {lh === 1.625 ? '1.6' : lh}
                        </Chip>
                    ))}
                </div>
            </Row>

            <Row title="Màu nền">
                <div className="flex gap-2">
                    {READER_THEMES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => onChange({ theme: t.value })}
                            aria-pressed={settings.theme === t.value}
                            className={`flex-1 min-w-0 rounded-lg border-2 px-1 py-2 text-xs font-semibold transition-colors ${settings.theme === t.value ? 'border-primary' : 'border-outline-variant/60'} ${t.bg ? '' : 'bg-surface-container-high text-on-surface'}`}
                            style={t.bg ? { backgroundColor: t.bg, color: t.fg } : undefined}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </Row>

            {/* Độ rộng chỉ có ý nghĩa trên màn hình lớn */}
            <div className="hidden md:block">
                <Row title="Độ rộng khung chữ">
                    <div className="flex gap-2">
                        {READER_WIDTHS.map((w) => (
                            <Chip key={w.value} active={settings.width === w.value} onClick={() => onChange({ width: w.value })}>
                                {w.label}
                            </Chip>
                        ))}
                    </div>
                </Row>
            </div>

            <button
                type="button"
                onClick={onReset}
                className="w-full mt-1 py-2 text-sm font-medium text-primary hover:underline"
            >
                Khôi phục mặc định
            </button>
        </div>
    );
}
