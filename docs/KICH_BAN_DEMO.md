# KỊCH BẢN THUYẾT TRÌNH VÀ DEMO TOÀN DIỆN HỆ THỐNG CINEWAVE
## Cinema & Event Booking System – Đề tài 11
**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Môi trường triển khai:** Ubuntu VM (IP: `192.168.5.128`), Docker Compose, Nginx, Node.js 20, MySQL 8.0, Observability Stack  
**Người thực hiện:** Nông Quang Tiệp  

---

## NGUYÊN TẮC PHÂN BIỆT 3 MÔI TRƯỜNG TRUY CẬP TRONG KỊCH BẢN

Để đảm bảo buổi demo diễn ra chính xác, người thuyết trình cần phân biệt rõ 3 môi trường thực thi:

1. 💻 **Môi trường Trình duyệt Máy thật Windows:**
   - Sử dụng địa chỉ IP của máy ảo Ubuntu: **`http://192.168.5.128:<port>/`**.
   - **Tuyệt đối không dùng `localhost` trên Windows:** Vì trên máy Windows có thể có dịch vụ khác (như IIS, Skype) đang chiếm các cổng mạng (ví dụ cổng 80).
2. 🐧 **Môi trường Terminal trên Ubuntu VM:**
   - Thao tác trực tiếp trên giao diện dòng lệnh của máy ảo Ubuntu.
   - Có thể sử dụng `http://localhost:<port>/` hoặc `http://127.0.0.1:<port>/` cho các cổng dịch vụ đã được publish ra máy host.
3. 🐳 **Môi trường Bên trong Container Docker (Internal Docker Networks):**
   - Các container giao tiếp với nhau bằng **Docker Service Name** thông qua cơ chế phân giải tên miền nội bộ (Docker DNS).
   - Ví dụ: `http://app:5000`, `mysql:3306`, `http://prometheus:9090`, `http://loki:3100`, `http://node-exporter:9100`, `http://cadvisor:8080`.
   - Các cổng nội bộ này không mở ra máy host nếu không khai báo trong mục `ports:` của `docker-compose.yml`.

---

## BẢNG TỔNG HỢP THÔNG SỐ 10 DOCKER SERVICES

