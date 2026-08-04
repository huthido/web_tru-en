/**
 * Structured data (schema.org) cho Google.
 *
 * Server component: chỉ in ra thẻ <script type="application/ld+json">, không
 * kéo theo JS phía client.
 */
export function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <script
      type="application/ld+json"
      // Dữ liệu do chính server dựng từ API, không phải input người dùng thô;
      // vẫn chặn "</script>" để an toàn tuyệt đối.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
