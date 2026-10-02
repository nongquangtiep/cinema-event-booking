#!/usr/bin/env python3
"""
End-to-End (E2E) Flow Verification Test Script
Cinema & Event Booking System - Phase 8
"""

import sys
import json
import time
import urllib.request
import urllib.error
import concurrent.futures
import subprocess

BASE_URL = "http://localhost"
API_URL = f"{BASE_URL}/api"

def http_req(method, path, data=None, token=None, headers=None):
    url = f"{API_URL}{path}" if path.startswith('/') else path
    req_headers = {"Content-Type": "application/json"}
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)

    encoded_data = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = resp.read().decode('utf-8')
            try:
                json_body = json.loads(body) if body else {}
            except Exception:
                json_body = {"raw": body}
            return status, json_body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            json_body = json.loads(body)
        except Exception:
            json_body = {"raw": body}
        return e.code, json_body
    except Exception as e:
        return 0, {"error": str(e)}

def run_e2e():
    print("==================================================================")
    print("PHASE 8 E2E BUSINESS FLOW VERIFICATION")
    print("==================================================================\n")

    # 1. Login with test account
    print("--- [Step 1] User Login ---")
    status, login_res = http_req("POST", "/auth/login", {"username": "nguyenvanan", "password": "user123"})
    assert status == 200, f"Login failed: {login_res}"
    user_token = login_res["token"]
    user_info = login_res["user"]
    print(f"[PASS] Logged in as: {user_info['full_name']} (Role: {user_info['role']})")

    # 2. View movies and showtimes
    print("\n--- [Step 2] View Movies and Showtimes ---")
    status, movies_res = http_req("GET", "/movies")
    assert status == 200, f"Get movies failed: {movies_res}"
    movies = movies_res.get("data", [])
    print(f"[PASS] Total movies found: {len(movies)}")

    # Pick a movie that has active showtimes
    selected_movie = None
    showtimes = []
    for m in movies:
        st, m_detail = http_req("GET", f"/movies/{m['id']}")
        if st == 200 and len(m_detail["data"].get("showtimes", [])) > 0:
            selected_movie = m_detail["data"]
            showtimes = selected_movie["showtimes"]
            break

    assert selected_movie is not None, "No movie with active showtimes found"
    showtime = showtimes[0]
    showtime_id = showtime["id"]
    print(f"[PASS] Selected Movie: '{selected_movie['title']}'")
    print(f"[PASS] Selected Showtime ID: {showtime_id} at {showtime['start_time']} ({showtime['hall_name']})")

    # 3. Select seat, hold seat, and check countdown timer (TTL)
    print("\n--- [Step 3] Select Seat & Hold Seat (5-min TTL) ---")
    status, seat_layout = http_req("GET", f"/showtimes/{showtime_id}/seats")
    assert status == 200, f"Get seats failed: {seat_layout}"
    available_seats = [s for s in seat_layout["seats"] if s["status"] == "available"]
    assert len(available_seats) >= 2, "Need at least 2 available seats for test"

    target_seat = available_seats[0]
    target_seat_id = target_seat["id"]
    session_id = f"e2e_session_{int(time.time())}"
    print(f"[*] Targeting Seat ID: {target_seat_id} ({target_seat['seat_row']}{target_seat['seat_number']} - {target_seat['seat_type'].upper()})")

    status, hold_res = http_req("POST", "/bookings/hold-seats", {
        "showtime_id": showtime_id,
        "seat_ids": [target_seat_id],
        "session_id": session_id
    })
    assert status == 200, f"Hold seat failed: {hold_res}"
    assert hold_res["expires_in_seconds"] == 300, f"Expected 300s TTL, got {hold_res}"
    print(f"[PASS] Seat successfully held. TTL: {hold_res['expires_in_seconds']} seconds (5 minutes)")

    # Verify status in API is 'locked'
    status, seat_layout_locked = http_req("GET", f"/showtimes/{showtime_id}/seats")
    seat_status = next(s["status"] for s in seat_layout_locked["seats"] if s["id"] == target_seat_id)
    assert seat_status == "locked", f"Expected seat locked, got {seat_status}"
    print(f"[PASS] Dynamic Seat Matrix verified: Seat {target_seat_id} is 'locked'")

    # 4. Fill customer details & create pending booking
    print("\n--- [Step 4] Customer Info & Create Pending Booking ---")
    status, create_res = http_req("POST", "/bookings/create", {
        "showtime_id": showtime_id,
        "seat_ids": [target_seat_id],
        "customer_name": "Nguyen Van An",
        "customer_email": "an.nguyen@example.com",
        "customer_phone": "0901234567",
        "payment_method": "mock_vnpay"
    }, token=user_token)
    assert status == 201, f"Create booking failed: {create_res}"
    booking_id = create_res["data"]["booking_id"]
    booking_code = create_res["data"]["booking_code"]
    total_amount = create_res["data"]["total_amount"]
    print(f"[PASS] Pending Booking Created -> ID: {booking_id}, Code: {booking_code}, Amount: {total_amount:,.0f} VND")

    # 5. Process Mock Payment
    print("\n--- [Step 5] Mock Payment Processing ---")
    status, pay_res = http_req("POST", f"/bookings/{booking_id}/confirm-payment", {
        "session_id": session_id,
        "payment_method": "mock_vnpay",
        "seat_ids": [target_seat_id]
    }, token=user_token)
    assert status == 200, f"Payment failed: {pay_res}"
    print(f"[PASS] Payment confirmed. Message: '{pay_res['message']}'")

    # 6. Verify Booking Code, Payment Status & Dynamic QR Code
    print("\n--- [Step 6] Verify E-Ticket & QR Code ---")
    paid_booking = pay_res["data"]
    assert paid_booking["payment_status"] == "paid", f"Expected 'paid', got {paid_booking['payment_status']}"
    assert paid_booking["qr_code"].startswith("data:image/png;base64,"), "Invalid QR code format"
    qr_preview = paid_booking["qr_code"][:50] + "..."
    print(f"[PASS] Ticket Status: '{paid_booking['payment_status']}'")
    print(f"[PASS] Dynamic QR Code Generated: {qr_preview} (Length: {len(paid_booking['qr_code'])} chars)")

    # 7. Check Booking Lookup & MySQL Data Persistence
    print("\n--- [Step 7] Verify Booking History & MySQL Records ---")
    status, lookup_res = http_req("GET", f"/bookings/{booking_code}")
    assert status == 200, f"Lookup failed: {lookup_res}"
    lookup_data = lookup_res["data"]
    assert lookup_data["booking_code"] == booking_code
    print(f"[PASS] Lookup API verified: Found booking {booking_code} for movie '{lookup_data['movie_title']}'")

    # Verify directly from MySQL database
    db_check = subprocess.run([
        "docker", "compose", "exec", "-T", "mysql", "mysql",
        "-u", "cinema_user", "-pcinema_secret_password", "cinema_db",
        "-e", f"SELECT b.id, b.booking_code, b.payment_status, bs.seat_id, s.seat_row, s.seat_number FROM bookings b JOIN booking_seats bs ON b.id = bs.booking_id JOIN seats s ON bs.seat_id = s.id WHERE b.booking_code = '{booking_code}';"
    ], check=True, capture_output=True, text=True)
    print(f"[PASS] Direct MySQL Verification:\n{db_check.stdout.strip()}")

    # 8. Check Admin Portal: Stats, Bookings list, Check-in
    print("\n--- [Step 8] Admin Portal: Stats, List & Gate Check-in ---")
    status, admin_login = http_req("POST", "/auth/login", {"username": "admin", "password": "admin123"})
    assert status == 200, f"Admin login failed: {admin_login}"
    admin_token = admin_login["token"]

    status, stats = http_req("GET", "/admin/dashboard/stats", token=admin_token)
    assert status == 200, f"Stats failed: {stats}"
    kpi = stats["data"]
    print(f"[PASS] Admin KPI: Revenue={kpi['total_revenue']:,.0f} VND, Tickets Sold={kpi['total_tickets']}, Movies={kpi['total_movies']}, Users={kpi['total_users']}")

    status, admin_bookings = http_req("GET", "/admin/bookings?limit=5", token=admin_token)
    assert status == 200, f"Admin bookings failed: {admin_bookings}"
    recent_codes = [b["booking_code"] for b in admin_bookings.get("data", [])]
    assert booking_code in recent_codes, f"New booking {booking_code} should appear in admin bookings list"
    print(f"[PASS] Admin Bookings List: Confirmed booking {booking_code} is listed.")

    # Check-in the ticket at the cinema gate
    status, checkin_res = http_req("POST", "/admin/check-in", {
        "booking_code": booking_code
    }, token=admin_token)
    assert status == 200, f"Check-in failed: {checkin_res}"
    assert checkin_res["valid"] is True
    print(f"[PASS] Gate Check-in: {checkin_res['message']} (Customer: {checkin_res['ticket']['customer_name']}, Seats: {checkin_res['ticket']['seats']})")

    # 9. Verify RBAC Security (Non-admin blocked)
    print("\n--- [Step 9] RBAC Security Verification ---")
    status, unauth_res = http_req("GET", "/admin/dashboard/stats")
    assert status == 401, f"Expected 401 Unauthenticated, got {status}"
    print(f"[PASS] Unauthenticated access to Admin endpoint -> Blocked with HTTP {status}")

    status, user_admin_res = http_req("GET", "/admin/dashboard/stats", token=user_token)
    assert status == 403, f"Expected 403 Forbidden for user role, got {status}"
    print(f"[PASS] Regular user access to Admin endpoint -> Blocked with HTTP {status}")

    # 10. Double Booking Prevention (Concurrent Requests)
    print("\n--- [Step 10] Double Booking Prevention (2 Concurrent Requests) ---")
    race_seat = available_seats[1]
    race_seat_id = race_seat["id"]
    print(f"[*] Testing race condition on Seat ID {race_seat_id} ({race_seat['seat_row']}{race_seat['seat_number']})...")

    # Clean up lock for race seat just in case
    http_req("POST", "/bookings/release-seats", {
        "showtime_id": showtime_id,
        "seat_ids": [race_seat_id],
        "session_id": "cleanup_before"
    })

    def fire_hold(sess):
        return http_req("POST", "/bookings/hold-seats", {
            "showtime_id": showtime_id,
            "seat_ids": [race_seat_id],
            "session_id": sess
        })

    sess_1 = f"race_req_1_{int(time.time())}"
    sess_2 = f"race_req_2_{int(time.time())}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(fire_hold, sess_1)
        f2 = executor.submit(fire_hold, sess_2)
        r1_status, r1_body = f1.result()
        r2_status, r2_body = f2.result()

    print(f"[*] Request 1 ({sess_1}) -> Status: {r1_status}")
    print(f"[*] Request 2 ({sess_2}) -> Status: {r2_status}")

    race_statuses = sorted([r1_status, r2_status])
    assert race_statuses == [200, 409], f"Expected [200, 409], got {race_statuses}"
    print("[PASS] Concurrent Hold Race Condition Handled: Exactly ONE request received 200 OK, other received 409 Conflict.")

    # Also test holding the already-booked seat from Step 5
    status, hold_paid_seat = http_req("POST", "/bookings/hold-seats", {
        "showtime_id": showtime_id,
        "seat_ids": [target_seat_id],
        "session_id": "thief_session"
    })
    assert status == 409, f"Expected 409 for already booked seat, got {status}: {hold_paid_seat}"
    print(f"[PASS] Double Booking Guard on Paid Seat: Attempt to hold paid seat {target_seat_id} was rejected with HTTP {status}.")

    # Release race seat lock
    http_req("POST", "/bookings/release-seats", {
        "showtime_id": showtime_id,
        "seat_ids": [race_seat_id],
        "session_id": sess_1 if r1_status == 200 else sess_2
    })

    print("\n==================================================================")
    print("ALL 10 E2E BUSINESS FLOW TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================================")

if __name__ == "__main__":
    run_e2e()
