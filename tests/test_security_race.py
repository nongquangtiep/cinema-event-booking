#!/usr/bin/env python3
"""
Phase 7 Verification Script: Security Hardening & Double Booking / Race Condition Test
Tests:
1. Authorization & Role-Based Access Control (401 / 403 / 200)
2. Concurrent Hold Race Condition (Exactly one 200, one 409)
3. 5-Minute Seat Lock TTL & Expiration Status Behavior
4. Mock Payment Flow & E-Ticket QR Code Generation
5. Double Booking Prevention at Payment Level (UNIQUE constraint & 409 Conflict)
6. Nginx Security Headers & Rate Limiting (HTTP 429)
"""

import sys
import json
import time
import socket
import urllib.request
import urllib.error
import concurrent.futures
import subprocess

BASE_URL = "http://localhost"
API_URL = f"{BASE_URL}/api"

def http_request(method, path, data=None, token=None, headers=None):
    url = f"{API_URL}{path}" if path.startswith('/') else path
    req_headers = {"Content-Type": "application/json"}
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            body = response.read().decode('utf-8')
            try:
                json_body = json.loads(body) if body else {}
            except Exception:
                json_body = {"raw": body}
            return status, json_body, response.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            json_body = json.loads(body)
        except Exception:
            json_body = {"raw": body}
        return e.code, json_body, e.headers
    except Exception as e:
        return 0, {"error": str(e)}, {}

