# Hệ thống Đặt vé Xem phim / Sự kiện (Cinema & Event Booking System)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Môi trường triển khai:** Ubuntu VM, Docker, Docker Compose  

> **TRẠNG THÁI HIỆN TẠI:** Hệ thống đã hoàn thành **Phase 8 (Kiểm thử Toàn diện E2E, Load Testing & Hoàn thiện Báo cáo)**. Toàn bộ 10 Docker services, REST API, Web Client, Admin Portal, Observability Stack và cơ chế chống Double Booking đã được kiểm thử và nghiệm thu thành công.

---

## 1. Mục tiêu Dự án
Xây dựng một hệ thống đặt vé xem phim / sự kiện hoàn chỉnh, an toàn, có khả năng mở rộng và giám sát toàn diện (Observability), đáp ứng các tiêu chuẩn DevOps hiện đại:
- Giao diện người dùng Web trực quan, sang trọng (Cinematic Dark Theme), hỗ trợ sơ đồ ghế ma trận thời gian thực và đếm ngược giữ ghế.
- Tầng backend RESTful API tối ưu với khả năng ngăn chặn triệt để Double Booking (tranh chấp đặt vé song song).
- Quản trị cơ sở dữ liệu qua MySQL 8.0 và phpMyAdmin.
- Nginx Reverse Proxy làm cổng tiếp nhận duy nhất (Port 80 HTTP).
- Giám sát toàn diện 3 trụ cột: Metrics (Prometheus + Grafana), Logs (Loki + Promtail + LogQL), Traces/Health.
- Triển khai an toàn với các kỹ thuật Security Hardening (Non-root users, Network Isolation, Least Privilege Ports, Rate Limiting, Prepared Statements).

---

## 2. Kiến trúc Tổng thể (Architecture)

```text
Browser Client / Admin
        │
        ▼ (Port 80 HTTP)
┌────────────────────────────────────────────────────────┐
│ Nginx Reverse Proxy & Static Web Server               │
│ - Static assets: HTML, CSS, JS                        │
│ - Rate limiting (10r/s, burst 20), Gzip, Security     │
│ - Structured JSON Access Logs                         │
└────────────────────────────────────────────────────────┘
        │ (proxy_pass /api/*)
        ▼ (Port 5000 Internal Only)
┌────────────────────────────────────────────────────────┐
│ Node.js 20 + Express.js API (Backend)                 │
│ - REST API, Business Logic, Mock Payment              │
│ - MySQL Transactions, Seat Locking TTL 5 mins         │
│ - Prometheus Metrics (/metrics via prom-client)       │
│ - Winston Structured JSON Logs                        │
└────────────────────────────────────────────────────────┘
        │ (TCP 3306 Internal Only)
        ▼
┌────────────────────────────────────────────────────────┐
│ MySQL 8.0 Database (InnoDB)                           │
│ - 10 bảng chuẩn hóa 3NF                               │
│ - UNIQUE KEY (showtime_id, seat_id) chống trùng vé    │
└────────────────────────────────────────────────────────┘

[Monitoring & Observability Stack]
├── Metrics Collection: Node Exporter (:9100) + cAdvisor (:8080) + App (:5000/metrics)
├── Metrics Storage: Prometheus (:9090)
├── Visualization: Grafana (:3000)
├── Logs Collection: Promtail (Docker Socket + Nginx JSON Logs)
└── Logs Storage: Grafana Loki (:3100)
```

---

## 3. Công nghệ Sử dụng (Tech Stack)
- **Backend:** Node.js 20, Express.js, `mysql2`, `jsonwebtoken`, `bcrypt`, `helmet`, `winston`, `prom-client`, `qrcode`.
- **Frontend:** Vanilla HTML5, CSS3 (Modern Dark Theme), JavaScript (Fetch API, Canvas/SVG QR Code).
- **Database:** MySQL 8.0, phpMyAdmin.
- **Proxy & Web Server:** Nginx (Alpine).
- **Monitoring & Metrics:** Prometheus, Node Exporter, cAdvisor, Grafana.
- **Logging:** Grafana Loki, Promtail (truy vấn qua LogQL).
- **Containerization & Orchestration:** Docker, Docker Compose.

---

## 4. Danh mục 10 Docker Services Hoạt Động

