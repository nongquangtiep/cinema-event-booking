/**
 * CineWave Checkout & Mock Payment Script
 */

let holdData = null;
let countdownTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const rawData = sessionStorage.getItem('cinewave_hold_data');
  if (!rawData) {
    showToast('Không tìm thấy thông tin ghế đang giữ. Vui lòng chọn ghế trước.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  try {
    holdData = JSON.parse(rawData);
  } catch {
    window.location.href = 'index.html';
    return;
  }

  renderCheckoutSummary();
  startSyncCountdown();
  prefillUserInfo();

  document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);
});

function prefillUserInfo() {
  const user = auth.getUser();
  if (user) {
    const nameInput = document.getElementById('cust-name');
    const emailInput = document.getElementById('cust-email');
    const phoneInput = document.getElementById('cust-phone');

    if (nameInput && user.full_name) nameInput.value = user.full_name;
    if (emailInput && user.email) emailInput.value = user.email;
    if (phoneInput && user.phone) phoneInput.value = user.phone;
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary-content');
  const st = holdData.showtimeData;

  const seatsLabels = holdData.selectedSeats.map(s => `${s.seat_row}${s.seat_number} (${s.seat_type.toUpperCase()})`).join(', ');

  container.innerHTML = `
    <div class="summary-detail">
      <div class="summary-row">
        <span>Phim:</span>
        <strong style="color:var(--text-primary);text-align:right;">${st.movie_title}</strong>
      </div>
      <div class="summary-row">
        <span>Rạp:</span>
        <strong style="text-align:right;">${st.cinema_name}</strong>
      </div>
      <div class="summary-row">
        <span>Phòng:</span>
        <strong>${st.hall_name} (${st.hall_type})</strong>
      </div>
      <div class="summary-row">
        <span>Suất chiếu:</span>
        <strong style="color:var(--accent-gold);">${formatTimeOnly(st.start_time)} - ${formatDate(st.start_time)}</strong>
      </div>
      <div class="summary-row">
        <span>Ghế đã giữ:</span>
        <strong style="color:var(--accent-emerald);text-align:right;">${seatsLabels}</strong>
      </div>
    </div>

    <div class="order-item-row total">
      <span>Tổng Tiền:</span>
      <strong>${formatCurrency(holdData.totalAmount)}</strong>
    </div>
  `;
}

function startSyncCountdown() {
  const timerElem = document.getElementById('checkout-timer');

  const update = () => {
    const remainingMs = holdData.expiresAt - Date.now();
    const remainingSec = Math.floor(remainingMs / 1000);

    if (remainingSec <= 0) {
      clearInterval(countdownTimer);
      sessionStorage.removeItem('cinewave_hold_data');
      timerElem.textContent = '00:00';
      showToast('Phiên giữ ghế của bạn đã hết hạn. Đang chuyển về trang chủ...', 'warning');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
      return;
    }

    const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
    const s = (remainingSec % 60).toString().padStart(2, '0');
    timerElem.textContent = `${m}:${s}`;
  };

  update();
  countdownTimer = setInterval(update, 1000);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('btn-submit-payment');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý giao dịch mô phỏng...';

  const customerName = document.getElementById('cust-name').value.trim();
  const customerEmail = document.getElementById('cust-email').value.trim();
  const customerPhone = document.getElementById('cust-phone').value.trim();
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'VNPAY_QR';

  try {
    // Step 1: Create pending booking order
    const createRes = await api.post('/bookings/create', {
      showtime_id: parseInt(holdData.showtimeId, 10),
      seat_ids: holdData.seatIds,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_method: paymentMethod
    });

    const bookingId = createRes.data.booking_id;
    const bookingCode = createRes.data.booking_code;

    // Step 2: Confirm mock payment
    const confirmRes = await api.post(`/bookings/${bookingId}/confirm-payment`, {
      session_id: holdData.sessionId,
      payment_method: paymentMethod,
      seat_ids: holdData.seatIds
    });

    // Save code to local history list for my-bookings lookup
    const savedCodes = JSON.parse(localStorage.getItem('cinewave_recent_codes') || '[]');
    if (!savedCodes.includes(bookingCode)) {
      savedCodes.unshift(bookingCode);
      localStorage.setItem('cinewave_recent_codes', JSON.stringify(savedCodes.slice(0, 20)));
    }

    // Clean up hold session
    if (countdownTimer) clearInterval(countdownTimer);
    sessionStorage.removeItem('cinewave_hold_data');

    showToast('Thanh toán mô phỏng thành công! Đang chuyển đến vé điện tử...', 'success');
    setTimeout(() => {
      window.location.href = `ticket-success.html?code=${bookingCode}`;
    }, 1000);

  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Xác Nhận & Thanh Toán Ngay';

    if (err.status === 409) {
      showToast('Lỗi: Ghế vừa được thanh toán bởi một đơn hàng khác hoặc phiên giữ ghế đã hết hạn!', 'error');
    } else {
      showToast(err.message || 'Lỗi thanh toán đơn hàng.', 'error');
    }
  }
}
