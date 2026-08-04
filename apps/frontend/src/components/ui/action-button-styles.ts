/**
 * Bộ class dùng chung cho cụm nút hành động ở trang chi tiết truyện.
 *
 * Trước đây mỗi nút tự chọn một token màu khác nhau, và ba trong số đó chọn sai:
 *
 *   Đọc truyện        bg-primary            #635d60
 *   Ủng hộ tác giả    bg-tertiary           #6a5a61  ← lệch #635d60 không đáng kể
 *   Tài trợ quảng cáo bg-primary-container  #fcf2f6  ← TRÙNG HỆT --md-background
 *   Theo dõi (icon)   bg-primary            #635d60  ← tối ngang CTA chính
 *   Thích, Chia sẻ    bg-surface-container-high      ← nhạt
 *
 * Hai nút đầu gần như cùng màu nên không tạo ra phân cấp nào, chỉ trông như lỗi.
 * Nút thứ ba dùng `primary-container`, mà trong theme sáng token này đúng bằng
 * màu nền trang — nên nó không hiện ra như một cái nút, chỉ là chữ trôi nổi.
 *
 * Ở đây quy về ba bậc rõ ràng:
 *
 *   FILLED  — đúng MỘT nút cho hành động chính (Đọc truyện)
 *   TONAL   — các hành động phụ (Ủng hộ, Tài trợ)
 *   ICON    — nút chỉ có icon, cùng nền tonal; trạng thái bật thể hiện bằng
 *             ACTIVE chứ không đổi hẳn sang nền tối
 *
 * File đặt trong `src/components` chứ không phải `src/lib` vì content glob của
 * Tailwind chỉ quét pages/components/app — để ở lib thì class bị purge.
 */

/** Layout + kích thước + bo góc dùng chung cho nút có chữ. */
const LABEL_BASE =
  'inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 ' +
  'rounded-lg text-sm md:text-base font-medium ' +
  'transition-all duration-300 hover:scale-105 active:scale-95';

/** Hành động chính — chỉ dùng cho MỘT nút trên mỗi màn hình. */
export const BTN_FILLED = `${LABEL_BASE} bg-primary hover:bg-primary/90 text-on-primary`;

/** Hành động phụ. */
export const BTN_TONAL =
  `${LABEL_BASE} bg-surface-container-high hover:bg-surface-container-highest text-on-surface`;

/** Nút vô hiệu hoá (ví dụ truyện chưa có chương). */
export const BTN_DISABLED =
  `${LABEL_BASE} bg-surface-container text-on-surface-variant ` +
  'cursor-not-allowed hover:scale-100 active:scale-100';

/** Nút chỉ có icon — khớp chiều cao với nút có chữ ở cả hai breakpoint. */
const ICON_BASE =
  'inline-flex items-center justify-center w-[44px] h-[44px] md:w-[48px] md:h-[48px] p-0 ' +
  'rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';

/** Trạng thái mặc định (chưa bật) của nút icon. */
export const ICON_BTN =
  `${ICON_BASE} bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant`;

/**
 * Trạng thái đã bật của nút icon (đã theo dõi).
 *
 * Nền tối = ĐANG BẬT. Trước đây ngược lại: nền tối nghĩa là "chưa theo dõi, bấm
 * đi" — nên ở trạng thái mặc định nút này tối ngang nút Đọc truyện và tranh mất
 * sự chú ý của hành động chính, lại lệch hẳn với hai nút icon bên cạnh.
 */
export const ICON_BTN_ACTIVE = `${ICON_BASE} bg-primary hover:bg-primary/90 text-on-primary`;

/** Sắc đỏ của trạng thái "đã thích" — dùng chung cho hai biến thể dưới. */
const LIKED_COLORS =
  'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 ' +
  'text-red-600 dark:text-red-400';

/** Đã thích, dạng nút icon. */
export const ICON_BTN_LIKED = `${ICON_BASE} ${LIKED_COLORS}`;

/** Đã thích, dạng nút có chữ / có số đếm. */
export const BTN_LIKED = `${LABEL_BASE} ${LIKED_COLORS}`;