| Service | Image | Mạng nội bộ | Port Mapping trên Host | Vai trò | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `nginx` | `cinema-event-booking-nginx` | `frontend-net`, `monitoring-net` | `0.0.0.0:80:80` | Cổng tiếp nhận chính, Web static & Reverse Proxy | **Up (healthy)** |
| `app` | `cinema-event-booking-app` | `frontend-net`, `backend-net`, `monitoring-net` | *Nội bộ (5000)* | Backend Express API (Non-root `node`) | **Up (healthy)** |
| `mysql` | `mysql:8.0` | `backend-net` | *Nội bộ (3306)* | Database chính (InnoDB, utf8mb4) | **Up (healthy)** |
| `phpmyadmin` | `phpmyadmin/phpmyadmin` | `backend-net` | `8081:80` | Quản trị database trực quan | **Up** |
| `prometheus` | `prom/prometheus:v2.50.0` | `monitoring-net` | `9090:9090` | Thu thập & lưu trữ time-series metrics | **Up** |
| `grafana` | `grafana/grafana:10.3.0` | `monitoring-net` | `3000:3000` | Trực quan hóa metrics & logs (4 Dashboards) | **Up** |
| `loki` | `grafana/loki:2.9.4` | `monitoring-net` | `3100:3100` | Lưu trữ tập trung logs | **Up** |
| `promtail` | `grafana/promtail:2.9.4` | `monitoring-net` | *Không publish* | Thu thập log Nginx & 10 Docker containers | **Up** |
| `node-exporter`| `prom/node-exporter:v1.7.0` | `monitoring-net` | *Nội bộ (9100)* | Thu thập metric phần cứng host VM | **Up** |
| `cadvisor` | `gcr.io/cadvisor:v0.47.2` | `monitoring-net` | *Nội bộ (8080)* | Thu thập metric tài nguyên containers | **Up (healthy)** |

---

## 5. Cơ chế Chống Double Booking (Triple-Layer Protection)
1. **Ràng buộc cứng Database:** Bảng `booking_seats` có khóa duy nhất `UNIQUE KEY unique_showtime_seat (showtime_id, seat_id)`.
2. **Khóa ghế có thời hạn (Seat Lock TTL 5 phút):** Bảng `seat_locks` giữ ghế tạm thời khi user đang điền thông tin thanh toán, tự động hủy sau 5 phút nếu không hoàn tất giao dịch.
3. **Database Transaction:** Áp dụng `START TRANSACTION`, `SELECT ... FOR UPDATE`, và `COMMIT/ROLLBACK` khi giữ ghế và xác nhận thanh toán. Khi phát hiện ghế đã bị giữ/đặt, API trả về mã lỗi `409 Conflict`.

---

## 6. Các Biện pháp Security Hardening
- **Non-root container:** Node.js chạy với user `node` (`USER node`, uid=1000).
- **Network Isolation:** 3 mạng Docker bridge riêng biệt (`frontend-net`, `backend-net`, `monitoring-net`). Cổng MySQL 3306, App 5000, cAdvisor 8080, Node Exporter 9100 không mở ra ngoài host.
- **Prepared Statements:** Chống SQL Injection 100% qua `mysql2/promise`.
- **Mã hóa:** Hash mật khẩu với `bcrypt` (salt rounds = 10), JWT Token có thời hạn sử dụng.
- **Nginx Protection:** Ẩn phiên bản `server_tokens off`, HTTP Security Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`), Rate Limiting (10 req/s, burst 20).
- **Resource Constraints:** Giới hạn CPU và RAM cho từng container trong Compose.

---

## 7. Hướng dẫn Khởi chạy và Vận hành Hệ thống

### 7.1 Khởi động toàn bộ dịch vụ:
```bash
# 1. Tạo file cấu hình môi trường
cp .env.example .env

# 2. Khởi động toàn bộ 10 Docker containers
docker compose up -d

# 3. Kiểm tra trạng thái sức khỏe
docker compose ps
curl http://localhost/api/health
```

### 7.2 Chạy bộ kiểm thử toàn diện E2E Nghiệp vụ (10 bước):
```bash
python3 tests/test_e2e_flow.py
```

### 7.3 Chạy bộ kiểm thử Race Condition, Double Booking & Security Hardening:
```bash
python3 tests/test_security_race.py
```

### 7.4 Chạy bài kiểm thử tải an toàn (Apache Benchmark):
```bash
ab -n 200 -c 10 http://localhost/
```

### 7.5 Hướng dẫn Kiểm tra Giám sát (Observability):
1. **Kiểm tra Prometheus Targets:**
   - Truy cập: `http://localhost:9090/targets` (hoặc `http://192.168.5.128:9090/targets`)
   - Xác nhận đủ 4/4 targets ở trạng thái `UP`: `app:5000`, `cadvisor:8080`, `node-exporter:9100`, `localhost:9090`.
