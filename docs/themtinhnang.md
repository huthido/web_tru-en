# TÀI LIỆU TÍNH NĂNG GIỮ CHÂN NGƯỜI DÙNG
**Dành cho App/Web Đọc Truyện – Viết Truyện Yêu**

---

## 1. MỤC TIÊU HỆ THỐNG
Mục tiêu của các tính năng mới bao gồm:
* Tăng thời gian sử dụng app.
* Tăng tương tác giữa độc giả và tác giả.
  * Tạo động lực để tác giả viết truyện lâu dài.
* Tăng doanh thu cho nền tảng và tác giả.
  * Xây dựng cộng đồng yêu thích truyện ổn định.

---

## 2. HỆ THỐNG XU (COIN SYSTEM)

### 2.1 Mô tả
Người dùng có thể mua “Xu” để sử dụng trong hệ thống. Xu được dùng để:
* Donate cho tác giả.
* Mở khóa chương truyện trả phí.
* Mua truyện VIP.
* Tặng quà.

### 2.2 Chức năng cần có

| Người dùng | Admin |
| :--- | :--- |
| * Xem số dư xu<br>* Nạp xu<br>* Lịch sử giao dịch<br>* Chuyển xu (nếu cho phép) | * Quản lý gói xu<br>* Điều chỉnh giá<br>* Theo dõi giao dịch<br>* Khóa giao dịch bất thường |

### Gói xu
* $50 \text{ xu} = 10.000đ$
* $250 \text{ xu} = 50.000đ$
* $500 \text{ xu} = 100.000đ$
* $1500 \text{ xu} = 200.000đ$

### Thanh toán tích hợp
Đề xuất hỗ trợ các phương thức:
* Ví điện tử
* Chuyển khoản ngân hàng
* QR Banking
* Thẻ quốc tế

---

## 3. DONATE CHO TÁC GIẢ

### Mục tiêu
Giúp độc giả:
* Ủng hộ tác giả yêu thích.
* Tạo tương tác cảm xúc.
  * Khuyến khích tác giả ra chương mới.

### Luồng hoạt động
* **Người dùng:**
  1. Nhấn nút "Ủng hộ tác giả”
  2. Chọn số xu donate
  3. Gửi lời nhắn
  4. Xác nhận donate
* **Tác giả:**
  * Nhận thông báo realtime.
  * Xem danh sách người donate.
  * Xem tổng xu nhận được có thể rút.

### UI đề xuất
Hiển thị ngay dưới chương truyện:
* Donate tác giả
* Top người donate tuần
* Donate gần đây

---

## 4. TRUYỆN TRẢ PHÍ

* **Miễn phí:** Ai cũng đọc được.
* **VIP toàn truyện:** Cần mua để đọc.
* **Freemium:** * Một số chương miễn phí.
  * Các chương sau trả phí *(lưu ý không hiển thị trả phí cho loại truyện này)*.
  * Giá chương tùy theo tác giả trả giá *(nền tảng thu 3% phí)*.

---

## 17. CƠ CHẾ PHÍ NỀN TẢNG (PLATFORM FEE)

### Mục tiêu
Nền tảng sẽ thu 3% phí giao dịch trên các hoạt động kiếm tiền của tác giả nhằm:
* Duy trì hệ thống server.
* Chi phí vận hành.
* Chống gian lận.
* Phát triển tính năng mới.
* Hỗ trợ thanh toán.

### Các giao dịch áp dụng phí

| Loại giao dịch | Có thu phí 3% |
| :--- | :--- |
| Donate tác giả | Có |
| Mua chương trả phí | Có |
| Mua truyện VIP | Có |

### Công thức tính
$$\text{Số xu tác giả nhận} = \text{Tổng xu thanh toán} - 3\%$$

### Dashboard cho tác giả (Thống kê doanh thu)

| Nội dung | Giá trị |
| :--- | :--- |
| Tổng xu nhận | XXX |
| Phí nền tảng | XXX |
| Xu thực nhận | XXX |

* **Doanh thu hôm nay:** xxx

### Cơ chế rút tiền

* **Điều kiện rút (Ví dụ):**
  * Tối thiểu 1000xu.
  * Xác minh tài khoản.
  * Không vi phạm nội dung.
* **Quy trình:**
  1. Tác giả yêu cầu rút.
  2. Admin duyệt.
  3. Hệ thống chuyển khoản.
  4. Trừ xu khỏi ví tác giả.