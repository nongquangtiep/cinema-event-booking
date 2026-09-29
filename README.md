# Hệ thống Đặt vé Xem phim / Sự kiện (Cinema & Event Booking System)

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài:** 11 – Hệ thống Đặt vé Xem phim / Sự kiện  
**Môi trường triển khai:** Ubuntu VM, Docker, Docker Compose  

> **LƯU Ý:** Hệ thống hiện tại đang ở **Phase 1 (Skeleton Initialization)**. Không chạy bất kỳ container nào ở phase này.

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
│ - Rate limiting, Gzip, Security Headers, JSON Logs    │
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

## 4. Kế hoạch Triển khai 8 Phase
1. **Phase 1: Khởi tạo Skeleton Dự án & Git** (Giai đoạn hiện tại)
2. **Phase 2: Thiết kế Database & Khởi chạy MySQL + phpMyAdmin**
3. **Phase 3: Xây dựng Backend RESTful API & MySQL Transactions**
4. **Phase 4: Xây dựng Giao diện Web Frontend (Client + Admin)**
5. **Phase 5: Cấu hình Nginx Reverse Proxy (Port 80 HTTP)**
6. **Phase 6: Thiết lập Hệ thống Giám sát & Logs (Prometheus, Grafana, Loki, Promtail)**
7. **Phase 7: Rà soát Bảo mật & Kiểm thử Double Booking (Race Condition Test)**
8. **Phase 8: Kiểm thử Toàn diện E2E, Load Testing & Hoàn thiện Báo cáo**

---

## 5. Danh mục 10 Docker Services Dự kiến

| Service | Image | Mạng nội bộ | Port Mapping trên Host | Vai trò |
| :--- | :--- | :--- | :--- | :--- |
| `nginx` | `nginx:alpine` | `frontend-net`, `monitoring-net` | `80:80` | Cổng duy nhất mở ra ngoài host |
| `app` | Custom Node.js | `frontend-net`, `backend-net`, `monitoring-net` | *Không publish* | Backend Express API |
| `mysql` | `mysql:8.0` | `backend-net` | *Không publish* | Database chính |
| `phpmyadmin` | `phpmyadmin` | `backend-net` | `127.0.0.1:8081:80` | Giao diện quản trị database |
| `prometheus` | `prom/prometheus` | `monitoring-net` | `127.0.0.1:9090:9090` | Thu thập time-series metrics |
| `grafana` | `grafana/grafana` | `monitoring-net` | `127.0.0.1:3000:3000` | Trực quan hóa metrics & logs |
| `loki` | `grafana/loki` | `monitoring-net` | `127.0.0.1:3100:3100` | Lưu trữ tập trung logs |
| `promtail` | `grafana/promtail` | `monitoring-net` | *Không publish* | Thu thập log Nginx & Docker |
| `node-exporter`| `prom/node-exporter` | `monitoring-net` | *Không publish* | Thu thập metric máy chủ host |
| `cadvisor` | `gcr.io/cadvisor` | `monitoring-net` | *Không publish* | Thu thập metric tài nguyên containers |

---

## 6. Cơ chế Chống Double Booking (Triple-Layer Protection)
1. **Ràng buộc cứng Database:** Bảng `booking_seats` có khóa duy nhất `UNIQUE KEY unique_showtime_seat (showtime_id, seat_id)`.
2. **Khóa ghế có thời hạn (Seat Lock TTL 5 phút):** Bảng `seat_locks` giữ ghế tạm thời khi user đang điền thông tin thanh toán, tự động hủy sau 5 phút nếu không hoàn tất giao dịch.
3. **Database Transaction:** Áp dụng `START TRANSACTION`, `SELECT ... FOR UPDATE`, và `COMMIT/ROLLBACK` khi giữ ghế và xác nhận thanh toán. Khi phát hiện ghế đã bị giữ/đặt, API trả về mã lỗi `409 Conflict`.

---

## 7. Các Biện pháp Security Hardening
- **Non-root container:** Node.js chạy với user `node` (`USER node`).
- **Network Isolation:** 3 mạng Docker bridge riêng biệt (`frontend-net`, `backend-net`, `monitoring-net`). Cổng MySQL 3306 và App 5000 không mở ra ngoài host.
- **Loopback Binding:** Các cổng quản trị/debug (`phpmyadmin`, `prometheus`, `grafana`, `loki`) chỉ bind vào `127.0.0.1`.
- **Prepared Statements:** Chống SQL Injection 100% qua `mysql2/promise`.
- **Mã hóa:** Hash mật khẩu với `bcrypt` (salt rounds = 10), JWT Token có thời hạn sử dụng.
- **Nginx Protection:** Ẩn phiên bản `server_tokens off`, HTTP Security Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`), Rate Limiting (10 req/s).
- **Resource Constraints:** Giới hạn CPU và RAM cho từng container trong Compose.

---

## 8. Hướng dẫn Môi trường (Sau khi hoàn tất các Phase)
1. Tạo file cấu hình từ file mẫu:
   ```bash
   cp .env.example .env
   ```
2. Khởi động toàn bộ dịch vụ (chỉ thực hiện ở các Phase sau):
   ```bash
   docker compose up -d
   ```
3. Truy cập ứng dụng:
   - Website người dùng: `http://<IP-Host>/`
   - Quản trị Database: `http://127.0.0.1:8081`
   - Bảng điều khiển Grafana: `http://127.0.0.1:3000`