2. **Kiểm tra Grafana Dashboards:**
   - Truy cập: `http://localhost:3000` (User: `admin` / Password: `admin123`).
   - Vào menu **Dashboards** -> chọn thư mục **Cinema Dashboards**:
     - *01 - Host Infrastructure (Ubuntu VM)*
     - *02 - Docker Containers (cAdvisor)*
     - *03 - Application APM (RED Metrics)*
     - *04 - Cinema Business & Live Logs*
3. **Kiểm tra Loki & Truy vấn LogQL:**
   - Vào Grafana -> **Explore** -> Chọn datasource **Loki**.
   - Một số câu truy vấn LogQL thông dụng:
     - Xem log thời gian thực của App: `{container="cinema-app"}`
     - Xem log Nginx: `{container="cinema-nginx"}`
     - Lọc các lỗi hoặc cảnh báo: `{container="cinema-app"} |= "error"`
     - Lọc các request bị giới hạn tốc độ (Rate Limited): `{container="cinema-nginx"} |= "429"`

### 7.6 Hướng dẫn Kiểm tra Logs & Xử lý Sự cố (Troubleshooting):
- **Xem log thời gian thực của từng container:**
  ```bash
  docker compose logs -f app
  docker compose logs -f nginx
  docker compose logs -f mysql
  ```
- **Kiểm tra nhanh tình trạng database:**
  ```bash
  docker compose exec mysql mysqladmin -u root -pcinema_root_super_secret ping
  ```
- **Xử lý sự cố cổng bị chiếm:**
  Nếu cổng 80 bị chiếm bởi dịch vụ khác trên Ubuntu VM, kiểm tra bằng `sudo ss -tulpn | grep :80`.
- **Khởi động lại một container bị lỗi mà không ảnh hưởng toàn hệ thống:**
  ```bash
  docker compose restart <service_name>
  ```

### 7.7 Cảnh báo Bảo mật & Hạn chế Hiện tại:
- **Lưu ý Mật khẩu Production:** Toàn bộ thông tin tài khoản demo (`admin123`, `cinema_secret_password`) chỉ dùng cho môi trường kiểm thử học phần. Khi triển khai thực tế trên môi trường Production, **bắt buộc** phải thay đổi toàn bộ mật khẩu trong `.env` và hash lại mật khẩu quản trị viên.
- **Cổng thanh toán:** Hệ thống đang sử dụng cơ chế **Mock Sandbox Payment** (mô phỏng thành công tức thì sau khi chọn VNPAY/MoMo). Khi tích hợp cổng thanh toán thật, cần bổ sung Webhook IPN xử lý chữ ký số bí mật (Secret Hash Checksum).
- **Giao thức mạng:** Hiện tại hệ thống đang chạy qua HTTP cổng 80. Khi triển khai ra Internet công cộng, bắt buộc tích hợp chứng chỉ số SSL/TLS (HTTPS) thông qua Certbot/Let's Encrypt trên Nginx.

