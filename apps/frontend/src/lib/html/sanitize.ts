/**
 * Làm sạch HTML do người dùng / admin soạn trước khi nhét vào
 * `dangerouslySetInnerHTML`.
 *
 * Vì sao KHÔNG dùng `isomorphic-dompurify` nữa: gói đó kéo theo `jsdom`, mà
 * jsdom đọc file tài nguyên (`browser/default-stylesheet.css`) bằng đường dẫn
 * tương đối lúc chạy. Trong bản build Next cả hai cách cấu hình đều hỏng:
 *
 *   - Để webpack bundle jsdom → SSR đổ `ENOENT: browser/default-stylesheet.css`.
 *   - Khai báo `serverComponentsExternalPackages` → chỉ có tác dụng cho server
 *     component; component 'use client' lúc SSR vẫn bundle jsdom, module chết
 *     ngay khi nạp nên React nhận `undefined` và ném "Element type is invalid".
 *
 * Hệ quả trước đây: mọi trang tĩnh (giới thiệu, điều khoản, quyền riêng tư…) và
 * trang chương có chèn quảng cáo đều không prerender được — đúng nhóm trang mà
 * AdSense soi kỹ nhất.
 *
 * `sanitize-html` là JS thuần (htmlparser2), chạy giống hệt nhau ở server và
 * browser nên không gây lệch hydrate, và không cần DOM.
 */
import sanitizeHtmlLib from 'sanitize-html';

/** Thẻ cho phép trong nội dung bài viết / chương truyện. */
const CONTENT_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
];

const BASE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: CONTENT_TAGS,
  allowedAttributes: {
    // KHÔNG cho `class`/`id` tuỳ ý: site dùng Tailwind, nên tác giả có thể viết
    // <div class="fixed inset-0 z-50 …"> để dựng overlay phủ màn hình giả
    // banner nạp xu/đăng nhập (UI-redress/phishing) dù không chạy được JS.
    // `class` được lọc riêng qua allowedClasses (chỉ class Quill ql-*).
    '*': ['style', 'title', 'dir', 'lang'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'srcset', 'alt', 'width', 'height', 'loading'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
    col: ['span'],
  },
  // Chỉ giữ class do Quill sinh (căn lề, thụt đầu dòng, cỡ chữ, code block…),
  // loại mọi utility class có thể lạm dụng để định vị/che phủ.
  allowedClasses: {
    '*': [/^ql-[a-z0-9-]+$/i],
  },
  // Chặn javascript:, vbscript: và mọi scheme lạ. `data:` chỉ mở cho ảnh.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  // Chỉ giữ vài thuộc tính CSS an toàn — chặn `position`, `behavior`,
  // `expression()` và các trò thoát khung nhìn khác.
  allowedStyles: {
    '*': {
      color: [/^[^;{}()]*$/],
      'background-color': [/^[^;{}()]*$/],
      'text-align': [/^(left|right|center|justify)$/],
      'text-decoration': [/^[a-z\s-]+$/],
      'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
      'font-style': [/^(normal|italic|oblique)$/],
      'font-size': [/^\d+(\.\d+)?(px|em|rem|%|pt)$/],
      'line-height': [/^\d+(\.\d+)?(px|em|rem|%)?$/],
      'margin-left': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'padding-left': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      width: [/^\d+(\.\d+)?(px|em|rem|%)$/],
      height: [/^\d+(\.\d+)?(px|em|rem|%)$/],
    },
  },
  // Link ra ngoài luôn kèm noopener để tab đích không chiếm được window.opener.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.target === '_blank'
          ? { rel: 'noopener noreferrer nofollow' }
          : {}),
      },
    }),
  },
};

/** Làm sạch nội dung bài viết / trang tĩnh / chương truyện. */
export function sanitizeContentHtml(html?: string | null): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, BASE_OPTIONS);
}

/**
 * Làm sạch HTML của banner quảng cáo. Rộng hơn một chút vì creative hay dùng
 * `iframe` của mạng quảng cáo, nhưng vẫn cấm `script`.
 */
export function sanitizeAdHtml(html?: string | null): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, {
    ...BASE_OPTIONS,
    allowedTags: [...CONTENT_TAGS, 'iframe', 'ins'],
    allowedAttributes: {
      ...BASE_OPTIONS.allowedAttributes,
      // Ad creative do ADMIN soạn (AdSense cần class `adsbygoogle`) → cho class
      // rộng trở lại, khác với nội dung chương của tác giả thường.
      '*': ['class', 'style', 'id', 'title', 'dir', 'lang'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'scrolling', 'loading'],
      ins: ['class', 'style', 'data-ad-client', 'data-ad-slot', 'data-ad-format', 'data-full-width-responsive'],
    },
    // Bỏ giới hạn ql-* cho ads (admin content).
    allowedClasses: { '*': ['*'], ins: ['*'] },
  });
}
