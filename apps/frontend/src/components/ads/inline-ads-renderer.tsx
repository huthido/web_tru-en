'use client';

import React, { useMemo } from 'react';
import { useSlotAds } from '@/lib/api/hooks/use-ads';
import { AdBanner } from './ad-banner';
import { AdPosition, type Ad, type AdInlineRule } from '@/lib/api/ads.service';

interface InlineAdsRendererProps {
    /** Slot key chứa ads INLINE. VD 'reading.inline'. */
    slotKey: string;
    /**
     * Nội dung — hoặc HTML string (Quill output) hoặc plain text (chương cũ).
     * Component tự detect bằng `<` ở đầu sau trim.
     */
    content: string;
    /**
     * Rule fallback nếu ads không set `inlineRule`. Mặc định
     * `{ afterParagraph: 5, repeatEvery: 5, maxOccurrences: null }`.
     */
    defaultRule?: AdInlineRule;
    /** Class cho mỗi wrapper ad chèn vào. */
    adClassName?: string;
}

type NormalizedRule = {
    afterParagraph: number;
    repeatEvery: number;
    maxOccurrences: number | null;
};

const FALLBACK_RULE: NormalizedRule = {
    afterParagraph: 5,
    repeatEvery: 5,
    maxOccurrences: null,
};

/**
 * Render nội dung chương + chèn banner INLINE vào giữa đoạn văn theo quy tắc
 * động đọc từ DB (`ad.inlineRule` per ad, fallback `defaultRule`).
 *
 * Quy tắc:
 * - `afterParagraph`: chèn ad đầu tiên sau đoạn thứ N
 * - `repeatEvery`: sau đó cứ mỗi M đoạn lại chèn 1 ad
 * - `maxOccurrences`: tổng số lần chèn tối đa (null = không giới hạn)
 *
 * Khi có >1 ad active trong slot, rotate qua từng ad theo thứ tự khi tới slot
 * chèn (ad[0] cho lần 1, ad[1] cho lần 2, ...). Vượt số ad → wrap-around.
 */
export function InlineAdsRenderer({
    slotKey,
    content,
    defaultRule,
    adClassName = 'my-8',
}: InlineAdsRendererProps) {
    const { data } = useSlotAds(slotKey, 'web');
    const ads = data?.ads ?? [];
    const slotEnabled = data?.slot?.enabled ?? false;

    // Rule lấy từ ad đầu tiên hoặc fallback. Multi-ad cùng rule = nhất quán
    // (ít gây bất ngờ hơn lấy rule mix).
    const rule: NormalizedRule = useMemo(() => {
        const r: AdInlineRule = ads[0]?.inlineRule ?? defaultRule ?? {};
        return {
            afterParagraph: r.afterParagraph ?? FALLBACK_RULE.afterParagraph,
            repeatEvery: r.repeatEvery ?? FALLBACK_RULE.repeatEvery,
            maxOccurrences: r.maxOccurrences ?? FALLBACK_RULE.maxOccurrences,
        };
    }, [ads, defaultRule]);

    const isHtml = useMemo(() => content.trim().startsWith('<'), [content]);

    const nodes = useMemo(() => {
        if (!slotEnabled || ads.length === 0) {
            // Không có ad → render content nguyên trạng.
            return renderContentOnly(content, isHtml);
        }
        return renderContentWithInlineAds(content, isHtml, ads, rule, adClassName);
    }, [content, isHtml, ads, rule, adClassName, slotEnabled]);

    return <>{nodes}</>;
}

function renderContentOnly(content: string, isHtml: boolean): React.ReactNode[] {
    if (isHtml) {
        return [
            <div
                key="html-content"
                className="chapter-html-content"
                dangerouslySetInnerHTML={{ __html: content }}
            />,
        ];
    }
    const lines = content.split('\n');
    return lines.map((line, i) =>
        line.trim().length > 0 ? (
            <p key={i} className="mb-4 text-justify">{line}</p>
        ) : (
            <br key={`br-${i}`} />
        ),
    );
}

function renderContentWithInlineAds(
    content: string,
    isHtml: boolean,
    ads: Ad[],
    rule: NormalizedRule,
    adClassName: string,
): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let adInsertCount = 0;
    let adIndex = 0;

    const shouldInsertAfter = (paragraphIdx: number, totalParagraphs: number): boolean => {
        if (paragraphIdx < rule.afterParagraph) return false;
        if (paragraphIdx >= totalParagraphs) return false; // không chèn sau đoạn cuối
        if (rule.maxOccurrences !== null && adInsertCount >= rule.maxOccurrences) return false;
        const offset = paragraphIdx - rule.afterParagraph;
        return offset % rule.repeatEvery === 0;
    };

    const insertAd = (key: string) => {
        const ad = ads[adIndex % ads.length];
        adIndex++;
        adInsertCount++;
        result.push(
            <div key={key} className={adClassName}>
                <AdBanner
                    position={AdPosition.INLINE}
                    ads={[ad]}
                    displayConfig={ad.displayConfig}
                />
            </div>,
        );
    };

    if (isHtml) {
        const pCount = (content.match(/<\/p>/gi) || []).length;
        if (pCount <= rule.afterParagraph) {
            return renderContentOnly(content, true);
        }
        const parts = content.split('</p>');
        let currentHtml = '';
        let paragraphCount = 0;
        parts.forEach((part, index) => {
            if (index < parts.length - 1) {
                currentHtml += part + '</p>';
                paragraphCount++;
                if (shouldInsertAfter(paragraphCount, pCount)) {
                    result.push(
                        <div
                            key={`html-${index}`}
                            className="chapter-html-content"
                            dangerouslySetInnerHTML={{ __html: currentHtml }}
                        />,
                    );
                    insertAd(`ad-${index}`);
                    currentHtml = '';
                }
            } else {
                currentHtml += part;
            }
        });
        if (currentHtml.trim()) {
            result.push(
                <div
                    key="html-last"
                    className="chapter-html-content"
                    dangerouslySetInnerHTML={{ __html: currentHtml }}
                />,
            );
        }
        return result;
    }

    // Plain text path
    const allLines = content.split('\n');
    const paragraphs = allLines.filter((p) => p.trim().length > 0);
    let paragraphCount = 0;

    allLines.forEach((line, index) => {
        const isP = line.trim().length > 0;
        if (isP) paragraphCount++;
        // Quyết định chèn ad TRƯỚC khi render, vì insertAd() tăng counter.
        // Tránh gọi shouldInsertAfter 2 lần (mỗi lần check là idempotent nhưng
        // counter trong insertAd làm condition đổi giữa hai lần check).
        const inject = isP && shouldInsertAfter(paragraphCount, paragraphs.length);
        const ad = inject ? ads[adIndex % ads.length] : null;
        result.push(
            <React.Fragment key={index}>
                {isP ? <p className="mb-4 text-justify">{line}</p> : <br key={`br-${index}`} />}
                {ad && (
                    <div className={adClassName}>
                        <AdBanner
                            position={AdPosition.INLINE}
                            ads={[ad]}
                            displayConfig={ad.displayConfig}
                        />
                    </div>
                )}
            </React.Fragment>,
        );
        if (inject) {
            adIndex++;
            adInsertCount++;
        }
    });

    return result;
}