### 7.8 Báo cáo Học phần Chi tiết:
Bản báo cáo hoàn chỉnh học phần theo cấu trúc 12 chương (sẵn sàng chuyển đổi sang Microsoft Word) được lưu trữ tại:
📄 [docs/BAO_CAO_MON_HOC.md](file:///home/nong-quang-tiep/cinema-event-booking/docs/BAO_CAO_MON_HOC.md)

---

## 8. Hướng dẫn Môi trường Mạng & Truy Cập Từ Máy Thật Windows

### 8.1 Thông số Mạng Thực tế (Đã xác minh):
- **Chế độ mạng:** **VMware NAT (VMnet8)**
- **Card mạng VM:** `ens33`
- **Địa chỉ IP Ubuntu VM:** `192.168.5.128` (Xác định bằng lệnh: `ip -4 addr show ens33` hoặc `hostname -I`)
- **Gateway / Virtual Router:** `192.168.5.2`
- **Địa chỉ IP Host Windows trên VMnet8:** `192.168.5.1`

> [!IMPORTANT]
> **Vì sao không truy cập bằng `localhost` trên trình duyệt Windows?**
> Trên máy Windows của bạn, dịch vụ Microsoft IIS (Internet Information Services) đang chạy và chiếm sẵn cổng `80` (`C:\inetpub\wwwroot\`). Nếu gõ `localhost`, trình duyệt sẽ kết nối vào IIS của Windows thay vì máy ảo.
> Do đó, trên trình duyệt Windows, luôn dùng địa chỉ IP của máy ảo: **`http://192.168.5.128/`**.

### 8.2 Bảng URL Truy Cập Trực Tiếp Từ Trình Duyệt Windows:

| Dịch vụ | URL trên trình duyệt Windows | Quyền hạn / Tài khoản |
| :--- | :--- | :--- |
| 🎬 **Website Đặt vé Khách hàng** | `http://192.168.5.128/` | Khách vãng lai / Người dùng đã đăng nhập |
| 🛡️ **Bảng Quản trị (Admin Portal)** | `http://192.168.5.128/admin/` | Tài khoản Admin: `admin` / `admin123` |
| 🔑 **Đăng nhập / Đăng ký** | `http://192.168.5.128/login.html` | User: `nguyenvanan` / `user123` |
| 🎟️ **Tra cứu vé / Lịch sử** | `http://192.168.5.128/my-bookings.html` | Mã vé mẫu: `BK-2026-DUNE01` |
| 🗄️ **phpMyAdmin** | `http://192.168.5.128:8081/` | Server: `mysql`, User: `cinema_user`, Pass: `cinema_secret_password` |
| 📊 **Grafana Dashboard** | `http://192.168.5.128:3000/` | User: `admin`, Pass: `admin123` |
| 📈 **Prometheus Metrics** | `http://192.168.5.128:9090/` | 4/4 scrape targets UP |

### 8.3 Chính sách Bảo mật Cổng & Giới hạn Firewall:
1. **Dịch vụ mở Public:** Cổng `80` (Nginx Reverse Proxy) tiếp nhận lưu lượng web, áp dụng Rate Limiting (10 req/s, burst 20) và Security Headers.
2. **Dịch vụ Nội bộ Tuyệt đối (Không mở ra Host):**
   - MySQL (Port `3306`): Chỉ lưu thông trong `backend-net`.
   - Node.js API (Port `5000`): Chỉ tiếp nhận từ Nginx qua `frontend-net`.
   - cAdvisor (`8080`) & Node Exporter (`9100`): Chỉ nội bộ `monitoring-net`.
3. **Giới hạn Cổng Quản trị (`8081`, `3000`, `9090`, `3100`):**
   - Mặc định, mạng VMware NAT (`192.168.5.0/24`) đã cô lập hoàn toàn máy ảo khỏi mạng Internet công cộng bên ngoài.
   - Để giới hạn **chỉ cho phép máy Windows host (`192.168.5.1`)** kết nối vào các cổng quản trị và chặn các nguồn IP khác trong mạng nội bộ, quản trị viên có thể áp dụng luật Firewall trên Ubuntu VM:
     ```bash
     # Cho phép máy Windows (192.168.5.1) và nội bộ VM (127.0.0.1) vào các cổng quản trị
     sudo iptables -I DOCKER-USER -p tcp -m multiport --dports 8081,3000,9090,3100 -s 192.168.5.1,127.0.0.1 -j ACCEPT
     # Chặn tất cả các IP khác truy cập vào cụm cổng quản trị này
     sudo iptables -A DOCKER-USER -p tcp -m multiport --dports 8081,3000,9090,3100 -j DROP
     ```

### 8.4 Kiểm thử Kết nối Từ Máy Thật Windows:
Mở PowerShell trên máy Windows và thực thi kiểm tra các cổng dịch vụ:
```powershell
# 1. Kiểm tra Web Nginx (Port 80)
Test-NetConnection -ComputerName 192.168.5.128 -Port 80

# 2. Kiểm tra phpMyAdmin (Port 8081)
Test-NetConnection -ComputerName 192.168.5.128 -Port 8081

# 3. Kiểm tra Grafana (Port 3000)
Test-NetConnection -ComputerName 192.168.5.128 -Port 3000

# 4. Kiểm tra Prometheus (Port 9090)
Test-NetConnection -ComputerName 192.168.5.128 -Port 9090

# 5. Xác nhận cổng MySQL 3306 và App 5000 bị chặn an toàn (Kết quả phải là False)
Test-NetConnection -ComputerName 192.168.5.128 -Port 3306
Test-NetConnection -ComputerName 192.168.5.128 -Port 5000
```

---

## 9. Danh Sách Tài Khoản Kiểm Thử (Test Accounts)

| Username | Email | Mật khẩu | Vai trò | Họ và tên |
| :--- | :--- | :--- | :---: | :--- |
| `admin` | `admin@cinewave.vn` | `admin123` | **admin** | Quản Trị Viên Hệ Thống |
| `nguyenvanan` | `an.nguyen@example.com` | `user123` | **user** | Nguyễn Văn An |
| `tranthibich` | `bich.tran@example.com` | `user123` | **user** | Trần Thị Bích |

**Mã vé mẫu sẵn sàng kiểm thử Check-in / Tra cứu:**
- **Mã vé:** `BK-2026-DUNE01` (Phim *Dune 2*, Ghế VIP D3-D4 rạp CineWave Landmark 81, đã thanh toán). Tra cứu tại `http://192.168.5.128/my-bookings.html` hoặc mục Soát Vé tại Admin Portal.
