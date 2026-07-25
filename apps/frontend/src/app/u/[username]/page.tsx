import { redirect } from 'next/navigation';

/**
 * Trang gốc /u/[username] chuyển thẳng sang trang Truyện. Redirect phía server
 * nên không nhấp nháy; link chia sẻ /u/username vẫn hoạt động, người xem đáp
 * xuống tab Truyện mặc định.
 */
export default function ProfileIndexPage({ params }: { params: { username: string } }) {
  redirect(`/u/${encodeURIComponent(params.username)}/truyen`);
}
