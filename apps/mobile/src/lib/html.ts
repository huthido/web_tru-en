/**
 * Lightweight HTML -> content-block parser for the chapter reader.
 *
 * Chapter content comes from a rich-text (Quill-style) editor on the web, so
 * it is usually simple: paragraphs, line breaks and the occasional image.
 * Rather than pull in a heavy HTML-rendering dependency, we flatten the markup
 * into an ordered list of text/image blocks that the reader renders with
 * native <Text>/<Image> -- giving full control over reading typography.
 */

export type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; uri: string };

const NAMED_ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lsquo;': '‘',
    '&rsquo;': '’',
};

function decodeEntities(input: string): string {
    return input
        .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(Number(dec)))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
        .replace(/&[a-z]+;/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? m);
}

function safeCodePoint(code: number): string {
    try {
        return String.fromCodePoint(code);
    } catch {
        return '';
    }
}

/** Parse chapter content (HTML or plain text) into ordered blocks. */
export function htmlToBlocks(raw?: string | null): ContentBlock[] {
    if (!raw || !raw.trim()) return [];

    const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
    if (!looksHtml) {
        return raw
            .split(/\r?\n{2,}|\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((text) => ({ type: 'text', text } as ContentBlock));
    }

    // Normalise block-level boundaries into blank lines.
    const normalised = raw
        .replace(/<\s*(br|hr)\s*\/?>/gi, '\n')
        .replace(/<\/\s*(p|div|h[1-6]|li|blockquote|section)\s*>/gi, '\n\n')
        .replace(/<\s*(p|div|h[1-6]|li|blockquote|section)[^>]*>/gi, '');

    const blocks: ContentBlock[] = [];
    // Split so <img> tags survive as their own segments.
    for (const segment of normalised.split(/(<img[^>]*>)/gi)) {
        const img = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(segment);
        if (img) {
            blocks.push({ type: 'image', uri: img[1] });
            continue;
        }
        const text = decodeEntities(segment.replace(/<[^>]+>/g, ''));
        for (const paragraph of text.split(/\n{2,}/)) {
            // [^\S\n]+ collapses runs of any whitespace except newlines
            // (covers regular spaces, tabs and   non-breaking spaces).
            const cleaned = paragraph.replace(/[^\S\n]+/g, ' ').trim();
            if (cleaned) blocks.push({ type: 'text', text: cleaned });
        }
    }
    return blocks;
}

/** Plain-text excerpt for previews/teasers. */
export function htmlToPlainText(raw?: string | null, maxLength = 240): string {
    if (!raw) return '';
    const text = decodeEntities(raw.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '...' : text;
}
