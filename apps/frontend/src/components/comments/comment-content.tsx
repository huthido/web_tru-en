import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';

/**
 * Hiển thị nội dung bình luận dạng text thuần (React tự escape — không dùng
 * dangerouslySetInnerHTML), biến `@username` thành link tới trang cá nhân.
 *
 * Regex KHÔNG dùng lookbehind (iOS 12 Safari không hỗ trợ): nhóm 1 bắt ký
 * tự đứng trước `@` để "a@b.com" không bị coi là nhắc tên — khớp với
 * `extractMentions` ở backend. Dấu chấm cuối ("@abc.") được trả về text.
 */
const MENTION_RE = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_.]{3,32})/g;

export function renderCommentContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(MENTION_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const raw = m[2];
    const name = raw.replace(/\.+$/, '');
    if (name.length < 3) continue;
    const atIndex = m.index + m[1].length;
    if (atIndex > last) nodes.push(content.slice(last, atIndex));
    nodes.push(
      <Link
        key={`m-${atIndex}`}
        href={`/u/${encodeURIComponent(name)}`}
        className="font-medium text-primary hover:underline"
      >
        @{name}
      </Link>,
    );
    last = atIndex + 1 + name.length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

export function CommentContent({ content }: { content: string }) {
  if (!content || content.indexOf('@') === -1) return <>{content}</>;
  return (
    <>
      {renderCommentContent(content).map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </>
  );
}
