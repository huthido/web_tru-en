# Đổi slug 82 truyện — thứ tự triển khai

## Vì sao phải đổi

`generateSlug` từng xoá luôn nguyên âm có dấu thay vì chuyển thành chữ không dấu:

```
"Vết Khâu Của Quỷ"   → /vt-khu-ca-qu       (đáng lẽ /vet-khau-cua-quy)
"Tùy Đạo Hành"       → /tu-ao-hnh          (đáng lẽ /tuy-dao-hanh)
"Yên Vũ"             → /yn-v               (đáng lẽ /yen-vu)
```

**82/128 truyện công khai** đang mang URL vô nghĩa. Hàm đã được sửa từ trước nên
truyện mới sinh slug đúng, nhưng dữ liệu cũ thì không tự sửa.

Từ khoá tiếng Việt trong URL là một tín hiệu xếp hạng, và `/vt-khu-ca-qu` không
mang thông tin gì cho cả người đọc lẫn Google.

## Vì sao làm NGAY bây giờ

Google gần như chưa index URL nào của site — đó chính là vấn đề vừa được sửa
trong đợt này. Đổi lúc này gần như miễn phí: không có thứ hạng nào để mất, không
có backlink nào để giữ. Sau khi 1.622 URL đã vào chỉ mục, cùng việc này sẽ tốn
hơn nhiều.

## Phạm vi

Chỉ đổi **slug truyện**. Slug chương cũng méo (`chap-1-khi-u`) nhưng không đụng
tới, vì:

- Redirect wildcard `/truyen/{cũ}/:path*` → `/truyen/{mới}/:path*` đã kéo theo
  toàn bộ URL chương, nên không URL nào gãy.
- Đổi slug chương sẽ cần khoảng 1.500 rule redirect — quá nhiều cho
  `next.config.js`, mà slug chương gần như không mang giá trị SEO (từ khoá chính
  nằm ở slug truyện).

## Một nguồn sự thật

`apps/frontend/slug-redirects.json` là file duy nhất quyết định việc đổi:

- `next.config.js` đọc nó để sinh 301 (2 rule mỗi truyện = 164 rule).
- `apply-slug-map.js` đọc CHÍNH file đó để ghi DB — script **không** tự tính
  slug mới.

Nhờ vậy DB và bảng redirect không thể lệch nhau.

## Thứ tự chạy

Có một khoảng vài phút không tránh được, khi redirect đã live mà DB chưa đổi:
URL cũ sẽ 301 sang URL mới còn 404. Ngược lại (đổi DB trước) thì URL cũ 404
ngay. Cả hai đều ngắn và ít rủi ro ở thời điểm này vì Google chưa index. Thứ tự
dưới đây chọn phương án đầu — nó ít tệ hơn, vì 301 tới trang 404 vẫn cho Google
biết URL đã dời, còn 404 trần thì không.

**1. Kiểm tra bảng ánh xạ trước khi làm gì**

```bash
docker cp apps/frontend/slug-redirects.json <backend>:/tmp/slugs.json
docker exec <backend> node dist/scripts/apply-slug-map.js
```

Gọi thẳng `node`, KHÔNG dùng `npm run`: npm không chuyển tham số vị trí xuống
script, nên `npm run fix:slugs /tmp/slugs.json` chạy như thể không có đường dẫn.
Script mặc định đọc `/tmp/slugs.json` nên không cần truyền gì thêm.

Dry-run. Script kiểm tra TOÀN BỘ trước khi ghi một dòng nào: mọi slug `from` phải
tồn tại, không `to` nào trùng nhau, không `to` nào bị một truyện ngoài danh sách
chiếm. Có bất kỳ vấn đề gì là dừng, không ghi gì.

Kết quả mong đợi: `82 truyện cần đổi, 0 đã đổi từ trước`.

**2. Deploy CẢ backend LẪN frontend**

Frontend mới đã chứa `slug-redirects.json` + `next.config.js` mới. Backend mới có
endpoint `/stories/sitemap-data` mà sitemap giờ phụ thuộc vào — deploy thiếu nó
thì sitemap trả 5xx cho tới khi backend lên (Google giữ bản cũ, không mất gì,
nhưng đừng hoảng khi thấy 500).

**3. Ghi DB ngay sau khi frontend lên**

```bash
docker exec <backend> node dist/scripts/apply-slug-map.js --apply
```

Ghi trong một transaction, hai pha: dời hết sang slug tạm rồi mới đặt slug đích.
Cần hai pha vì hai truyện có thể hoán đổi slug cho nhau, ghi thẳng sẽ vướng ràng
buộc unique ngay bước đầu.

**4. Kiểm chứng**

```bash
# 301 phải trỏ đúng
curl -sI https://yeuyeu.net/truyen/vt-khu-ca-qu | grep -iE "^(HTTP|location)"

# URL chương cũ cũng phải đi theo
curl -sI https://yeuyeu.net/truyen/vt-khu-ca-qu/chuong/chap-1-khi-u | grep -i location

# URL mới phải 200 và có nội dung
curl -s https://yeuyeu.net/truyen/vet-khau-cua-quy | grep -c "Vết Khâu"

# sitemap phải dùng slug mới, không còn slug cũ
curl -s https://yeuyeu.net/sitemap.xml | grep -c "vt-khu-ca-qu"   # kỳ vọng 0
curl -s https://yeuyeu.net/sitemap.xml | grep -c "<loc>"          # vẫn ~1.622
```

**5. Nộp lại sitemap** trong Search Console.

`lastmod` của truyện giờ lấy mốc mới nhất trong (`lastChapterAt`, chương mới
nhất, `updatedAt`) thay vì ưu tiên `lastChapterAt`. Đổi slug chỉ đụng
`updatedAt`, nên nếu giữ logic cũ thì `lastmod` đứng yên và Google không có lý do
gì để crawl lại URL mới.

## Chạy lại

Script idempotent: lần chạy thứ hai thấy slug `from` không còn tồn tại nhưng `to`
đã có, nó tính là "đã đổi từ trước" và bỏ qua. Bảng 301 cũng vô hại khi chạy lại
— redirect từ một slug không còn ai dùng.

## Nếu cần lùi lại

Đảo `from`/`to` trong file JSON rồi chạy lại script. Bảng 301 trong
`next.config.js` phải gỡ hoặc đảo theo, nếu không nó sẽ đá URL mới về URL cũ.
