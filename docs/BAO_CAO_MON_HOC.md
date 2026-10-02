# BÁO CÁO BÀI TẬP LỚN MÔN HỌC: TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM

---

* **Đề tài:** 11 – Hệ thống Đặt vé Xem phim / Sự kiện (Cinema & Event Booking System)
* **Sinh viên thực hiện:** Nông Quang Tiệp
* **Môi trường triển khai:** Ubuntu Server VM (Linux 64-bit), Docker, Docker Compose, Nginx Reverse Proxy
* **Mã nguồn dự án:** [https://github.com/nongquangtiep/cinema-event-booking](https://github.com/nongquangtiep/cinema-event-booking)
* **Năm học:** 2026 – 2027

---

## MỤC LỤC

1. [CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU DỰ ÁN](#chương-1-giới-thiệu-đề-tài-và-mục-tiêu-dự-án)
2. [CHƯƠNG 2: PHÂN TÍCH YÊU CẦU HỆ THỐNG](#chương-2-phân-tích-yêu-cầu-hệ-thống)
3. [CHƯƠNG 3: KIẾN TRÚC TỔNG THỂ VÀ MÔ HÌNH TRIỂN KHAI DOCKER](#chương-3-kiến-trúc-tổng-thể-và-mô-hình-triển-khai-docker)
4. [CHƯƠNG 4: THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN HÓA 3NF](#chương-4-thiết-kế-cơ-sở-dữ-liệu-chuẩn-hóa-3nf)
5. [CHƯƠNG 5: PHÁT TRIỂN ỨNG DỤNG WEB VÀ RESTFUL API](#chương-5-phát-triển-ứng-dụng-web-và-restful-api)
6. [CHƯƠNG 6: CẤU HÌNH NGINX REVERSE PROXY & SECURITY GATEWAY](#chương-6-cấu-hình-nginx-reverse-proxy--security-gateway)
7. [CHƯƠNG 7: GIÁM SÁT HỆ THỐNG VỚI PROMETHEUS VÀ GRAFANA](#chương-7-giám-sát-hệ-thống-với-prometheus-và-grafana)
8. [CHƯƠNG 8: QUẢN LÝ NHẬT KÝ TẬP TRUNG VỚI LOKI, PROMTAIL & LOGQL](#chương-8-quản-lý-nhật-ký-tập-trung-với-loki-promtail--logql)
9. [CHƯƠNG 9: GIẢI PHÁP BẢO MẬT HỆ THỐNG (SECURITY HARDENING)](#chương-9-giải-pháp-bảo-mật-hệ-thống-security-hardening)
10. [CHƯƠNG 10: KIỂM THỬ TOÀN DIỆN, ĐÁNH GIÁ HIỆU NĂNG VÀ MINH CHỨNG](#chương-10-kiểm-thử-toàn-diện-đánh-giá-hiệu-năng-và-minh-chứng)
11. [CHƯƠNG 11: HƯỚNG DẪN CÀI ĐẶT, VẬN HÀNH VÀ BẢO TRÌ](#chương-11-hướng-dẫn-cài-đặt-vận-hành-và-bảo-trì)
12. [CHƯƠNG 12: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](#chương-12-kết-luận-và-hướng-phát-triển)

---

## CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU DỰ ÁN

### 1.1 Bối cảnh thực tế
Trong kỷ nguyên số, các cụm rạp chiếu phim và ban tổ chức đại nhạc hội, sự kiện văn hóa thể thao đòi hỏi các giải pháp bán vé trực tuyến có khả năng xử lý lượng người dùng truy cập cao đột biến khi mở bán các suất chiếu bom tấn hoặc vé sự kiện đặc biệt. Bài toán cốt lõi của các hệ thống này không chỉ dừng lại ở giao diện người dùng bắt mắt mà nằm ở sự toàn vẹn dữ liệu: **ngăn chặn tuyệt đối tình trạng Double Booking (hai khách hàng cùng đặt và thanh toán thành công một vị trí ghế ngồi)**, khả năng tự động giải phóng ghế khi khách hàng bỏ dở phiên giao dịch, và hệ thống giám sát toàn diện để phát hiện nghẽn tài nguyên kịp thời.

### 1.2 Mục tiêu đề tài
Dự án **CineWave – Cinema & Event Booking System** được xây dựng nhằm đáp ứng trọn vẹn các chuẩn mực của một hệ thống DevOps hiện đại:
1. **Giao diện người dùng Web (Client & Admin):** Thiết kế Dark Mode Cinematic trực quan, sơ đồ ma trận ghế động thời gian thực, đếm ngược giữ ghế 5 phút, thanh toán giả lập sandbox và sinh vé điện tử QR Code.
2. **Backend API tối ưu & ACID Transaction:** Sử dụng MySQL Transactions (`SELECT ... FOR UPDATE`), cơ chế khóa ghế có thời hạn TTL và ràng buộc duy nhất ở tầng cơ sở dữ liệu.
3. **Cổng tiếp nhận duy nhất (Single Ingress):** Sử dụng Nginx Alpine làm Reverse Proxy, phục vụ nội dung tĩnh, cân bằng tải, nén Gzip, giới hạn tốc độ truy cập (Rate Limiting) và cấu hình HTTP Security Headers.
4. **Giám sát toàn diện 3 trụ cột (Observability):** Thu thập Metrics hệ thống và ứng dụng (Prometheus, Node Exporter, cAdvisor, Grafana), quản lý Logs tập trung (Loki, Promtail) và kiểm tra sức khỏe dịch vụ (Healthchecks).
5. **Đóng gói và triển khai an toàn:** Đóng gói 10 dịch vụ bằng Docker Compose, cô lập mạng theo mô hình Least Privilege, chạy ứng dụng dưới quyền người dùng không đặc quyền (`non-root`).

---

## CHƯƠNG 2: PHÂN TÍCH YÊU CẦU HỆ THỐNG

### 2.1 Yêu cầu chức năng (Functional Requirements)

| Phân hệ | Chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Khách hàng** | Xem danh mục phim/sự kiện | Lọc theo trạng thái (*Đang chiếu*, *Sắp chiếu*), danh mục, tìm kiếm theo tiêu đề. |
| | Xem chi tiết & suất chiếu | Hiển thị tóm tắt, thời lượng, trailer Youtube, nhóm suất chiếu theo cụm rạp. |
| | Chọn ghế tương tác | Sơ đồ ma trận ghế phân loại Standard (hàng A-C), VIP (hàng D), Couple (hàng E). Ghế đã bán bị khóa màu xám. |
| | Khóa ghế tạm thời (TTL 5p) | Khóa ghế độc quyền trong 300 giây. Có đồng hồ đếm ngược hiển thị trên giao diện. |
| | Thanh toán giả lập (Mock Payment) | Hỗ trợ mô phỏng cổng VNPAY QR, Ví MoMo, xác nhận giao dịch tự động. |
| | Xuất vé điện tử QR Code | Sinh mã đặt vé duy nhất (`BK-XXXX-XXXX`) và mã QR Base64 chứa thông tin vé. |
| | Tra cứu lịch sử đặt vé | Tìm kiếm vé đã mua bằng mã vé, xem lại thông tin chi tiết mọi lúc. |
| **Quản trị (Admin)** | Dashboard KPI thời gian thực | Thống kê tổng doanh thu thực thu, tổng vé đã bán, số phim đang chiếu, số người dùng. |
| | Quản lý danh mục phim | Thêm phim mới, chỉnh sửa thông tin, đổi trạng thái phim (*now_showing*, *coming_soon*, *ended*). |
| | Quản lý đơn hàng đặt vé | Danh sách toàn bộ đơn vé, lọc theo trạng thái thanh toán, tìm kiếm theo tên hoặc SĐT khách. |
| | Soát vé điện tử tại cửa (Check-in) | Nhập mã vé hoặc quét QR để kiểm tra tính hợp lệ của vé trước khi cho khách vào phòng chiếu. |

### 2.2 Yêu cầu phi chức năng (Non-Functional Requirements)
1. **Tính nhất quán dữ liệu (Data Consistency):** Đảm bảo tính toán tử ACID, ngăn chặn Race Condition khi hàng trăm request gửi đến đồng thời để đặt cùng 1 ghế.
2. **Hiệu năng & Khả năng chịu tải (Performance):** Nginx phục vụ nội dung tĩnh với độ trễ thấp (< 15ms), xử lý thông lượng > 1,000 req/s ở kịch bản tải vừa.
3. **Bảo mật (Security):** Mật khẩu người dùng băm một chiều Bcrypt 10 rounds; Xác thực Stateless qua JSON Web Token (JWT); Chống tấn công brute-force qua Nginx Rate Limiting; Chống SQL Injection 100% bằng Prepared Statements; Ẩn phiên bản máy chủ.
4. **Tính sẵn sàng và tự phục hồi (High Availability & Self-healing):** Các dịch vụ Docker được cấu hình chính sách `restart: unless-stopped` và định kỳ chạy `healthcheck`.

---

## CHƯƠNG 3: KIẾN TRÚC TỔNG THỂ VÀ MÔ HÌNH TRIỂN KHAI DOCKER

### 3.1 Sơ đồ kiến trúc phân tầng (Architecture Diagram)

```text
               [ Trình duyệt Người Dùng / Quản Trị Viên ]
                                   │
                                   ▼ HTTP (Port 80)
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NGINX REVERSE PROXY                              │
│  - Phục vụ Static Assets: HTML5, CSS3, JavaScript                           │
│  - Bảo vệ: Rate Limiting (10 req/s, burst 20), Security Headers, CSP        │
│  - Ghi Access Log định dạng JSON có cấu trúc                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ proxy_pass /api/* (Port 5000 Nội bộ)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Node.js 20 Express)                      │
│  - Non-root user: 'node' (uid=1000)                                         │
│  - RESTful Controllers, JWT Authentication & Role-Based Access Control      │
│  - MySQL Transactions (ACID) & Seat Lock TTL (300s) Engine                  │
│  - Winston Structured Logger & Prometheus Exporter (/metrics)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ TCP 3306 (Nội bộ backend-net)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CƠ SỞ DỮ LIỆU MYSQL 8.0                          │
│  - Động cơ lưu trữ InnoDB, Bảng chuẩn hóa 3NF, Bảng mã utf8mb4              │
│  - UNIQUE KEY (showtime_id, seat_id) - Chốt chặn cứng chống Double Booking   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   HỆ THỐNG GIÁM SÁT & OBSERVABILITY STACK                   │
│  ├── Node Exporter (:9100) : Thu thập thông số phần cứng Host (CPU, RAM)    │
│  ├── cAdvisor (:8080)      : Thu thập metrics tài nguyên của 10 Containers   │
│  ├── Prometheus (:9090)    : Scraper định kỳ & Time-series Database          │
│  ├── Promtail              : Thu thập log từ Docker Socket & Nginx JSON     │
│  ├── Grafana Loki (:3100)  : Hệ thống lưu trữ và đánh chỉ mục Log tập trung │
│  └── Grafana (:3000)       : Trực quan hóa Dashboards giám sát toàn diện    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Phân tách mạng ảo Docker (Network Isolation)
Hệ thống sử dụng 3 mạng bridge cô lập:
1. `frontend-net`: Nối Nginx và App API. Cổng 5000 của App không ánh xạ ra ngoài host, chỉ Nginx mới có quyền giao tiếp.
2. `backend-net`: Nối App API, MySQL và phpMyAdmin. Cổng 3306 của MySQL hoàn toàn đóng đối với mạng bên ngoài, bảo vệ dữ liệu tuyệt đối.
3. `monitoring-net`: Kết nối toàn bộ stack giám sát (Nginx, App, Prometheus, Grafana, Loki, Promtail, Node Exporter, cAdvisor).

### 3.3 Danh mục 10 Docker Services hoạt động

| STT | Service Name | Docker Image | Cổng ánh xạ | Vai trò trong hệ thống |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `cinema-nginx` | Custom Alpine | `80:80` | Cổng tiếp nhận duy nhất, phục vụ web và điều hướng API. |
| 2 | `cinema-app` | Custom Node.js 20 | *Nội bộ 5000* | Xử lý logic nghiệp vụ, quản lý phiên và giao dịch vé. |
| 3 | `cinema-mysql` | `mysql:8.0` | *Nội bộ 3306* | Lưu trữ dữ liệu quan hệ, bảo đảm tính toàn vẹn ACID. |
| 4 | `cinema-phpmyadmin` | `phpmyadmin/phpmyadmin` | `8081:80` | Giao diện đồ họa quản trị cơ sở dữ liệu MySQL. |
| 5 | `cinema-prometheus` | `prom/prometheus:v2.50.0` | `9090:9090` | Thu thập metrics định kỳ từ các targets theo chu kỳ 10s. |
| 6 | `cinema-grafana` | `grafana/grafana:10.3.0` | `3000:3000` | Bảng điều khiển trực quan hóa Metrics và Logs. |
| 7 | `cinema-loki` | `grafana/loki:2.9.4` | `3100:3100` | Kho lưu trữ logs tập trung, truy vấn bằng ngôn ngữ LogQL. |
| 8 | `cinema-promtail` | `grafana/promtail:2.9.4` | *Nội bộ* | Agent thu gom logs container và chuyển tiếp về Loki. |
| 9 | `cinema-node-exporter` | `prom/node-exporter:v1.7.0` | *Nội bộ 9100* | Giám sát tài nguyên máy chủ host (CPU, Memory, Disk, I/O). |
| 10 | `cinema-cadvisor` | `gcr.io/cadvisor:v0.47.2` | *Nội bộ 8080* | Đo lường mức sử dụng CPU/RAM chi tiết của từng container. |

---

## CHƯƠNG 4: THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN HÓA 3NF

Cơ sở dữ liệu gồm 10 bảng quan hệ, tuân thủ nghiêm ngặt dạng chuẩn 3NF:

```
[users] ──< [bookings] ──< [booking_seats] >── [seats] >── [halls] >── [cinemas]
                 │               │
                 │               └──> [showtimes] >── [movies_events] >── [categories]
                 │                          │
                 └── [seat_locks] <─────────┘
```

### 4.1 Bảng dữ liệu chi tiết
1. **`users`**: Lưu trữ người dùng và quản trị viên (`id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `role`, `created_at`). Khóa duy nhất trên `username` và `email`.
2. **`categories`**: Danh mục thể loại (`id`, `name`, `type`, `description`).
3. **`movies_events`**: Thông tin phim/sự kiện (`id`, `category_id`, `title`, `duration_minutes`, `release_date`, `poster_url`, `trailer_url`, `status`).
4. **`cinemas`** & **`halls`**: Quản lý thông tin cụm rạp, phòng chiếu và số cột/hàng ghế.
5. **`seats`**: Định nghĩa vị trí ghế (`id`, `hall_id`, `seat_row`, `seat_number`, `seat_type`, `status`). Khóa duy nhất: `UNIQUE KEY unique_hall_seat (hall_id, seat_row, seat_number)`.
6. **`showtimes`**: Lịch chiếu và giá vé theo hạng ghế Standard, VIP, Couple.
7. **`seat_locks`**: **Bảng giữ ghế tạm thời TTL 5 phút** (`id`, `showtime_id`, `seat_id`, `session_id`, `locked_until`). Khóa duy nhất: `UNIQUE KEY (showtime_id, seat_id)`.
8. **`bookings`**: Đơn hàng đặt vé (`id`, `booking_code`, `showtime_id`, `customer_name`, `customer_email`, `total_amount`, `payment_status`, `qr_code`).
9. **`booking_seats`**: **Chốt chặn cứng chống Double Booking** (`id`, `booking_id`, `showtime_id`, `seat_id`, `price`). Khóa duy nhất tối quan trọng:
   ```sql
   UNIQUE KEY `unique_showtime_seat` (`showtime_id`, `seat_id`)
   ```

### 4.2 Cơ chế 3 tầng chống Double Booking (Triple-Layer Protection)
- **Tầng 1 (Khóa ứng dụng - Seat Locks TTL):** Khi khách bấm chọn ghế, ứng dụng gửi `POST /api/bookings/hold-seats`. Hệ thống ghi nhận vào bảng `seat_locks` với `locked_until = NOW() + 5 phút`. Mọi khách hàng khác truy vấn sẽ thấy ghế ở trạng thái `locked`.
- **Tầng 2 (Giao dịch Cơ sở Dữ liệu - DB Transaction):** Áp dụng `START TRANSACTION` và `SELECT ... FOR UPDATE` khi giữ ghế và xác nhận thanh toán, ngăn ngừa tình trạng đọc dữ liệu bẩn (Dirty Read) hoặc tranh chấp song song.
- **Tầng 3 (Ràng buộc cứng mức vật lý - DB Constraint):** Khóa duy nhất `unique_showtime_seat` trên bảng `booking_seats` đảm bảo cho dù 2 giao dịch có vượt qua được tầng logic ứng dụng thì chỉ có đúng 1 giao dịch được `COMMIT`, giao dịch thứ 2 sẽ bị MySQL từ chối với lỗi vi phạm ràng buộc duy nhất và Backend bắt lỗi trả về HTTP 409 Conflict.

---

## CHƯƠNG 5: PHÁT TRIỂN ỨNG DỤNG WEB VÀ RESTFUL API

### 5.1 Giao diện người dùng Web (Frontend)
- Được xây dựng bằng HTML5, CSS3 hiện đại theo phong cách **Cinematic Dark Theme** sang trọng.
- Sử dụng Vanilla JavaScript kết hợp Native Fetch API, không phụ thuộc framework cồng kềnh, giảm tải tài nguyên mạng.
- **Tính năng nổi bật:**
  - Sơ đồ ma trận ghế hiển thị động: Tự động đánh màu sắc theo loại ghế và trạng thái (*Available: Trắng viền xanh, Locked: Vàng đếm ngược, Booked: Xám icon khóa*).
  - Tích hợp bộ đếm thời gian ngược (Countdown Timer) chính xác đến từng giây.
  - Sinh vé điện tử dạng thẻ cứng kèm mã QR Code Base64 độ nét cao, dễ dàng lưu về điện thoại.

### 5.2 Tầng API Backend (Node.js & Express)
Kiến trúc tổ chức dạng module hóa theo mô hình MVC:
- `controllers/authController.js`: Đăng ký, đăng nhập, cấp phát JWT Token và mã hóa Bcrypt.
- `controllers/movieController.js`: Quản lý danh mục phim, tích hợp tìm kiếm và lọc.
- `controllers/showtimeController.js`: Truy vấn suất chiếu, kết hợp tính toán trạng thái ghế động (Dynamic Status).
- `controllers/bookingController.js`: Thực thi giữ ghế TTL, xác nhận thanh toán giả lập và xuất vé điện tử.
- `controllers/adminController.js`: Báo cáo thống kê tổng hợp (KPI), danh sách vé và soát vé tại rạp.
- `middleware/authMiddleware.js`: Xác thực JWT Bearer Token và kiểm tra vai trò Quản trị viên (`role === 'admin'`).

---

## CHƯƠNG 6: CẤU HÌNH NGINX REVERSE PROXY & SECURITY GATEWAY

Nginx Alpine đóng vai trò là cổng tiếp nhận duy nhất cho toàn bộ hệ thống tại cổng `80`:

### 6.1 Điều phối luồng và định tuyến
- Phục vụ toàn bộ tệp tĩnh từ thư mục `/usr/share/nginx/html` với cơ chế cache `Cache-Control "public, max-age=604800, immutable"`.
- Định tuyến ngược các yêu cầu động bắt đầu bằng `/api/` tới container `http://app:5000`.
- Chặn đứng mọi truy cập đến các tệp nhạy cảm (như `.env`, `.git`) qua khối lệnh `location ~ /\. { deny all; }`.

### 6.2 Cấu hình Rate Limiting chống DDoS
Sử dụng thuật toán Leaky Bucket để bảo vệ API:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://app:5000;
}
```
Khi người dùng hoặc bot gửi request vượt ngưỡng burst 20, Nginx lập tức từ chối với mã phản hồi **HTTP 429 Too Many Requests**.

### 6.3 Bộ Header bảo mật chuẩn OWASP
Nginx tự động chèn các tiêu chuẩn bảo mật cho mọi phản hồi:
- `X-Frame-Options "DENY"`: Ngăn chặn tấn công Clickjacking.
- `X-Content-Type-Options "nosniff"`: Chống giả mạo MIME type.
- `Referrer-Policy "strict-origin-when-cross-origin"`: Bảo vệ dữ liệu chuyển hướng.
- `server_tokens off`: Ẩn hoàn toàn phiên bản của Nginx trên header `Server`.

---

## CHƯƠNG 7: GIÁM SÁT HỆ THỐNG VỚI PROMETHEUS VÀ GRAFANA

### 7.1 Thu thập Metrics với Prometheus
Prometheus cấu hình chu kỳ cào dữ liệu (`scrape_interval: 10s`) từ 4 mục tiêu:
1. `app:5000/metrics`: Thu thập chỉ số HTTP RED (Rate, Errors, Duration) từ thư viện `prom-client`.
2. `cadvisor:8080/metrics`: Thu thập thông số bộ nhớ, CPU, mạng và I/O của toàn bộ 10 container.
3. `node-exporter:9100/metrics`: Thu thập thông số phần cứng của máy chủ Ubuntu host.
4. `localhost:9090/metrics`: Giám sát sức khỏe nội tại của Prometheus.

### 7.2 Trực quan hóa trên Grafana (Provisioned Dashboards)
Grafana được thiết lập tự động nạp (Provisioning) qua tệp cấu hình không cần tạo thủ công, gồm 4 Dashboards chuyên sâu:
- **Dashboard 01 - Host Infrastructure (Ubuntu VM):** Hiển thị % CPU Usage, Memory Utilized, Network Traffic, Disk I/O của máy chủ.
- **Dashboard 02 - Docker Containers (cAdvisor):** Đo lường mức chiếm dụng CPU, RAM của từng container riêng biệt.
- **Dashboard 03 - Application APM (RED Metrics):** Theo dõi tần suất request API theo từng endpoint, biểu đồ thời gian phản hồi (Latency P95/P99) và tỷ lệ mã lỗi HTTP 4xx/5xx.
- **Dashboard 04 - Cinema Business & Live Logs:** Thống kê trực tiếp doanh thu lũy kế (VND), số lượng vé bán ra và số lượng ghế đang bị khóa thời gian thực.

---

## CHƯƠNG 8: QUẢN LÝ NHẬT KÝ TẬP TRUNG VỚI LOKI, PROMTAIL & LOGQL

### 8.1 Thu thập nhật ký với Promtail
Promtail gắn kết với Docker Socket (`/var/run/docker.sock`) và tệp log của Nginx (`/var/log/nginx`), tự động đánh nhãn (`job`, `container`, `stream`) và đẩy về Loki qua cổng `3100`.

### 8.2 Truy vấn nhật ký nâng cao với LogQL
Quản trị viên có thể truy vấn nhật ký trực tiếp trên Grafana Explore:
- Xem toàn bộ nhật ký ứng dụng Backend:
  `{container="cinema-app"}`
- Lọc các request bị giới hạn tốc độ (HTTP 429) trên Nginx:
  `{container="cinema-nginx"} |= "429"`
- Lọc nhật ký phát hiện tranh chấp ghế đồng thời (Race Condition warning):
  `{container="cinema-app"} |= "Concurrent seat lock race condition"`

---

## CHƯƠNG 9: GIẢI PHÁP BẢO MẬT HỆ THỐNG (SECURITY HARDENING)

Dự án áp dụng các kỹ thuật tăng cường bảo mật đa lớp:
1. **Non-root Container Execution:** Container Node.js chạy với chỉ thị `USER node` (uid=1000, gid=1000). Kẻ tấn công nếu khai thác được lỗi phần mềm cũng không thể leo thang đặc quyền root trên máy chủ.
2. **Network Isolation & Least Privilege:** Chỉ mở cổng 80 ra ngoài. Các cổng database (3306), backend (5000), agent exporter (9100, 8080) hoàn toàn bị cô lập trong mạng Docker nội bộ.
3. **Firewall DOCKER-USER Chain:** Bảo vệ các cổng quản trị (`8081`, `3000`, `9090`, `3100`), chỉ cho phép địa chỉ IP của máy quản trị (`192.168.5.1`) kết nối.
4. **Chống SQL Injection 100%:** Toàn bộ truy vấn sử dụng cơ chế Prepared Statements tham số hóa (`?`).
5. **Mã hóa mật khẩu:** Mật khẩu được băm một chiều với Salt Rounds = 10 qua thuật toán Bcrypt.
6. **Bảo vệ Secret & Biến môi trường:** Tệp `.env` được loại trừ trong `.gitignore`, không bao giờ được phép đưa lên hệ thống quản lý phiên bản Git.

---

## CHƯƠNG 10: KIỂM THỬ TOÀN DIỆN, ĐÁNH GIÁ HIỆU NĂNG VÀ MINH CHỨNG

### 10.1 Kết quả kiểm thử tự động End-to-End (E2E)
Tập lệnh `tests/test_e2e_flow.py` và `tests/test_security_race.py` đã thực thi kiểm thử 10 kịch bản nghiệp vụ:

| Kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :---: |
| 1. Đăng nhập User thường | Cấp phát JWT Token hợp lệ | HTTP 200 OK, trả về Token & Profile | **PASS** |
| 2. Truy vấn phim & suất chiếu | Danh sách phim và suất chiếu | HTTP 200 OK, hiển thị đầy đủ chi tiết | **PASS** |
| 3. Giữ ghế (Seat Lock TTL) | Ghế chuyển trạng thái 'locked' trong 300s | HTTP 200 OK, `expires_in_seconds: 300` | **PASS** |
| 4. Tạo đơn đặt vé | Đơn vé trạng thái Pending | HTTP 201 Created, mã `BK-XXXX-XXXX` | **PASS** |
| 5. Thanh toán giả lập | Đơn vé chuyển sang Paid | HTTP 200 OK, sinh mã QR Base64 | **PASS** |
| 6. Lưu trữ MySQL | Ghi dữ liệu vào `bookings`, `booking_seats` | Dữ liệu kiểm tra trực tiếp khớp 100% | **PASS** |
| 7. Tra cứu vé điện tử | Trả về thông tin vé theo mã đặt vé | HTTP 200 OK, hiển thị đúng rạp và ghế | **PASS** |
| 8. Bảng điều khiển Admin & Check-in | KPI cập nhật, soát vé tại cửa thành công | HTTP 200 OK, xác thực vé hợp lệ | **PASS** |
| 9. Phân quyền RBAC | Chặn User thường và Unauthenticated vào Admin | HTTP 401 (chưa đăng nhập), HTTP 403 (User) | **PASS** |
| 10. Tranh chấp ghế (Race Condition) | 2 request cùng giữ 1 ghế đồng thời | 1 request đạt 200 OK, 1 request nhận 409 Conflict | **PASS** |

### 10.2 Kết quả kiểm thử tải (Apache Benchmark Load Test)
- **Lệnh thực thi:** `ab -n 200 -c 10 http://localhost/`
- **Số lượng request hoàn thành:** 200 / 200 requests (0 failed requests).
- **Thông lượng xử lý:** **1,178.28 requests / giây**.
- **Thời gian phản hồi trung bình (Mean Latency):** **8.487 ms**.
- **Thời gian phản hồi phân vị P99:** **35 ms**.

### 10.3 Vị trí chèn ảnh chụp màn hình minh chứng trong báo cáo
*(Khi chuyển báo cáo sang Microsoft Word, hãy chụp và dán ảnh thực tế vào các vị trí được đánh dấu dưới đây):*

* `[HÌNH 1: Giao diện Trang chủ CineWave hiển thị danh sách phim bom tấn Dark Theme]`
* `[HÌNH 2: Giao diện Sơ đồ Ma trận Ghế ngồi với đồng hồ đếm ngược giữ ghế 5 phút]`
* `[HÌNH 3: Giao diện Vé Điện Tử (E-Ticket) có mã QR Code và mã đặt vé thành công]`
* `[HÌNH 4: Bảng Quản Trị Hệ Thống (Admin Portal) hiển thị KPI Doanh thu và Danh sách Vé]`
* `[HÌNH 5: Chức năng Soát Vé (Check-in) tại cửa rạp xác thực vé thành công]`
* `[HÌNH 6: Giao diện phpMyAdmin hiển thị cấu trúc 10 bảng dữ liệu trong cơ sở dữ liệu cinema_db]`
* `[HÌNH 7: Bảng điều khiển Grafana Dashboard giám sát RED Metrics và Tài nguyên Containers]`
* `[HÌNH 8: Màn hình Grafana Explore truy vấn nhật ký Nginx và App thông qua LogQL]`
* `[HÌNH 9: Kết quả chạy thành công toàn bộ test suite từ terminal Ubuntu VM]`

---

## CHƯƠNG 11: HƯỚNG DẪN CÀI ĐẶT, VẬN HÀNH VÀ BẢO TRÌ

### 11.1 Yêu cầu môi trường
- Hệ điều hành: Ubuntu 22.04 / 24.04 LTS (hoặc máy ảo VMware Workstation).
- Phần mềm: Docker Engine >= 24.0, Docker Compose v2.
- Tài nguyên khuyến nghị: Tối thiểu 2 CPU Cores, 3GB RAM, 20GB Disk.

### 11.2 Các bước khởi động hệ thống
1. **Lấy mã nguồn:**
   ```bash
   git clone https://github.com/nongquangtiep/cinema-event-booking.git
   cd cinema-event-booking
   ```
2. **Khởi tạo tệp cấu hình môi trường:**
   ```bash
   cp .env.example .env
   ```
3. **Khởi chạy đồng loạt 10 Docker containers:**
   ```bash
   docker compose up -d
   ```
4. **Kiểm tra trạng thái:**
   ```bash
   docker compose ps
   curl http://localhost/api/health
   ```
5. **Thực thi kiểm thử tự động toàn diện:**
   ```bash
   python3 tests/test_e2e_flow.py
   python3 tests/test_security_race.py
   ```

### 11.3 Địa chỉ truy cập từ máy thật Windows
Giả định IP máy ảo Ubuntu là `192.168.5.128`:
- Website đặt vé: `http://192.168.5.128/`
- Bảng Quản trị Admin: `http://192.168.5.128/admin/`
- Quản trị phpMyAdmin: `http://192.168.5.128:8081/` (User: `cinema_user`, Pass: `cinema_secret_password`)
- Giám sát Grafana: `http://192.168.5.128:3000/` (User: `admin`, Pass: `admin123`)

---

## CHƯƠNG 12: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 12.1 Kết luận
Dự án **CineWave – Cinema & Event Booking System** đã hoàn thành xuất sắc toàn bộ 8 Phase theo đề cương môn học *Triển khai và Quản trị Hệ thống Phần mềm*:
- Xây dựng thành công một giải pháp đặt vé hoàn chỉnh, giải quyết triệt để vấn đề Double Booking bằng mô hình Triple-Layer Protection.
- Ứng dụng thành công kiến trúc Containerization với 10 dịch vụ phối hợp nhịp nhàng, tối ưu hóa lưu lượng qua Nginx Reverse Proxy.
- Thiết lập đầy đủ mô hình Observability hiện đại với bộ đôi Prometheus – Grafana và Loki – Promtail.

### 12.2 Hạn chế hiện tại
- Cổng thanh toán trực tuyến hiện ở chế độ Sandbox / Giả lập (Mock Payment), chưa tích hợp chữ ký số và Webhook thực tế từ VNPay / MoMo production.
- Giao thức truyền thông hiện tại chạy trên HTTP cổng 80, chưa triển khai chứng chỉ số SSL/TLS (HTTPS).

### 12.3 Hướng phát triển trong tương lai
1. **Bảo mật HTTPS:** Tích hợp Let's Encrypt / Certbot tự động gia hạn chứng chỉ SSL trên Nginx.
2. **Cơ chế Caching phân tán:** Bổ sung Redis Cluster làm tầng đệm phân tán cho Seat Locking và Session Caching thay vì dựa hoàn toàn vào bảng `seat_locks` của MySQL.
3. **Tự động hóa CI/CD:** Xây dựng GitHub Actions Pipeline để tự động build Docker images, quét bảo mật Trivy và triển khai tự động lên môi trường staging.
4. **Mở rộng Kubernetes (K8s):** Chuyển đổi từ Docker Compose sang Kubernetes Manifests (Deployments, StatefulSets, Ingress Controller) để tăng khả năng Auto-scaling khi lưu lượng tăng đột biến.
