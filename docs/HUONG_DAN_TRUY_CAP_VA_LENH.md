# CẨM NANG TRA CỨU ĐƯỜNG LINK DỊCH VỤ & LỆNH TERMINAL
## HỆ THỐNG ĐẶT VÉ XEM PHIM / SỰ KIỆN CINEWAVE (ĐỀ TÀI 11)

> **Máy chủ triển khai:** Ubuntu Server VM (Địa chỉ IP: `192.168.5.128`)  
> **Sinh viên thực hiện:** NÔNG QUANG TIỆP – MSSV: `DTC245200148` – Lớp: `CNTT K23G`  
> **Tài liệu phục vụ:** Thi thực hành, vấn đáp môn học *Triển khai và Quản trị Hệ thống Phần mềm*.

---

## PHẦN 1: BẢNG TỔNG HỢP LINK TRUY CẬP 10 DỊCH VỤ (SERVICES)

| STT | Service Name | Tên Container | Cổng Host | Giao Thức / Link Truy Cập Trực Tiếp | Tài Khoản / Mật Khẩu Mặc Định | Chức Năng Chính |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | `nginx` | `cinema-nginx` | **80, 443** | • Client: [`https://192.168.5.128/`](https://192.168.5.128/)<br>• Admin: [`https://192.168.5.128/admin/`](https://192.168.5.128/admin/)<br>• HTTP: `http://192.168.5.128:80` *(Redirect 301)* | Khách hàng đăng ký tự do | Ingress Gateway, Reverse Proxy, SSL Termination, Bảo mật Headers |
| **2** | `app` | `cinema-app` | *5000 (Đóng)* | • Health: `https://192.168.5.128/api/health`<br>• Movies: `https://192.168.5.128/api/movies`<br>• Metrics: `https://192.168.5.128/api/metrics` *(proxy nội bộ)* | `admin` / `password123`<br>`customer` / `password123` | Backend Node.js 20 Express, khóa ghế TTL 5p, cấp phát JWT, sinh mã vé QR |
| **3** | `mysql` | `cinema-mysql` | *3306 (Đóng)* | • Kết nối qua CLI hoặc phpMyAdmin<br>• Host DB: `mysql` hoặc `127.0.0.1` | User: `cinema_user` / `cinema_secret_password`<br>Root: `root` / `cinema_root_super_secret`<br>DB Name: `cinema_db` | CSDL quan hệ MySQL 8.0 InnoDB, lưu trữ 10 bảng 3NF, bảo đảm tính toàn vẹn ACID |
| **4** | `phpmyadmin` | `cinema-phpmyadmin` | **8081** | [`http://192.168.5.128:8081/`](http://192.168.5.128:8081/) | Server: `mysql`<br>User: `cinema_user`<br>Pass: `cinema_secret_password` | Giao diện Web quản trị CSDL trực quan, xem dữ liệu bảng, chạy truy vấn SQL |
| **5** | `prometheus` | `cinema-prometheus` | **9090** | • Targets: [`http://192.168.5.128:9090/targets`](http://192.168.5.128:9090/targets)<br>• Graph: [`http://192.168.5.128:9090/graph`](http://192.168.5.128:9090/graph) | Không yêu cầu đăng nhập | Time-Series DB, định kỳ cào metrics mỗi 10s từ 4 endpoints |
| **6** | `grafana` | `cinema-grafana` | **3000** | [`http://192.168.5.128:3000/`](http://192.168.5.128:3000/) | `admin` / `admin123` | Bảng điều khiển trực quan hóa Dashboards đồ họa & Tra cứu LogQL |
| **7** | `loki` | `cinema-loki` | **3100** | • Ready check: `http://192.168.5.128:3100/ready`<br>• Labels API: `http://192.168.5.128:3100/loki/api/v1/labels` | Không yêu cầu (Tra cứu qua Grafana Explore) | Kho lưu trữ và đánh chỉ mục Log tập trung |
| **8** | `promtail` | `cinema-promtail` | *9080 (Đóng)* | Thu thập tự động đẩy về Loki | Tự động chạy nền | Agent gom log từ `/var/run/docker.sock` và file Nginx access log |
| **9** | `node-exporter`| `cinema-node-exporter`| *9100 (Đóng)*| Đo tài nguyên máy chủ host | Tự động cào qua Prometheus | Xuất metrics phần cứng Ubuntu VM (CPU, RAM, Disk, Network) |
| **10**| `cadvisor` | `cinema-cadvisor` | *8080 (Đóng)*| Đo tài nguyên 10 container | Tự động cào qua Prometheus | cAdvisor v0.55.1 đo chi tiết %CPU, RAM, I/O của từng container |

---

## PHẦN 2: ĐƯỜNG LINK TRỰC TIẾP 4 DASHBOARD TRÊN GRAFANA

Sau khi đăng nhập Grafana (`http://192.168.5.128:3000`, User: `admin` / Pass: `admin123`):

1. **Dashboard 01 - Hạ tầng Máy chủ Ubuntu Host (Node Exporter):**  
   👉 Link: `http://192.168.5.128:3000/d/host-infrastructure/01-host-infrastructure-ubuntu-vm`  
   *(Hiển thị: % CPU tải máy chủ, Dung lượng RAM đã dùng, Tốc độ mạng eth0, Tốc độ đọc/ghi đĩa)*

2. **Dashboard 02 - Tài nguyên 10 Docker Containers (cAdvisor):**  
   👉 Link: `http://192.168.5.128:3000/d/docker-containers/02-docker-containers-cadvisor`  
   *(Hiển thị: Số lượng container đang chạy = 10, Biểu đồ CPU % từng container, Biểu đồ RAM MB, Băng thông I/O mạng)*

3. **Dashboard 03 - Hiệu năng Ứng dụng RED Metrics (APM):**  
   👉 Link: `http://192.168.5.128:3000/d/app-red-metrics/03-application-apm-red-metrics`  
   *(Hiển thị: Tần suất gọi API rate, Tỷ lệ lỗi HTTP 4xx/5xx, Biểu đồ độ trễ phân vị P95/P99)*

4. **Dashboard 04 - Nghiệp vụ Rạp chiếu phim & Logs Tập trung (Loki):**  
   👉 Link: `http://192.168.5.128:3000/d/cinema-business-logs/04-cinema-business-live-logs`  
   *(Hiển thị: Tổng doanh thu vé VND, Số vé đã bán, Số ghế đang khóa tạm thời, Nhật ký log ứng dụng và Nginx thời gian thực)*

5. **Giao diện Tra cứu Log Linh hoạt (Grafana Explore - LogQL):**  
   👉 Link: `http://192.168.5.128:3000/explore`

---

## PHẦN 3: CÁC THAO TÁC TERMINAL THIẾT YẾU (DÙNG KHI ĐI THI)

### 1. Quản lý trạng thái 10 Docker Containers

```bash
# Di chuyển vào thư mục dự án
cd /home/nong-quang-tiep/cinema-event-booking

# Kiểm tra trạng thái sống của toàn bộ 10 container
docker compose ps

# Xem mức chiếm dụng tài nguyên thời gian thực của 10 container (CPU %, RAM, Network)
docker stats --no-stream

# Khởi động lại toàn bộ hệ thống
docker compose down
docker compose up -d

# Khởi động lại riêng 1 dịch vụ (ví dụ cAdvisor hoặc Nginx)
docker compose restart cadvisor
docker compose restart nginx
```

---

### 2. Xem trực tiếp Log của từng dịch vụ trên Terminal

```bash
# Xem log của Nginx Reverse Proxy (theo dõi request từ trình duyệt)
docker logs -f cinema-nginx --tail 50

# Xem log của Backend App (theo dõi nghiệp vụ giữ ghế, JWT, thanh toán)
docker logs -f cinema-app --tail 50

# Xem log của Cơ sở dữ liệu MySQL
docker logs -f cinema-mysql --tail 50

# Xem log của cAdvisor (kiểm tra thu thập metrics container)
docker logs -f cinema-cadvisor --tail 50

# Xem log của Promtail (kiểm tra gom log đẩy về Loki)
docker logs -f cinema-promtail --tail 50
```

---

### 3. Thao tác truy vấn Cơ sở dữ liệu MySQL trực tiếp bằng Terminal

```bash
# Truy cập vào giao diện dòng lệnh MySQL bên trong container
docker exec -it cinema-mysql mysql -u cinema_user -pcinema_secret_password cinema_db

# (Sau khi vào dấu nhắc mysql>)
# 1. Xem danh sách các bảng trong hệ thống:
SHOW TABLES;

# 2. Xem danh sách phim đang chiếu:
SELECT id, title, genre, duration_minutes, rating FROM movies_events;

# 3. Xem các ghế đang bị khóa tạm thời (TTL 5 phút):
SELECT * FROM seat_locks WHERE locked_until > NOW();

# 4. Xem danh sách các đơn đặt vé thành công gần nhất:
SELECT booking_code, total_amount, status, payment_status, created_at FROM bookings ORDER BY id DESC LIMIT 5;

# 5. Thoát khỏi MySQL:
exit;
```

---

### 4. Kiểm tra sức khỏe & Endpoint Metrics bằng lệnh `curl`

```bash
# 1. Kiểm tra Nginx Ingress Health (Bỏ qua cảnh báo SSL tự ký với cờ -k)
curl -k https://192.168.5.128/nginx-health

# 2. Kiểm tra Health Check của Backend Node.js
curl -k https://192.168.5.128/api/health

# 3. Kiểm tra Security Headers do Nginx trả về
curl -k -I https://192.168.5.128/

# 4. Kiểm tra trạng thái 4 Targets trên Prometheus API
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastScrapeDuration: .lastScrapeDuration}'

# 5. Kiểm tra danh sách nhãn log trên Loki API
curl -s http://localhost:3100/loki/api/v1/label/container_name/values | jq .
```

---

### 5. Chạy bộ kiểm thử tự động toàn diện (E2E & Load Test)

```bash
# Chạy bộ test luồng nghiệp vụ E2E (10 kịch bản kiểm thử)
python3 tests/test_e2e_flow.py

# Chạy kiểm thử đồng thời phòng chống tranh chấp ghế (Race Condition / Double Booking)
python3 tests/test_security_race.py

# Chạy kiểm thử tải hệ thống bằng Apache Benchmark (200 requests, 10 luồng đồng thời)
ab -n 200 -c 10 https://192.168.5.128/
```

---

## PHẦN 4: CÁC CÂU LỆNH TRUY VẤN "TỦ" COPY-PASTE NHANH KHI ĐI THI

### 1. Câu lệnh PromQL (Dán vào ô Expression tại `http://192.168.5.128:9090/graph`)

| Tên Chỉ Số Cần Xem | Câu Lệnh PromQL Chuẩn Xác | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- |
| **Đếm số container đang chạy** | `count(count by (name) (container_cpu_usage_seconds_total{name=~"cinema-.*"}))` | Trả về số **10** |
| **Mức tiêu thụ CPU từng container (%)** | `sum(rate(container_cpu_usage_seconds_total{name=~"cinema-.*"}[1m])) by (name) * 100` | Vẽ biểu đồ % CPU của 10 container |
| **Mức dùng RAM từng container (MB)** | `sum(container_memory_usage_bytes{name=~"cinema-.*"}) by (name) / 1024 / 1024` | Trả về dung lượng RAM từ 15MB - 300MB |
| **Băng thông mạng nhận vào (KB/s)** | `sum(rate(container_network_receive_bytes_total{name=~"cinema-.*"}[1m])) by (name) / 1024` | Lưu lượng mạng nhận vào từng container |
| **Tổng số request gọi API Backend** | `sum(http_requests_total) by (handler, status)` | Thống kê số lượng request theo endpoint |
| **Tải CPU máy chủ Ubuntu Host (%)** | `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)` | Tỷ lệ sử dụng CPU tổng thể của VM |

---

### 2. Câu lệnh LogQL (Dán vào ô Query tại `http://192.168.5.128:3000/explore`)

| Mục Tiêu Tra Cứu Log | Câu Lệnh LogQL Chuẩn Xác | Ý Nghĩa Kỹ Thuật |
| :--- | :--- | :--- |
| **Xem log của Backend App** | `{container_name="app"}` | Luồng log Node.js, JWT, đặt vé, khóa ghế |
| **Xem log của toàn bộ 10 container** | `{job="docker"}` | Xem nhật ký hoạt động của toàn hệ thống |
| **Xem log Nginx Web Server** | `{container_name="nginx"}` | Log truy cập HTTP/HTTPS của người dùng |
| **Xem log Cơ sở dữ liệu MySQL** | `{container_name="mysql"}` | Log kết nối và truy vấn của CSDL |
| **Lọc toàn bộ thông báo lỗi trong hệ thống**| `{job="docker"} \|= "error"` | Tìm kiếm nhanh các sự cố phát sinh |
| **Lọc log lỗi HTTP 5xx từ Nginx** | `{container_name="nginx"} \|~ " (5[0-9]{2}) "` | Phát hiện lỗi 500, 502 Bad Gateway |
| **Truy vết thao tác Khóa ghế / Tranh chấp**| `{container_name="app"} \|= "Seat"` | Giám sát TTL và xử lý Race Condition |

---

## PHẦN 5: CHECKLIST NHANH KHI VÀO PHÒNG THI VẤN ĐÁP

- [ ] **Bước 1:** Khởi động máy ảo Ubuntu, kiểm tra địa chỉ IP bằng lệnh `ip a` (đảm bảo là `192.168.5.128`).
- [ ] **Bước 2:** Chạy `docker compose up -d` và kiểm tra `docker compose ps` (đảm bảo cả 10 container đều `Up`).
- [ ] **Bước 3:** Mở sẵn các tab trình duyệt theo thứ tự:
  1. Tab 1: **Trang chủ Khách hàng:** `https://192.168.5.128/`
  2. Tab 2: **Trang Quản trị Admin:** `https://192.168.5.128/admin/`
  3. Tab 3: **phpMyAdmin CSDL:** `http://192.168.5.128:8081/`
  4. Tab 4: **Prometheus Targets:** `http://192.168.5.128:9090/targets` (4 target xanh UP)
  5. Tab 5: **Grafana 4 Dashboards:** `http://192.168.5.128:3000/`
  6. Tab 6: **Grafana Explore (Loki):** `http://192.168.5.128:3000/explore`
- [ ] **Bước 4:** Sẵn sàng 1 cửa sổ Terminal tại `/home/nong-quang-tiep/cinema-event-booking` để chạy test khi được yêu cầu: `python3 tests/test_e2e_flow.py`.