Thông số kỹ thuật được xác minh trực tiếp từ tệp [docker-compose.yml](file:///home/nong-quang-tiep/cinema-event-booking/docker-compose.yml):

| STT | Tên Service | Tên Container | Mạng Docker | Cổng nội bộ | Cổng Host (Publish) | Trạng thái Docker | Cơ chế Healthcheck | Phần Demo |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| 1 | `nginx` | `cinema-nginx` | `frontend-net`, `monitoring-net` | `80` | `0.0.0.0:80` | `Up (healthy)` | `wget http://127.0.0.1:80/nginx-health` | Phần 2, 3 |
| 2 | `app` | `cinema-app` | `frontend-net`, `backend-net`, `monitoring-net` | `5000` | *Không publish* | `Up (healthy)` | `wget http://localhost:5000/api/health` | Phần 3, 4 |
| 3 | `mysql` | `cinema-mysql` | `backend-net` | `3306` | *Không publish* | `Up (healthy)` | `mysqladmin ping` với mật khẩu root | Phần 5 |
| 4 | `phpmyadmin` | `cinema-phpmyadmin` | `backend-net` | `80` | `0.0.0.0:8081` | `Up` | Không cấu hình healthcheck | Phần 5 |
| 5 | `prometheus` | `cinema-prometheus` | `monitoring-net` | `9090` | `0.0.0.0:9090` | `Up` | Không cấu hình healthcheck | Phần 6 |
| 6 | `grafana` | `cinema-grafana` | `monitoring-net` | `3000` | `0.0.0.0:3000` | `Up` | Không cấu hình healthcheck | Phần 7 |
| 7 | `loki` | `cinema-loki` | `monitoring-net` | `3100` | `0.0.0.0:3100` | `Up` | Không cấu hình healthcheck | Phần 8 |
| 8 | `promtail` | `cinema-promtail` | `monitoring-net` | `9080` | *Không publish* | `Up` | Không cấu hình healthcheck | Phần 8 |
| 9 | `node-exporter`| `cinema-node-exporter` | `monitoring-net` | `9100` | *Không publish* | `Up` | Không cấu hình healthcheck | Phần 9 |
| 10 | `cadvisor` | `cinema-cadvisor` | `monitoring-net` | `8080` | *Không publish* | `Up (healthy)` | Healthcheck tích hợp từ base image cAdvisor | Phần 9 |

> [!NOTE]
> **Khối lượng lưu trữ (Named Volumes):** `mysql_data`, `prometheus_data`, `grafana_data`, `loki_data`, `nginx_logs`.  
> **Chính sách khởi động lại (Restart Policy):** Toàn bộ 10 container đều được cấu hình `restart: unless-stopped`.

---

## MỤC LỤC TRÌNH TỰ DEMO
1. [Phần 1: Khởi động, Docker Compose và Kiến trúc mạng phân lớp](#phần-1-khởi-động-docker-compose-và-kiến-trúc-mạng-phân-lớp)
2. [Phần 2: Nginx Reverse Proxy, Security Hardening & Rate Limiting](#phần-2-nginx-reverse-proxy-security-hardening--rate-limiting)
3. [Phần 3: Website Khách hàng – Luồng Đặt vé, Giữ ghế 5 phút & Mã QR](#phần-3-website-khách-hàng--luồng-đặt-vé-giữ-ghế-5-phút--mã-qr)
4. [Phần 4: Bảng Quản trị (Admin Portal), Soát vé tại cửa & Kiểm tra RBAC](#phần-4-bảng-quản-trị-admin-portal-soát-vé-tại-cửa--kiểm-tra-rbac)
5. [Phần 5: Quản trị Cơ sở Dữ liệu với MySQL 8.0 và phpMyAdmin](#phần-5-quản-trị-cơ-sở-dữ-liệu-với-mysql-80-và-phpmyadmin)
6. [Phần 6: Giám sát Hệ thống với Prometheus Metrics & PromQL](#phần-6-giám-sát-hệ-thống-với-prometheus-metrics--promql)
7. [Phần 7: Trực quan hóa Bảng điều khiển Grafana (4 Dashboards)](#phần-7-trực-quan-hóa-bảng-điều-khiển-grafana-4-dashboards)
8. [Phần 8: Thu thập và Truy vấn Nhật ký Tập trung với Loki, Promtail & LogQL](#phần-8-thu-thập-và-truy-vấn-nhật-ký-tập-trung-với-loki-promtail--logql)
9. [Phần 9: Giám sát Hạ tầng Máy chủ & Tài nguyên Container (Node Exporter & cAdvisor)](#phần-9-giám-sát-hạ-tầng-máy-chủ--tài-nguyên-container-node-exporter--cadvisor)
10. [Phần 10: Tổng kết Demo và Lời cảm ơn](#phần-10-tổng-kết-demo-và-lời-cảm-ơn)
11. [Checklist chuẩn bị trước giờ bảo vệ](#checklist-chuẩn-bị-trước-giờ-bảo-vệ)
12. [Các sự cố thường gặp và cách xử lý nhanh](#các-sự-cố-thường-gặp-và-cách-xử-lý-nhanh)
13. [Bộ câu hỏi phản biện của Giảng viên & Gợi ý trả lời ngắn gọn](#bộ-câu-hỏi-phản-biện-của-giảng-viên--gợi-ý-trả-lời-ngắn-gọn)

---

## PHẦN 1: KHỞI ĐỘNG, DOCKER COMPOSE VÀ KIẾN TRÚC MẠNG PHÂN LỚP

### 1. Thao tác cụ thể
* Mở terminal trên Ubuntu VM tại thư mục mã nguồn: `/home/nong-quang-tiep/cinema-event-booking`.
* Chạy `docker compose ps` để kiểm tra trạng thái hoạt động của 10 container.
* Liệt kê 3 mạng Docker bridge và giải thích kiến trúc phân tách 3 lớp:
  - `frontend-net`: Nối `cinema-nginx` và `cinema-app`.
  - `backend-net`: Nối `cinema-app`, `cinema-mysql`, và `cinema-phpmyadmin`.
  - `monitoring-net`: Nối `cinema-nginx`, `cinema-app`, `cinema-prometheus`, `cinema-grafana`, `cinema-loki`, `cinema-promtail`, `cinema-node-exporter`, `cinema-cadvisor`.
* Giải thích luồng kết nối dữ liệu:
  - Yêu cầu người dùng: Trình duyệt -> `cinema-nginx:80` -> (nội bộ `frontend-net`) -> `cinema-app:5000` -> (nội bộ `backend-net`) -> `cinema-mysql:3306`.
  - Cơ chế thu thập Metrics: `cinema-prometheus:9090` định kỳ kéo số liệu từ `cinema-app:5000/metrics`, `cinema-node-exporter:9100`, `cinema-cadvisor:8080`, và chính nó.
  - Cơ chế thu thập Logs: `cinema-promtail` đọc Docker socket và file log Nginx rồi đẩy về `cinema-loki:3100`.
  - Trực quan hóa: `cinema-grafana:3000` truy vấn dữ liệu từ cả Prometheus và Loki qua `monitoring-net`.
* Trình diễn cách kiểm tra log container bằng `docker compose logs`.

### 2. URL hoặc lệnh terminal
```bash
# [Chạy trên Terminal Ubuntu VM]
cd /home/nong-quang-tiep/cinema-event-booking

# Kiểm tra trạng thái hoạt động của các container
docker compose ps

# Kiểm tra danh sách mạng Docker
docker network ls | grep cinema

# Xem log gần nhất của container ứng dụng backend
docker compose logs --tail=25 app

# Xác định địa chỉ IP mạng nội bộ của Ubuntu VM
hostname -I
```

### 3. Kết quả mong đợi
* `docker compose ps`: Cả 10 container đều có trạng thái `Up` (trong đó các container có cấu hình kiểm tra sức khỏe gồm `cinema-nginx`, `cinema-app`, `cinema-mysql`, và `cinema-cadvisor` hiển thị thêm nhãn `healthy`).
* `docker network ls`: Hiển thị rõ 3 mạng `cinema-event-booking_frontend-net`, `cinema-event-booking_backend-net`, `cinema-event-booking_monitoring-net`.
* Địa chỉ IP của máy ảo hiển thị đúng dải mạng VMware NAT: `192.168.5.128`.

### 4. Câu nói gợi ý với Giảng viên
> *"Kính thưa Thầy/Cô, hệ thống CineWave được thiết kế theo kiến trúc Microservices gồm 10 containers độc lập và phân chia làm 3 phân vùng mạng Docker riêng biệt: Frontend Network, Backend Network và Monitoring Network. Nhờ kiến trúc cô lập mạng này, ngay cả khi container Nginx bị tấn công, kẻ xấu cũng không thể truy cập trực tiếp vào cơ sở dữ liệu MySQL vì Nginx và MySQL hoàn toàn không nằm chung mạng nội bộ."*

### 5. Bước tiếp theo
Chuyển sang **Phần 2** để kiểm tra vai trò reverse proxy và các cơ chế bảo vệ của Nginx.

---

## PHẦN 2: NGINX REVERSE PROXY, SECURITY HARDENING & RATE LIMITING

### 1. Thao tác cụ thể
* Mở file cấu hình [nginx/nginx.conf](file:///home/nong-quang-tiep/cinema-event-booking/nginx/nginx.conf) và [nginx/conf.d/default.conf](file:///home/nong-quang-tiep/cinema-event-booking/nginx/conf.d/default.conf).
* Chỉ ra cấu hình reverse proxy: Các request có tiền tố `/api/` được chuyển tiếp về `http://app:5000`.
* Chỉ ra các cấu hình bảo mật:
  - Ẩn thông tin phiên bản Nginx: `server_tokens off;`.
  - Các HTTP Security Headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy`.
  - Nén dữ liệu: `gzip on;` với mức nén 6 (`gzip_comp_level 6;`).
  - Chặn truy cập file ẩn (`.git`, `.env`): `location ~ /\. { deny all; }`.
* **Lưu ý trung thực về giao thức mạng:** Hiện tại hệ thống triển khai trên giao thức HTTP cổng 80 chuẩn hóa, **chưa tích hợp chứng chỉ số SSL/TLS (HTTPS)**.
* Chạy thử nghiệm kiểm tra giới hạn tốc độ (Rate Limiting): Zone `api_limit` được cấu hình với tốc độ 10 req/s, dung lượng burst 20 (`limit_req zone=api_limit burst=20 nodelay;`, `limit_req_status 429;`). Gửi 40 request liên tục để quan sát phản hồi từ Nginx.
* Xem file nhật ký truy cập `access_json.log` được ghi dưới dạng JSON có cấu trúc.

### 2. URL hoặc lệnh terminal
```bash
# [Chạy trên Terminal Ubuntu VM]

# 1. Kiểm tra endpoint sức khỏe riêng của Nginx
curl -s http://localhost/nginx-health

# 2. Kiểm tra Response Headers và các Security Headers của Nginx
curl -I http://localhost/

# 3. Kiểm tra cơ chế Rate Limiting bằng vòng lặp 40 request liên tục tới /api/health
for i in {1..40}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/health; done | sort | uniq -c

# 4. Kiểm tra dòng log JSON có cấu trúc bên trong container Nginx
docker compose exec nginx tail -n 5 /var/log/nginx/access_json.log
```

### 3. Kết quả mong đợi
* `curl -s http://localhost/nginx-health` trả về: `healthy`.
* `curl -I http://localhost/`:
  - `Server: nginx` (chỉ hiển thị tên phần mềm, không lộ số hiệu phiên bản chi tiết).
  - Có đầy đủ các header `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.
* Thử nghiệm Rate Limiting (40 requests):
  - Quan sát kết quả phân bổ mã HTTP trả về: Các request đầu tiên trong ngưỡng cho phép và burst sẽ nhận mã `200`, trong khi các request vượt quá ngưỡng burst sẽ nhận mã `429` (`HTTP 429 Too Many Requests`).
* File `access_json.log` hiển thị từng bản ghi theo định dạng JSON với các trường: `timestamp`, `remote_addr`, `method`, `uri`, `status`, `request_time`.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, Nginx đóng vai trò là cổng tiếp nhận duy nhất của hệ thống. Bên cạnh việc phục vụ các tệp giao diện tĩnh và proxy các request `/api/` về container ứng dụng Node.js, em đã cấu hình Rate Limiting mức 10 req/s với burst 20 để giảm thiểu rủi ro spam và brute-force ở tầng ứng dụng. Khi tần suất request vượt ngưỡng burst, Nginx sẽ lập tức ngắt bằng mã HTTP 429 như Thầy/Cô vừa thấy trên màn hình. Toàn bộ log truy cập được ghi dưới dạng JSON có cấu trúc để sẵn sàng chuyển về Promtail và Loki."*

### 5. Bước tiếp theo
Mở trình duyệt trên máy thật Windows để thực hiện luồng nghiệp vụ người dùng tại **Phần 3**.

---

## PHẦN 3: WEBSITE KHÁCH HÀNG – LUỒNG ĐẶT VÉ, GIỮ GHẾ 5 PHÚT & MÃ QR

### 1. Thao tác cụ thể
* Mở trình duyệt Web trên máy thật Windows, truy cập địa chỉ: `http://192.168.5.128/`.
* **Bước 1 – Trang chủ:** Giới thiệu giao diện Cinematic Dark Theme với các phim có trong cơ sở dữ liệu:
  - *Dune: Hành Tinh Cát - Phần Hai* (Đang chiếu)
  - *Kung Fu Panda 4* (Đang chiếu)
  - *Exhuma: Quật Mộ Trùng Ma* (Đang chiếu)
  - *Live Concert: Giai Điệu Ánh Sao CineWave* (Sắp chiếu)
* **Bước 2 – Đăng nhập khách hàng:** Bấm nút "Đăng nhập", sử dụng tài khoản kiểm thử đã được tạo sẵn trong cơ sở dữ liệu:
  - Tên đăng nhập: `nguyenvanan`
  - Mật khẩu: `user123`
  - Sau khi đăng nhập thành công, góc phải thanh điều hướng hiển thị: *"Xin chào, Nguyễn Văn An"*.
* **Bước 3 – Chọn phim & suất chiếu:** Chọn phim *Dune: Hành Tinh Cát - Phần Hai*, bấm xem chi tiết, chọn suất chiếu tại rạp *CineWave Landmark 81* (Phòng 01 - Laser 2D).
* **Bước 4 – Sơ đồ ghế ma trận thời gian thực (Seat Map Matrix):**
  - Giới thiệu 3 loại ghế và đơn giá theo suất chiếu: Standard (80.000 đ), VIP (100.000 đ), Couple (180.000 đ).
  - Ghế D3 và D4 đã được đặt trước đó (hiển thị trạng thái Đã bán - màu đỏ/xám).
  - Bấm chọn ghế VIP còn trống: ví dụ ghế **D5** hoặc **D6**.
  - Ngay khi chọn ghế, chỉ ra cho giảng viên thấy:
    - **Đồng hồ đếm ngược giữ ghế 5:00 (300 giây)** bắt đầu kích hoạt lùi từng giây.
    - Ghế chuyển sang trạng thái "Đang giữ chỗ".
* **Bước 5 – Điền thông tin & Thanh toán mô phỏng (Mock Payment):**
  - Chuyển sang trang thanh toán (`checkout.html`), thông tin khách hàng được tự động điền từ tài khoản đăng nhập.
  - Chọn phương thức thanh toán: **Mock Payment (Thanh toán mô phỏng)**.  
    *(Lưu ý giải thích: Hệ thống sử dụng quy trình thanh toán mô phỏng nội bộ, không tích hợp cổng VNPAY/MoMo thực tế).*
  - Bấm "Xác nhận & Thanh toán".
* **Bước 6 – Màn hình Vé điện tử (E-Ticket) & Mã QR:**
  - Hệ thống hiển thị trang hoàn tất (`ticket-success.html`) với **Mã đặt vé (Booking Code: định dạng `BK-...`)**.
  - Trạng thái: `ĐÃ THANH TOÁN (PAID)`.
  - **Mã QR Code vé điện tử được sinh động trực tiếp dưới dạng ảnh Base64** chứa thông tin mã vé, suất chiếu và số ghế.
  - Ghi nhớ mã đặt vé vừa tạo để sử dụng cho bước kiểm tra soát vé tại Phần 4.

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - Trang chủ: `http://192.168.5.128/`
  - Đăng nhập: `http://192.168.5.128/login.html`
  - Lịch sử / Tra cứu vé cá nhân: `http://192.168.5.128/my-bookings.html`

### 3. Kết quả mong đợi
* Giao diện tải hoàn chỉnh, không có lỗi JavaScript Console (phím F12).
* Đồng hồ đếm ngược 5 phút hiển thị chính xác theo thời gian thực (thời hạn 300 giây trả về từ API).
* Đơn đặt vé được xử lý thành công, hiển thị đầy đủ mã vé và mã QR Code vé điện tử.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, đây là trải nghiệm thực tế của khách hàng. Điểm mấu chốt ở đây là cơ chế Khóa ghế tạm thời (Seat Lock TTL 5 phút). Khi em chọn ghế, backend sẽ thực hiện ghi bản ghi vào bảng `seat_locks` với thời hạn chính xác 300 giây. Trong thời gian này, nếu người dùng khác truy cập vào cùng suất chiếu sẽ thấy ghế đã ở trạng thái bị khóa và không thể chọn trùng. Nếu sau 5 phút giao dịch không hoàn tất, ghế sẽ tự động hết hạn khóa và trở lại trạng thái khả dụng."*

### 5. Bước tiếp theo
Chuyển sang **Phần 4** để thực hiện vai trò Quản trị viên và kiểm tra chức năng soát vé.

---

## PHẦN 4: BẢNG QUẢN TRỊ (ADMIN PORTAL), SOÁT VÉ TẠI CỬA & KIỂM TRA RBAC

### 1. Thao tác cụ thể
* Mở tab mới trên trình duyệt Windows, truy cập trang quản trị: `http://192.168.5.128/admin/`.
* Đăng nhập bằng tài khoản Quản trị viên:
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
* **Xem Bảng chỉ số KPI tổng thể (Dashboard Stats):**
  - Chỉ ra các thẻ KPI: Tổng doanh thu (VND), Tổng số vé đã bán, Tổng số phim, Tổng số người dùng.
  - Doanh thu và số vé tự động cập nhật tăng thêm từ đơn hàng vừa tạo ở Phần 3.
* **Xem Danh sách đặt vé (Bookings Management):**
  - Mở danh sách đặt vé, xác nhận đơn hàng vừa đặt của khách hàng *Nguyễn Văn An* xuất hiện ở đầu danh sách với trạng thái `paid`.
* **Thực hiện Soát vé tại cửa rạp (Gate Check-in):**
  - Chọn chức năng "Soát vé tại cửa" (Check-in).
  - Nhập mã đặt vé vừa tạo (hoặc mã vé mẫu có sẵn: `BK-2026-DUNE01`).
  - Bấm nút **"Xác thực vé"**.
  - Hệ thống thông báo: *"Soát vé hợp lệ! Cho phép khách vào phòng chiếu"* kèm chi tiết tên khách hàng, tên phim, phòng chiếu, danh sách ghế.
  - Thử nghiệm kiểm tra mã vé không tồn tại: Nhập một mã giả như `BK-FAKE-9999` -> Hệ thống trả về lỗi: *"Mã vé không tồn tại trên hệ thống."* (HTTP 404).
  - *(Ghi chú kỹ thuật: Logic soát vé hiện tại xác thực tính hợp lệ của mã đặt vé và trạng thái thanh toán `paid` từ cơ sở dữ liệu).*
* **Kiểm tra Phân quyền RBAC (Role-Based Access Control):**
  - Kiểm tra request không có Token tới `/api/admin/dashboard/stats` -> Bị chặn với mã `HTTP 401 Unauthorized`.
  - Kiểm tra request với Token của tài khoản thường `nguyenvanan` -> Bị chặn với mã `HTTP 403 Forbidden` vì tài khoản không có quyền quản trị.

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - Bảng Quản trị: `http://192.168.5.128/admin/`
* 🐧 **[Chạy trên Terminal Ubuntu VM]**
```bash
# 1. Truy cập trái phép không có Token -> Mong đợi HTTP 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/admin/dashboard/stats

# 2. Truy cập với Token của User thông thường (role: user) -> Mong đợi HTTP 403
USER_TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nguyenvanan","password":"user123"}' | jq -r '.token')

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost/api/admin/dashboard/stats

# 3. Truy cập với Token của Admin (role: admin) -> Mong đợi HTTP 200
ADMIN_TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost/api/admin/dashboard/stats
```

### 3. Kết quả mong đợi
* Giao diện Admin Portal hiển thị đầy đủ các thẻ KPI và danh sách vé đặt.
* Thao tác soát vé xác nhận đúng thông tin vé hợp lệ và thông báo lỗi chính xác khi mã vé không tồn tại.
* Lệnh kiểm tra RBAC: Request không token trả về `401`, request với user token trả về `403`, request với admin token trả về `200`.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, hệ thống áp dụng cơ chế phân quyền RBAC thông qua JWT Middleware. Tài khoản khách hàng thông thường không thể truy cập các API quản trị và sẽ bị chặn bằng mã HTTP 403. Về chức năng soát vé, nhân viên tại rạp có thể nhập mã vé hoặc quét mã QR để xác thực tức thời tính hợp lệ và trạng thái thanh toán của vé trong cơ sở dữ liệu."*

### 5. Bước tiếp theo
Chuyển sang **Phần 5** để mở phpMyAdmin kiểm tra cấu trúc cơ sở dữ liệu.

---

## PHẦN 5: QUẢN TRỊ CƠ SỞ DỮ LIỆU VỚI MYSQL 8.0 VÀ PHPMYADMIN

### 1. Thao tác cụ thể
* Mở trình duyệt Windows, truy cập giao diện phpMyAdmin: `http://192.168.5.128:8081/`.
* Đăng nhập vào phpMyAdmin:
  - Máy chủ (Server): `mysql`
  - Tên đăng nhập: `cinema_user`
  - Mật khẩu: `cinema_secret_password` (hoặc tài khoản root: `root` / `cinema_root_super_secret`)
* **Lưu ý bảo mật về cổng kết nối:** Cổng 3306 của MySQL **không publish ra máy host** (chỉ mở nội bộ trong mạng `backend-net`). phpMyAdmin cùng nằm trong mạng `backend-net` nên có thể kết nối tới MySQL qua tên service `mysql:3306`.
* Mở cơ sở dữ liệu `cinema_db`, chỉ ra 10 bảng dữ liệu được chuẩn hóa theo chuẩn 3NF:
  1. `users` – Thông tin tài khoản khách hàng và quản trị viên (mật khẩu băm bằng Bcrypt).
  2. `categories` – Danh mục thể loại phim và sự kiện.
  3. `movies_events` – Danh sách phim, thời lượng, ngày phát hành, trailer, áp phích.
  4. `cinemas` – Danh sách cụm rạp chiếu.
  5. `halls` – Danh sách phòng chiếu theo từng rạp.
  6. `seats` – Ma trận ghế ngồi theo từng phòng chiếu.
  7. `showtimes` – Lịch chiếu phim theo khung giờ và phòng chiếu.
  8. `seat_locks` – Bảng quản lý khóa ghế tạm thời với trường thời hạn `locked_until` (TTL 5 phút).
  9. `bookings` – Thông tin đơn đặt vé, tổng tiền, mã vé, trạng thái thanh toán.
  10. `booking_seats` – Chi tiết các ghế thuộc từng đơn đặt vé.
* Mở bảng `bookings` và `booking_seats`: Xác nhận đơn đặt vé vừa tạo ở Phần 3 đã được lưu trữ bền vững với trạng thái `paid`.
* **Trình bày cơ chế phòng chống đặt trùng ghế (Double Booking):**
  - Mở cấu trúc bảng `booking_seats`.
  - Chỉ ra chỉ mục ràng buộc duy nhất: `UNIQUE KEY unique_showtime_seat (showtime_id, seat_id)`.
  - Giải thích: Khi có hai giao dịch đồng thời cùng cố gắng ghi một ghế trong cùng một suất chiếu, cơ chế ràng buộc duy nhất của MySQL InnoDB sẽ từ chối giao dịch thứ hai và phát sinh lỗi trùng khóa (Duplicate Entry), ngăn ngừa đặt trùng ghế ở tầng dữ liệu.

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - phpMyAdmin: `http://192.168.5.128:8081/`
* 🐧 **[Chạy trên Terminal Ubuntu VM thông qua docker compose exec]**
```bash
# Truy vấn trực tiếp đơn hàng vừa đặt từ container MySQL
docker compose exec mysql mysql -u cinema_user -pcinema_secret_password cinema_db \
  -e "SELECT b.id, b.booking_code, b.customer_name, b.total_amount, b.payment_status, bs.seat_id, s.seat_row, s.seat_number 
      FROM bookings b 
      JOIN booking_seats bs ON b.id = bs.booking_id 
      JOIN seats s ON bs.seat_id = s.id 
      ORDER BY b.id DESC LIMIT 1;"
```

### 3. Kết quả mong đợi
* Giao diện phpMyAdmin hiển thị đầy đủ 10 bảng dữ liệu.
* Bản ghi đặt vé của *Nguyễn Văn An* xuất hiện trong bảng `bookings` với trạng thái `paid`.
* Lệnh SQL từ terminal trả về chính xác dòng dữ liệu đơn vé vừa đặt với đúng số tiền và mã ghế.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, để chống đặt trùng ghế, hệ thống kết hợp 3 tầng kiểm soát: Tầng 1 là Khóa ghế tạm thời có thời hạn (Seat Lock TTL 5 phút), Tầng 2 là Giao dịch CSDL sử dụng khóa hàng bi quan (`SELECT ... FOR UPDATE`), và Tầng 3 là ràng buộc `UNIQUE KEY (showtime_id, seat_id)` trên bảng `booking_seats`. Ràng buộc này đảm bảo về mặt cấu trúc dữ liệu rằng không thể tồn tại hai bản ghi có cùng suất chiếu và số ghế trong hệ thống."*

### 5. Bước tiếp theo
Chuyển sang **Phần 6** để bắt đầu trình diễn hệ thống giám sát với Prometheus.

---

## PHẦN 6: GIÁM SÁT HỆ THỐNG VỚI PROMETHEUS METRICS & PROMQL

### 1. Thao tác cụ thể
* Mở trình duyệt Windows, truy cập giao diện Prometheus: `http://192.168.5.128:9090/`.
* **Kiểm tra trạng thái các Targets thu thập số liệu:**
  - Vào menu **Status** -> chọn **Targets**.
  - Chỉ ra 4 Scrape Targets đều ở trạng thái **UP** (màu xanh lá):
    1. `app` (`http://app:5000/metrics`): Thu thập chỉ số từ Node.js Express backend.
    2. `cadvisor` (`http://cadvisor:8080/metrics`): Thu thập chỉ số tài nguyên các container Docker.
    3. `node-exporter` (`http://node-exporter:9100/metrics`): Thu thập chỉ số hệ điều hành máy chủ Ubuntu VM.
    4. `prometheus` (`http://localhost:9090/metrics`): Tự giám sát hoạt động nội bộ của Prometheus.
  - Giải thích cách nhận biết: Trạng thái `UP` thể hiện endpoint `/metrics` phản hồi thành công mã HTTP 200 trong chu kỳ thu thập (`scrape_interval: 10s`). Nếu service gặp sự cố hoặc timeout thì trạng thái sẽ chuyển thành `DOWN`.
* **Thực thi các câu truy vấn PromQL dựa trên metric thực tế:**
  - Bấm vào menu **Graph**.
  - Thực thi các câu truy vấn PromQL có trong mã nguồn ứng dụng:
    - `cinema_tickets_booked_total`: Tổng số vé đã đặt thành công.
    - `cinema_revenue_total_vnd`: Tổng doanh thu tích lũy từ các vé đã thanh toán (VND).
    - `cinema_active_seat_locks`: Số lượng ghế hiện đang bị giữ chỗ tạm thời trong hệ thống.
    - `sum(rate(http_requests_total[1m]))`: Tốc độ request trên giây của toàn bộ hệ thống API.
    - `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))`: Độ trễ phân vị P95 của các yêu cầu HTTP.

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - Prometheus Targets: `http://192.168.5.128:9090/targets`
  - Prometheus Graph: `http://192.168.5.128:9090/graph`
* 🐧 **[Chạy trên Terminal Ubuntu VM]**
```bash
# Kiểm tra danh sách targets qua Prometheus API
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, scrapeUrl: .scrapeUrl}'
```

### 3. Kết quả mong đợi
* Giao diện Targets hiển thị 4 target với trạng thái `UP`.
* Truy vấn `cinema_tickets_booked_total` trả về số lượng vé đã ghi nhận.
* Biểu đồ Graph hiển thị các chuỗi số liệu theo thời gian thực.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, Prometheus hoạt động theo cơ chế Pull Model, định kỳ mỗi 10 giây sẽ kéo số liệu từ endpoint `/metrics` của các dịch vụ. Bên cạnh các chỉ số tài nguyên máy chủ, ứng dụng còn cung cấp các chỉ số nghiệp vụ như `cinema_tickets_booked_total` và `cinema_revenue_total_vnd` thông qua thư viện `prom-client`, giúp theo dõi hoạt động kinh doanh theo thời gian thực."*

### 5. Bước tiếp theo
Chuyển sang **Phần 7** để trình diễn bảng điều khiển Grafana.

---

## PHẦN 7: TRỰC QUAN HÓA BẢNG ĐIỀU KHIỂN GRAFANA (4 DASHBOARDS)

### 1. Thao tác cụ thể
* Mở trình duyệt Windows, truy cập Grafana tại: `http://192.168.5.128:3000/`.
* Đăng nhập bằng tài khoản:
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
* **Xác nhận Datasources:**
  - Vào **Connections** -> **Data sources**.
  - Xác nhận 2 nguồn cấp dữ liệu đã được cấu hình tự động (Provisioning):
    1. `Prometheus` (Default, URL: `http://prometheus:9090`).
    2. `Loki` (URL: `http://loki:3100`).
* **Mở và thuyết minh 4 Dashboards đã được cấu hình trong thư mục `Cinema Dashboards`:**
  - **Dashboard 1: `01 - Host Infrastructure (Ubuntu VM)` (UID: `host-infrastructure`)**
    - Biểu đồ Gauge: % CPU sử dụng của máy chủ Ubuntu VM (`node_cpu_seconds_total`).
    - Biểu đồ Gauge: % RAM sử dụng (`node_memory_MemTotal_bytes`).
    - Biểu đồ Stat: Dung lượng đĩa trống (`node_filesystem_avail_bytes`).
    - Biểu đồ Timeseries: Lưu lượng mạng Host Inbound / Outbound (KB/s).
  - **Dashboard 2: `02 - Docker Containers (cAdvisor)` (UID: `docker-containers`)**
    - Biểu đồ Stat: Số container CineWave đang hoạt động.
    - Biểu đồ Timeseries: % CPU của từng container theo thời gian thực.
    - Biểu đồ Timeseries: Mức tiêu thụ RAM (MB) của từng container (`cinema-mysql`, `cinema-app`, `cinema-nginx`...).
    - Biểu đồ Timeseries: Lưu lượng mạng truyền/nhận của các container (KB/s).
  - **Dashboard 3: `03 - Application APM (RED Metrics)` (UID: `app-red-metrics`)**
    - Áp dụng phương pháp giám sát **RED Method**:
      - **Rate:** Tốc độ request/giây (`sum(rate(http_requests_total[1m]))`).
      - **Errors:** Tần suất request lỗi 4xx/5xx (`sum(rate(http_requests_total{status=~"[45].."}[1m]))`).
      - **Duration:** Độ trễ phân vị P95 (`histogram_quantile(0.95, ...)`).
    - Biểu đồ phân tích chi tiết Request theo phương thức và tuyến đường (`method`, `route`).
  - **Dashboard 4: `04 - Cinema Business & Live Logs` (UID: `cinema-business-logs`)**
    - Thẻ KPI nghiệp vụ: Tổng vé đã bán (`cinema_tickets_booked_total`), Tổng doanh thu (`cinema_revenue_total_vnd`), Số ghế đang khóa (`cinema_active_seat_locks`).
    - Hai khung Live Logs tích hợp từ Loki: Log ứng dụng backend (truy vấn `{container_name="app"}`) và Log truy cập Nginx (truy vấn `{job="nginx"}`).

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - Đăng nhập Grafana: `http://192.168.5.128:3000/`
  - Thư mục Dashboards: `http://192.168.5.128:3000/dashboards`
  - Tài khoản: `admin` / `admin123`

### 3. Kết quả mong đợi
* Cả 4 Dashboard tải thành công, kết nối đúng với 2 datasource `Prometheus` và `Loki`.
* Dữ liệu biểu đồ tự động cập nhật định kỳ mỗi 5 giây (`refresh: 5s`).
* Số liệu vé bán và doanh thu trên Dashboard 4 khớp với các thao tác đặt vé đã thực hiện.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, Grafana giúp trực quan hóa toàn bộ số liệu thu thập được. Nhóm em đã cấu hình 4 bảng điều khiển phân tách theo từng cấp độ: từ Hạ tầng máy chủ vật lý, Tài nguyên container Docker, Hiệu năng ứng dụng theo phương pháp RED, cho đến Số liệu nghiệp vụ và dòng log trực tiếp. Toàn bộ các Dashboard này được quản lý dưới dạng mã nguồn (Dashboard as Code) thông qua thư mục provisioning JSON."*

### 5. Bước tiếp theo
Chuyển sang **Phần 8** để chứng minh việc truy vấn nhật ký tập trung với Loki và Promtail.

---

## PHẦN 8: THU THẬP VÀ TRUY VẤN NHẬT KÝ TẬP TRUNG VỚI LOKI, PROMTAIL & LOGQL

### 1. Thao tác cụ thể
* Giải thích ngắn gọn vai trò của cụm công cụ ghi nhật ký:
  - **Promtail:** Là Agent thu thập log, gắn kết với Docker Socket (`/var/run/docker.sock`) để đọc log các container và đọc file log Nginx (`/var/log/nginx/access_json.log`), tự động gán các nhãn và chuyển tiếp về Loki.
  - **Loki:** Là hệ thống lưu trữ nhật ký tập trung, tối ưu dung lượng bằng cách chỉ đánh chỉ mục theo nhãn (labels) thay vì lập chỉ mục toàn văn bản (full-text index).
* **Mở màn hình Grafana Explore để truy vấn Log:**
  - Trong Grafana, vào menu bên trái chọn **Explore**.
  - Chọn Datasource: **Loki**.
* **Thực thi các truy vấn LogQL dựa trên cấu hình thực tế:**
  1. *Xem log của ứng dụng backend Node.js (nhãn `container_name="app"`):*
     ```logql
     {container_name="app"}
     ```
     -> Hiển thị các dòng log định dạng JSON do Winston ghi nhận với các trường: `level`, `message`, `method`, `path`, `service="cinema-api"`.
  2. *Xem log truy cập Nginx (nhãn `job="nginx"`):*
     ```logql
     {job="nginx"}
     ```
     -> Hiển thị các bản ghi truy cập JSON từ Nginx với các trường: `uri`, `status`, `request_time`.
  3. *Lọc nhật ký nghiệp vụ khóa ghế:*
     ```logql
     {container_name="app"} |= "hold-seats"
     ```
  4. *Lọc các yêu cầu bị Nginx chặn do Rate Limiting:*
     ```logql
     {job="nginx"} |= "429"
     ```
* **Kiểm tra trạng thái container Loki & Promtail trên terminal:**
  - Chạy lệnh xem log Promtail để xác nhận tiến trình đọc và chuyển tiếp log đang hoạt động ổn định.

### 2. URL hoặc lệnh terminal
* 💻 **[Trình duyệt Windows]**
  - Grafana Explore: `http://192.168.5.128:3000/explore`
* 🐧 **[Chạy trên Terminal Ubuntu VM]**
```bash
# Kiểm tra log vận hành của Loki
docker compose logs --tail=15 loki

# Kiểm tra log vận hành của Promtail
docker compose logs --tail=15 promtail

# Kiểm tra danh sách nhãn hiện có trong Loki
curl -s http://localhost:3100/loki/api/v1/labels | jq .
```

### 3. Kết quả mong đợi
* Màn hình Grafana Explore hiển thị luồng log trực tiếp theo thời gian.
* Các câu truy vấn LogQL lọc đúng dòng log ứng dụng và log truy cập Nginx.
* Lệnh kiểm tra danh sách nhãn trong Loki trả về các nhãn có trong cấu hình: `container`, `container_name`, `filename`, `job`, `stream`.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, việc tích hợp Promtail và Loki cho phép tập trung nhật ký từ 10 containers và Web Server Nginx về một đầu mối duy nhất. Khi xảy ra sự cố, người quản trị có thể sử dụng ngôn ngữ LogQL để tra cứu và lọc chính xác các dòng thông báo lỗi hoặc các request bất thường mà không cần truy cập trực tiếp vào từng container."*

### 5. Bước tiếp theo
Chuyển sang **Phần 9** để làm rõ vai trò của hai Agent thu thập hạ tầng: Node Exporter và cAdvisor.

---

## PHẦN 9: GIÁM SÁT HẠ TẦNG MÁY CHỦ & TÀI NGUYÊN CONTAINER (NODE EXPORTER & CADVISOR)

### 1. Thao tác cụ thể
* **Phân biệt hai cấp độ giám sát hạ tầng trong dự án:**
  - **Node Exporter:** Giám sát ở cấp độ **Hệ điều hành / Máy chủ vật lý / Máy ảo (Host Level)**. Thu thập các chỉ số phần cứng tổng thể như: tải CPU máy chủ, dung lượng RAM khả dụng, tình trạng ổ đĩa, lưu lượng mạng qua card `ens33`.
  - **cAdvisor:** Giám sát ở cấp độ **Từng Container Docker (Container Level)**. Đọc trực tiếp từ Linux cgroups và Docker daemon để đo lường tài nguyên mà mỗi container đang tiêu thụ (% CPU, MB RAM, Network I/O của riêng `cinema-mysql`, `cinema-app`, `cinema-nginx`...).
* **Kiểm tra trạng thái thu thập trong Prometheus:**
  - Mở trang Prometheus Targets, chỉ ra 2 target `node-exporter:9100` và `cadvisor:8080` đều ở trạng thái `UP`.
* **Lấy mẫu dữ liệu metrics thô bằng lệnh terminal:**
  - Dùng lệnh truy vấn từ container Prometheus qua mạng nội bộ `monitoring-net` để chứng minh dữ liệu metrics đang được xuất ra liên tục.
* **Đối chiếu trên Grafana:**
  - Mở lại Dashboard `01 - Host Infrastructure` (sử dụng metrics từ Node Exporter).
  - Mở lại Dashboard `02 - Docker Containers` (sử dụng metrics từ cAdvisor).

### 2. URL hoặc lệnh terminal
```bash
# [Chạy trên Terminal Ubuntu VM thông qua container Prometheus]

# Lấy mẫu một số dòng metric từ Node Exporter (Host level)
docker compose exec prometheus wget -q -O- http://node-exporter:9100/metrics | head -n 12

# Lấy mẫu một số dòng metric từ cAdvisor (Container level)
docker compose exec prometheus wget -q -O- http://cadvisor:8080/metrics | head -n 12
```

### 3. Kết quả mong đợi
* Lệnh trả về các metric chuẩn Prometheus: `node_cpu_seconds_total`, `node_memory_MemTotal_bytes` từ Node Exporter và `container_cpu_usage_seconds_total`, `container_memory_usage_bytes` từ cAdvisor.
* Trên Dashboard 2 của Grafana hiển thị đầy đủ tên các container CineWave.

### 4. Câu nói gợi ý với Giảng viên
> *"Thưa Thầy/Cô, việc sử dụng đồng thời Node Exporter và cAdvisor cung cấp góc nhìn hai tầng: Node Exporter giúp đánh giá sức tải chung của toàn bộ máy chủ Ubuntu, còn cAdvisor giúp xác định chính xác container cụ thể nào đang chiếm dụng nhiều tài nguyên. Đây là cơ sở cần thiết cho việc cấu hình cảnh báo và tối ưu hóa tài nguyên."*

### 5. Bước tiếp theo
Chuyển sang **Phần 10** để tổng kết toàn bộ nội dung demo.

---

## PHẦN 10: TỔNG KẾT DEMO VÀ LỜI CẢM ƠN

### 1. Thao tác cụ thể
* Quay trở lại màn hình trang chủ CineWave hoặc Dashboard tổng quan của Grafana.
* Tóm tắt 5 kết quả kỹ thuật chính mà hệ thống đã triển khai và kiểm chứng thực tế.
* Cảm ơn Hội đồng Giảng viên và mời Thầy/Cô đặt câu hỏi phản biện.

### 2. Tóm tắt 5 kết quả kỹ thuật cốt lõi của Hệ thống
1. **Kiến trúc Microservices với Docker Compose:** Đóng gói 10 container độc lập, phân chia 3 mạng nội bộ cách ly, có cấu hình kiểm tra sức khỏe và giới hạn tài nguyên CPU/RAM.
2. **Bảo mật hệ thống nhiều tầng (Security Hardening):** Ẩn các cổng dịch vụ nhạy cảm (MySQL 3306, App 5000), ứng dụng backend chạy với người dùng non-root (`node`), Nginx ẩn phiên bản và áp dụng Rate Limiting cùng các HTTP Security Headers, phòng ngừa SQL Injection thông qua Prepared Statements của `mysql2/promise`.
3. **Cơ chế phòng chống đặt trùng ghế có kiểm chứng:** Kết hợp Khóa ghế tạm thời có thời hạn (Seat Lock TTL 5 phút), Giao dịch cơ sở dữ liệu với row-level locking, và Khóa ràng buộc duy nhất `UNIQUE KEY (showtime_id, seat_id)` trên bảng `booking_seats`.
4. **Ứng dụng nghiệp vụ hoàn chỉnh:** Giao diện đặt vé xem phim trực quan, chọn ghế theo sơ đồ ma trận thời gian thực, đếm ngược giữ ghế, thanh toán mô phỏng và sinh mã vé điện tử QR Code động.
5. **Hệ thống Giám sát & Quản trị nhật ký chuẩn hóa (Observability):** Thu thập Metrics bằng Prometheus, trực quan hóa qua 4 Dashboard chuyên biệt trên Grafana, và quản lý log tập trung với Promtail và Loki thông qua ngôn ngữ LogQL.

### 3. Câu nói kết thúc với Giảng viên
> *"Kính thưa quý Thầy/Cô trong Hội đồng, trên đây là toàn bộ phần trình diễn hoạt động thực tế của Hệ thống Đặt vé Xem phim & Sự kiện CineWave – Đề tài 11, bao gồm các thành phần từ Hạ tầng Docker, Mạng cách ly, Bảo mật Nginx, Ứng dụng nghiệp vụ khách hàng và quản trị, cho đến Hệ thống Giám sát và Quản trị nhật ký. Em xin chân thành cảm ơn sự lắng nghe và góp ý của quý Thầy/Cô. Kính mời Thầy/Cô đặt câu hỏi để em được làm rõ thêm các khía cạnh kỹ thuật của dự án ạ!"*

---

## CHECKLIST CHUẨN BỊ TRƯỚC GIỜ BẢO VỆ

Thực hiện kiểm tra tuần tự các mục sau trước giờ thuyết trình 15 phút:

- [ ] **1. Môi trường mạng VMware:**
  - Card mạng máy ảo đang ở chế độ **NAT (VMnet8)**.
  - Lệnh `hostname -I` trả về địa chỉ IP đúng: `192.168.5.128`.
  - Trên Windows Host, mở PowerShell gõ `Test-NetConnection -ComputerName 192.168.5.128 -Port 80` nhận kết quả `TcpTestSucceeded: True`.
- [ ] **2. Trạng thái Docker Containers:**
  - Chạy `docker compose ps` và xác nhận cả 10 container đều ở trạng thái `Up` (hoặc `Up (healthy)`).
  - Không có container nào bị crash hoặc rơi vào vòng lặp restart.
- [ ] **3. Trình duyệt Web trên Windows (Mở sẵn 5 tab tiện trình chiếu):**
  - **Tab 1:** Website Khách hàng – `http://192.168.5.128/`
  - **Tab 2:** Admin Portal – `http://192.168.5.128/admin/`
  - **Tab 3:** phpMyAdmin – `http://192.168.5.128:8081/`
  - **Tab 4:** Grafana Dashboards – `http://192.168.5.128:3000/dashboards`
  - **Tab 5:** Prometheus Targets – `http://192.168.5.128:9090/targets`
- [ ] **4. Terminal trên Ubuntu VM chuẩn bị sẵn:**
  - Mở sẵn terminal tại thư mục `/home/nong-quang-tiep/cinema-event-booking`.
  - Kiểm tra nhanh sức khỏe dịch vụ: `curl -s http://localhost/nginx-health` trả về `healthy`.
- [ ] **5. Tài khoản kiểm thử sẵn sàng:**
  - Tài khoản Admin: `admin` / `admin123`
  - Tài khoản Khách hàng: `nguyenvanan` / `user123`
  - Mã vé mẫu có sẵn để tra cứu/soát vé: `BK-2026-DUNE01`

---

## CÁC SỰ CỐ THƯỜNG GẶP VÀ CÁCH XỬ LÝ NHANH

| Sự cố phát sinh | Nguyên nhân | Cách xử lý nhanh tại chỗ |
| :--- | :--- | :--- |
| **Không mở được trang web từ máy Windows bằng `localhost`** | Máy Windows đang chạy dịch vụ khác (như IIS) chiếm cổng 80 của Windows. | **Không dùng `localhost` trên Windows**. Luôn truy cập bằng IP của máy ảo: `http://192.168.5.128/`. |
| **IP Ubuntu VM bị đổi sau khi khởi động lại máy ảo** | DHCP của VMware cấp lại IP mới cho card mạng `ens33`. | Chạy `hostname -I` trên VM để lấy IP mới và cập nhật URL trên trình duyệt Windows theo IP mới. |
| **Grafana báo lỗi không kết nối được Datasource Prometheus/Loki** | Container Prometheus hoặc Loki khởi động chậm hơn Grafana. | Chờ 10-15 giây, hoặc vào **Connections -> Data sources -> Prometheus/Loki -> Bấm "Save & test"** để kiểm tra lại kết nối. |
| **Truy vấn LogQL trong Grafana Explore không thấy log mới** | Khung thời gian truy vấn mặc định đang chọn quá xa hoặc quá hẹp. | Đổi bộ chọn thời gian ở góc trên bên phải Grafana thành **`Last 15 minutes`** và bấm nút Run query (hoặc bật chế độ Live log). |
| **Một container bị lỗi bất ngờ (`Exit 1`)** | Xung đột tài nguyên tạm thời hoặc timeout kết nối mạng. | Khởi động lại riêng container đó từ terminal: `docker compose restart <service_name>` (ví dụ: `docker compose restart app`). |

---

## BỘ CÂU HỎI PHẢN BIỆN CỦA GIẢNG VIÊN & GỢI Ý TRẢ LỜI NGẮN GỌN

### Câu hỏi 1: Tại sao hệ thống không mở cổng 3306 của MySQL ra máy host để dễ kết nối bằng các công cụ bên ngoài?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô, việc không publish cổng 3306 ra ngoài máy host là áp dụng nguyên tắc **Least Privilege** và **Defense in Depth** trong quản trị hệ thống. Cơ sở dữ liệu chỉ cần giao tiếp nội bộ với Backend API trong mạng `backend-net`. Việc ẩn cổng này giúp giảm thiểu rủi ro bị quét cổng hoặc tấn công brute-force từ mạng ngoài. Khi cần thao tác trực quan, quản trị viên sử dụng dịch vụ phpMyAdmin được giới hạn cổng riêng."*

---

### Câu hỏi 2: Cơ chế nào ngăn chặn việc hai khách hàng đặt cùng một ghế tại cùng một thời điểm?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô, hệ thống áp dụng 3 tầng kiểm soát:*  
  *1. Khi người dùng chọn ghế, backend mở Transaction với khóa hàng bi quan (`SELECT ... FOR UPDATE`) trên bảng `seat_locks`. Yêu cầu nào đến trước sẽ giữ được khóa và nhận mã HTTP 200, yêu cầu đến sau sẽ bị từ chối với mã HTTP 409 Conflict.*  
  *2. Sau khi thanh toán, ghế được ghi vào bảng `booking_seats`.*  
  *3. Tầng bảo vệ dữ liệu: Bảng `booking_seats` có ràng buộc duy nhất `UNIQUE KEY (showtime_id, seat_id)`. Ràng buộc này đảm bảo về mặt cấu trúc cơ sở dữ liệu rằng không thể tồn tại hai bản ghi có cùng suất chiếu và số ghế."*

---

### Câu hỏi 3: Nếu người dùng giữ ghế rồi đóng trình duyệt không thanh toán thì ghế có bị khóa mãi không?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô, ghế không bị khóa vĩnh viễn. Trong bảng `seat_locks`, mỗi bản ghi khóa đều có trường `locked_until` với thời hạn 5 phút. Khi lấy sơ đồ ghế hoặc kiểm tra ghế trống, câu lệnh truy vấn luôn kèm điều kiện `WHERE locked_until > NOW()`. Do đó, khi hết 5 phút, bản ghi khóa tự động không còn hiệu lực và ghế trở lại trạng thái khả dụng cho người dùng khác."*

---

### Câu hỏi 4: Sự khác nhau cơ bản giữa Prometheus và Loki trong dự án là gì?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô:*  
  *- **Prometheus** thu thập **Số liệu chuỗi thời gian (Metrics)** dạng số (đo lường tốc độ request/giây, mức sử dụng CPU, RAM). Prometheus giúp phát hiện hệ thống đang có hiện tượng gì bất thường.*  
  *- **Loki** lưu trữ và lập chỉ mục **Nhật ký (Logs)** dạng văn bản (ghi lại chi tiết nội dung request, mã lỗi, thông báo hệ thống). Loki giúp truy vết nguyên nhân chi tiết của sự cố.*  
  *Sự kết hợp giữa Metrics của Prometheus và Logs của Loki giúp người quản trị có góc nhìn toàn diện về trạng thái vận hành của hệ thống."*

---

### Câu hỏi 5: Tại sao Nginx lại được cấu hình ghi log dạng JSON thay vì định dạng tiêu chuẩn?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô, định dạng log mặc định của Nginx là văn bản thuần không cấu trúc, khi đưa vào Promtail và Loki cần sử dụng biểu thức chính quy (Regex) để tách các trường thông tin. Bằng cách định dạng `json_analytics` trực tiếp trong Nginx, mỗi dòng log trở thành một đối tượng JSON chuẩn với các trường rõ ràng (`status`, `uri`, `request_time`, `remote_addr`). Promtail và Loki có thể phân tích cú pháp nhanh hơn, giảm tải CPU và tránh lỗi sai định dạng."*

---

### Câu hỏi 6: Khi lượng truy cập tăng cao, hệ thống này có thể mở rộng (Scale) như thế nào?
* **Gợi ý trả lời:**  
  *"Dạ thưa Thầy/Cô, với cấu trúc hiện tại, hệ thống có thể mở rộng theo các hướng:*  
  *1. Mở rộng chiều ngang cho container ứng dụng bằng cách tăng số lượng replica backend trong Docker Compose (`docker compose up -d --scale app=3`), lúc này Nginx sẽ đảm nhiệm vai trò cân bằng tải (Load Balancer).*  
  *2. Chuyển cơ chế giữ ghế tạm thời từ bảng `seat_locks` trong MySQL sang dịch vụ In-Memory Caching như **Redis** (sử dụng tính năng TTL Key Expiration) để đáp ứng hàng nghìn thao tác giữ ghế mỗi giây trên bộ nhớ RAM.*  
  *3. Về lâu dài, có thể chuyển đổi cấu hình sang cụm Kubernetes để tự động điều chỉnh số lượng Pod (Horizontal Pod Autoscaling - HPA) dựa trên chỉ số thu thập từ Prometheus."*
