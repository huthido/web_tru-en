/** Lệch múi giờ Việt Nam (UTC+7, không có giờ mùa hè). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày theo giờ Việt Nam dạng 'YYYY-MM-DD' (mốc điểm danh / nhiệm vụ ngày). */
export function vnDay(date: Date = new Date()): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Ngày liền trước của một chuỗi 'YYYY-MM-DD'. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Thời điểm 00:00 giờ Việt Nam của một ngày 'YYYY-MM-DD' (dạng Date UTC). */
export function vnDayStart(day: string): Date {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - VN_OFFSET_MS);
}