def run_tests():
    print("=================================================================")
    print("PHASE 7 TEST SUITE: SECURITY HARDENING & RACE CONDITION")
    print("=================================================================\n")
    
    # -------------------------------------------------------------
    # TEST 1: Healthcheck and Basic Endpoints
    # -------------------------------------------------------------
    print("--- [1] Checking API Health and Movies ---")
    status, health, _ = http_request("GET", "/health")
    assert status == 200, f"Health check failed: {status} {health}"
    print(f"[*] GET /api/health -> HTTP {status}: {health}")
    
    status, movies, _ = http_request("GET", "/movies")
    assert status == 200, f"Movies query failed: {status}"
    movie_count = len(movies.get("data", []))
    print(f"[*] GET /api/movies -> HTTP {status}: Found {movie_count} movies\n")

    # -------------------------------------------------------------
    # TEST 2: Authorization & RBAC
    # -------------------------------------------------------------
    print("--- [2] Checking Admin Authorization & RBAC ---")
    
    # 2.1 Unauthenticated access to admin endpoint
    status, res, _ = http_request("GET", "/admin/dashboard/stats")
    print(f"[*] Unauthenticated GET /api/admin/dashboard/stats -> HTTP {status} (Expected 401)")
    assert status == 401, f"Expected 401, got {status}: {res}"

    # 2.2 Login as regular user
    status, login_res, _ = http_request("POST", "/auth/login", {"username": "nguyenvanan", "password": "user123"})
    assert status == 200, f"User login failed: {login_res}"
    user_token = login_res["token"]
    print(f"[*] Logged in as regular user ('nguyenvanan') -> Token acquired")

    # 2.3 Regular user access to admin endpoint
    status, res, _ = http_request("GET", "/admin/dashboard/stats", token=user_token)
    print(f"[*] User GET /api/admin/dashboard/stats -> HTTP {status} (Expected 403)")
    assert status == 403, f"Expected 403, got {status}: {res}"

    # 2.4 Login as admin
    status, admin_login, _ = http_request("POST", "/auth/login", {"username": "admin", "password": "admin123"})
    assert status == 200, f"Admin login failed: {admin_login}"
    admin_token = admin_login["token"]
    print(f"[*] Logged in as admin ('admin') -> Token acquired")

    # 2.5 Admin access to admin endpoint
    status, admin_res, _ = http_request("GET", "/admin/dashboard/stats", token=admin_token)
    print(f"[*] Admin GET /api/admin/dashboard/stats -> HTTP {status} (Expected 200)")
    assert status == 200, f"Expected 200, got {status}: {admin_res}"
    print(f"[*] Dashboard stats retrieved: Total Revenue = {admin_res['data']['total_revenue']} VND\n")

    # -------------------------------------------------------------
    # TEST 3: Race Condition Test (Simultaneous Hold Request)
    # -------------------------------------------------------------
    print("--- [3] Checking Race Condition / Concurrent Hold on Same Seat ---")
    
    # Showtime 1: Find an available seat
    status, seat_layout, _ = http_request("GET", "/showtimes/1/seats")
    assert status == 200, "Failed to get seats for showtime 1"
    available_seats = [s["id"] for s in seat_layout.get("seats", []) if s["status"] == "available"]
    
    # Pick a high seat id unlikely to be booked in seeds
    test_seat_id = available_seats[-1] if available_seats else 30
    print(f"[*] Target seat for race condition: Seat ID {test_seat_id} (Showtime 1)")

    # Ensure seat is currently unlocked before test
    http_request("POST", "/bookings/release-seats", {
        "showtime_id": 1,
        "seat_ids": [test_seat_id],
        "session_id": "cleanup_before_race"
    })
    # Also clean up directly from db via docker exec just in case
    subprocess.run([
        "docker", "compose", "exec", "-T", "mysql", "mysql",
        "-u", "cinema_user", "-pcinema_secret_password", "cinema_db",
        "-e", f"DELETE FROM seat_locks WHERE showtime_id=1 AND seat_id={test_seat_id};"
    ], check=True, capture_output=True)

    session_a = f"session_race_A_{int(time.time())}"
    session_b = f"session_race_B_{int(time.time())}"

    def send_hold(session_id):
        return http_request("POST", "/bookings/hold-seats", {
            "showtime_id": 1,
            "seat_ids": [test_seat_id],
            "session_id": session_id
        })

    # Launch two simultaneous requests
    print(f"[*] Firing 2 simultaneous hold-seats requests for seat {test_seat_id}...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(send_hold, session_a)
        future_b = executor.submit(send_hold, session_b)
        res_a = future_a.result()
        res_b = future_b.result()

    status_a, body_a, _ = res_a
    status_b, body_b, _ = res_b

    print(f"[*] Request A ({session_a}) -> Status: {status_a}, Body: {body_a}")
    print(f"[*] Request B ({session_b}) -> Status: {status_b}, Body: {body_b}")

    statuses = sorted([status_a, status_b])
    if statuses == [200, 409]:
        winner = session_a if status_a == 200 else session_b
        loser = session_b if status_a == 200 else session_a
        print(f"[PASS] Race condition correctly handled!")
        print(f"       -> Winner ({winner}) received HTTP 200 OK")
        print(f"       -> Loser ({loser}) received HTTP 409 Conflict")
    else:
        print(f"[FAIL] Race condition violated! Expected [200, 409], but got {statuses}")
        sys.exit(1)

    # Clean up lock
    http_request("POST", "/bookings/release-seats", {
        "showtime_id": 1,
        "seat_ids": [test_seat_id],
        "session_id": session_a if status_a == 200 else session_b
    })
    print(f"[*] Test lock released\n")

    # -------------------------------------------------------------
    # TEST 4: 5-Minute Lock Expiry Behavior
    # -------------------------------------------------------------
    print("--- [4] Checking 5-Minute Seat Lock TTL & Expiry Status ---")
    expiry_seat_id = available_seats[-2] if len(available_seats) >= 2 else 29
    test_session = f"session_expiry_{int(time.time())}"

    # 4.1 Hold seat
    status, hold_res, _ = http_request("POST", "/bookings/hold-seats", {
        "showtime_id": 1,
        "seat_ids": [expiry_seat_id],
        "session_id": test_session
    })
    assert status == 200, f"Hold seat failed: {hold_res}"
    print(f"[*] Held seat {expiry_seat_id} with session {test_session} -> HTTP {status}")

    # 4.2 Verify seat status is 'locked' in API
    status, seat_layout, _ = http_request("GET", "/showtimes/1/seats")
    seat_status = next(s["status"] for s in seat_layout["seats"] if s["id"] == expiry_seat_id)
    print(f"[*] GET /api/showtimes/1/seats -> Seat {expiry_seat_id} status: '{seat_status}' (Expected 'locked')")
    assert seat_status == "locked", f"Expected 'locked', got '{seat_status}'"

    # 4.3 Simulate expiration by updating locked_until to 10 seconds ago
    print(f"[*] Simulating lock expiration (setting locked_until = NOW() - INTERVAL 10 SECOND)...")
    subprocess.run([
        "docker", "compose", "exec", "-T", "mysql", "mysql",
        "-u", "cinema_user", "-pcinema_secret_password", "cinema_db",
        "-e", f"UPDATE seat_locks SET locked_until = DATE_SUB(NOW(), INTERVAL 10 SECOND) WHERE showtime_id=1 AND seat_id={expiry_seat_id};"
    ], check=True, capture_output=True)

    # 4.4 Verify seat status is now 'available' in API
    status, seat_layout, _ = http_request("GET", "/showtimes/1/seats")
    seat_status_expired = next(s["status"] for s in seat_layout["seats"] if s["id"] == expiry_seat_id)
    print(f"[*] GET /api/showtimes/1/seats -> Expired seat status: '{seat_status_expired}' (Expected 'available')")
    assert seat_status_expired == "available", f"Expected 'available' for expired lock, got '{seat_status_expired}'"

    # 4.5 Another session should now be able to hold this seat
    new_session = f"session_new_{int(time.time())}"
    status, hold_new, _ = http_request("POST", "/bookings/hold-seats", {
        "showtime_id": 1,
        "seat_ids": [expiry_seat_id],
        "session_id": new_session
    })
    print(f"[*] New session acquiring expired seat -> HTTP {status} (Expected 200)")
    assert status == 200, f"Failed to acquire expired seat: {hold_new}"

    # Clean up
    http_request("POST", "/bookings/release-seats", {
        "showtime_id": 1,
        "seat_ids": [expiry_seat_id],
        "session_id": new_session
    })
    print("[PASS] Lock expiry logic verified successfully!\n")

    # -------------------------------------------------------------
    # TEST 5: Payment Flow & E-Ticket Generation
    # -------------------------------------------------------------
    print("--- [5] Checking Mock Payment Flow & E-Ticket Generation ---")
    pay_seat_id = available_seats[-3] if len(available_seats) >= 3 else 28
    pay_session = f"session_pay_{int(time.time())}"

    # 5.1 Hold seat
    status, _, _ = http_request("POST", "/bookings/hold-seats", {
        "showtime_id": 1,
        "seat_ids": [pay_seat_id],
        "session_id": pay_session
    })
    assert status == 200

    # 5.2 Create pending booking
    status, create_res, _ = http_request("POST", "/bookings/create", {
        "showtime_id": 1,
        "seat_ids": [pay_seat_id],
        "customer_name": "Test Payment User",
        "customer_email": "paytest@example.com",
        "customer_phone": "0987654321",
        "payment_method": "VNPAY_QR"
    })
    assert status == 201, f"Booking creation failed: {create_res}"
    booking_id = create_res["data"]["booking_id"]
    booking_code = create_res["data"]["booking_code"]
    print(f"[*] Created booking: ID {booking_id}, Code '{booking_code}', Status: {create_res['data']['payment_status']}")

    # 5.3 Confirm payment
    status, pay_res, _ = http_request("POST", f"/bookings/{booking_id}/confirm-payment", {
        "session_id": pay_session,
        "payment_method": "VNPAY_QR",
        "seat_ids": [pay_seat_id]
    })
    assert status == 200, f"Payment confirm failed: {pay_res}"
    print(f"[*] Payment confirmed: Status = '{pay_res['data']['payment_status']}', QR code length = {len(pay_res['data']['qr_code'])}")
    assert pay_res["data"]["payment_status"] == "paid"
    assert pay_res["data"]["qr_code"].startswith("data:image/png;base64,")

    # 5.4 Verify double payment on same booking is handled safely
    status, repay_res, _ = http_request("POST", f"/bookings/{booking_id}/confirm-payment", {
        "session_id": pay_session,
        "payment_method": "VNPAY_QR",
        "seat_ids": [pay_seat_id]
    })
    assert status == 200
    print(f"[*] Re-paying paid booking -> Handled safely (Status: {repay_res['data']['payment_status']}, Message: '{repay_res['message']}')")

    # 5.5 Verify seat is now permanently marked as 'booked'
    status, seat_layout, _ = http_request("GET", "/showtimes/1/seats")
    booked_status = next(s["status"] for s in seat_layout["seats"] if s["id"] == pay_seat_id)
    print(f"[*] GET /api/showtimes/1/seats -> Paid seat {pay_seat_id} status: '{booked_status}' (Expected 'booked')")
    assert booked_status == "booked"

    # 5.6 Verify double booking of paid seat is strictly rejected (409)
    status, reject_hold, _ = http_request("POST", "/bookings/hold-seats", {
        "showtime_id": 1,
        "seat_ids": [pay_seat_id],
        "session_id": "someone_else"
    })
    print(f"[*] Attempting to hold booked seat -> HTTP {status} (Expected 409)")
    assert status == 409, f"Expected 409, got {status}: {reject_hold}"
    print("[PASS] Payment flow and double booking guard verified!\n")

    # -------------------------------------------------------------
    # TEST 6: Nginx Security Headers & Rate Limiting
    # -------------------------------------------------------------
    print("--- [6] Checking Nginx Security Headers & Rate Limiting ---")
    status, _, headers = http_request("GET", f"{BASE_URL}/", headers={"Accept": "text/html"})
    print(f"[*] GET / -> HTTP {status}")
    print(f"    - X-Frame-Options: {headers.get('X-Frame-Options')}")
    print(f"    - X-Content-Type-Options: {headers.get('X-Content-Type-Options')}")
    print(f"    - Referrer-Policy: {headers.get('Referrer-Policy')}")
    print(f"    - Server: {headers.get('Server')}")
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("Server") == "nginx"  # No version number

    # Rate limiting test: fire rapid burst
    print(f"[*] Testing Nginx Rate Limiting (Zone: api_limit, Rate: 10r/s, Burst: 20)...")
    statuses = []
    for _ in range(35):
        s, _, _ = http_request("GET", "/health")
        statuses.append(s)
    
    count_200 = statuses.count(200)
    count_429 = statuses.count(429)
    print(f"[*] Fired 35 rapid requests -> HTTP 200: {count_200}, HTTP 429 (Rate Limited): {count_429}")
    assert count_429 > 0, "Rate limiter did not return any 429 status code"
    print("[PASS] Nginx rate limiter and security headers verified!\n")

    # -------------------------------------------------------------
    # TEST 7: Network & Port Isolation Check
    # -------------------------------------------------------------
    print("--- [7] Checking Network & Port Isolation ---")
    
    def check_port_bound(host, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            return s.connect_ex((host, port)) == 0

    # 7.1 Port 80 should be open on localhost
    p80 = check_port_bound("127.0.0.1", 80)
    print(f"[*] Port 80 (Nginx Public): {'OPEN (OK)' if p80 else 'CLOSED'}")
    assert p80, "Port 80 must be open"

    # 7.2 Port 3306 (MySQL) should NOT be open on host
    p3306 = check_port_bound("127.0.0.1", 3306)
    print(f"[*] Port 3306 (MySQL): {'OPEN (LEAK!)' if p3306 else 'CLOSED on host (OK)'}")
    assert not p3306, "Port 3306 must NOT be open on host"

    # 7.3 Port 5000 (App) should NOT be open on host
    p5000 = check_port_bound("127.0.0.1", 5000)
    print(f"[*] Port 5000 (Node.js App): {'OPEN (LEAK!)' if p5000 else 'CLOSED on host (OK)'}")
    assert not p5000, "Port 5000 must NOT be open on host"

    # 7.4 Port 9100 (Node Exporter) should NOT be open on host
    p9100 = check_port_bound("127.0.0.1", 9100)
    print(f"[*] Port 9100 (Node Exporter): {'OPEN (LEAK!)' if p9100 else 'CLOSED on host (OK)'}")
    assert not p9100, "Port 9100 must NOT be open on host"

    # 7.5 Port 8080 (cAdvisor) should NOT be open on host
    p8080 = check_port_bound("127.0.0.1", 8080)
    print(f"[*] Port 8080 (cAdvisor): {'OPEN (LEAK!)' if p8080 else 'CLOSED on host (OK)'}")
    assert not p8080, "Port 8080 must NOT be open on host"

    # 7.6 Localhost-only monitoring ports
    p8081 = check_port_bound("127.0.0.1", 8081)
    p9090 = check_port_bound("127.0.0.1", 9090)
    p3000 = check_port_bound("127.0.0.1", 3000)
    p3100 = check_port_bound("127.0.0.1", 3100)
    print(f"[*] phpMyAdmin (127.0.0.1:8081): {'OPEN (OK)' if p8081 else 'CLOSED'}")
    print(f"[*] Prometheus (127.0.0.1:9090): {'OPEN (OK)' if p9090 else 'CLOSED'}")
    print(f"[*] Grafana    (127.0.0.1:3000): {'OPEN (OK)' if p3000 else 'CLOSED'}")
    print(f"[*] Loki       (127.0.0.1:3100): {'OPEN (OK)' if p3100 else 'CLOSED'}")
    assert p8081 and p9090 and p3000 and p3100, "Localhost-only monitoring services must be bound"

    print("\n=================================================================")
    print("ALL PHASE 7 SECURITY & CONCURRENCY TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
