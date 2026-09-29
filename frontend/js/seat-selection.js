/**
 * CineWave Interactive Seat Selection Script
 */

let currentShowtimeId = null;
let showtimeData = null;
let seatsList = [];
let selectedSeats = []; // Array of seat objects { id, row, number, price, type }
let holdInterval = null;
let holdRemainingSeconds = 300;
let isHolding = false;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentShowtimeId = urlParams.get('showtimeId');

  if (!currentShowtimeId) {
    document.getElementById('seat-matrix').innerHTML = '<p class="placeholder-text" style="color:var(--accent-red)">Thiếu ID suất chiếu. Vui lòng chọn lại suất chiếu từ chi tiết phim.</p>';
    return;
  }

  loadSeats(currentShowtimeId);

  document.getElementById('btn-hold-proceed').addEventListener('click', handleHoldOrProceed);
  document.getElementById('btn-release-seats').addEventListener('click', handleReleaseSeats);
});

async function loadSeats(showtimeId) {
  const matrixContainer = document.getElementById('seat-matrix');
  try {
    const res = await api.get(`/showtimes/${showtimeId}/seats`);
    showtimeData = res.showtime;
    seatsList = res.seats || [];

    // Update showtime summary labels
    document.getElementById('summary-movie').textContent = showtimeData.movie_title;
    document.getElementById('summary-hall').textContent = `${showtimeData.cinema_name} - ${showtimeData.hall_name} (${showtimeData.hall_type})`;
    document.getElementById('summary-time').textContent = `${formatTimeOnly(showtimeData.start_time)} - ${formatDate(showtimeData.start_time)}`;

    renderSeatMatrix();
    updateSummary();
  } catch (err) {
    matrixContainer.innerHTML = `<p class="placeholder-text" style="color:var(--accent-red)">Lỗi tải sơ đồ ghế: ${err.message}</p>`;
  }
}

function renderSeatMatrix() {
  const matrixContainer = document.getElementById('seat-matrix');
  if (!matrixContainer || seatsList.length === 0) return;

  // Group seats by row (A, B, C...)
  const rowsMap = {};
  seatsList.forEach(seat => {
    if (!rowsMap[seat.seat_row]) rowsMap[seat.seat_row] = [];
    rowsMap[seat.seat_row].push(seat);
  });

  const sortedRows = Object.keys(rowsMap).sort();

  let html = '';
  sortedRows.forEach(rowKey => {
    const rowSeats = rowsMap[rowKey].sort((a, b) => a.seat_number - b.seat_number);

    html += `
      <div class="seat-row">
        <span class="row-label">${rowKey}</span>
        ${rowSeats.map(seat => {
          const isSelected = selectedSeats.some(s => s.id === seat.id);
          const isCouple = seat.seat_type === 'couple';
          const isVip = seat.seat_type === 'vip';

          let stateClass = seat.status; // 'available', 'locked', 'booked'
          if (isSelected) stateClass = 'selected';

          let typeClass = '';
          if (isCouple) typeClass = 'couple';
          else if (isVip) typeClass = 'vip';

          const titleTooltip = `Ghế ${seat.seat_row}${seat.seat_number} (${seat.seat_type.toUpperCase()}) - ${formatCurrency(seat.price)}`;

          return `
            <div class="seat ${typeClass} ${stateClass}" 
                 data-id="${seat.id}" 
                 title="${titleTooltip}"
                 onclick="toggleSeatSelection(${seat.id})">
              ${seat.seat_row}${seat.seat_number}
            </div>
          `;
        }).join('')}
        <span class="row-label">${rowKey}</span>
      </div>
    `;
  });

  matrixContainer.innerHTML = html;
}

function toggleSeatSelection(seatId) {
  if (isHolding) {
    showToast('Bạn đang trong phiên giữ ghế. Hãy nhấn "Tiếp tục thanh toán" hoặc "Hủy giữ ghế" để chọn lại.', 'warning');
    return;
  }

  const seat = seatsList.find(s => s.id === seatId);
  if (!seat) return;

  if (seat.status === 'booked') {
    showToast('Ghế này đã được bán thành công, không thể chọn.', 'error');
    return;
  }

  if (seat.status === 'locked') {
    showToast('Ghế này đang được một khách hàng khác giữ chỗ tạm thời.', 'warning');
    return;
  }

  const existingIdx = selectedSeats.findIndex(s => s.id === seat.id);
  if (existingIdx >= 0) {
    selectedSeats.splice(existingIdx, 1);
  } else {
    if (selectedSeats.length >= 8) {
      showToast('Bạn chỉ có thể chọn tối đa 8 ghế trong 1 đơn đặt.', 'warning');
      return;
    }
    selectedSeats.push({
      id: seat.id,
      seat_row: seat.seat_row,
      seat_number: seat.seat_number,
      seat_type: seat.seat_type,
      price: seat.price
    });
  }

  renderSeatMatrix();
  updateSummary();
}

function updateSummary() {
  const chipsContainer = document.getElementById('selected-chips');
  const totalPriceElem = document.getElementById('total-price');
  const btnHoldProceed = document.getElementById('btn-hold-proceed');

  if (selectedSeats.length === 0) {
    chipsContainer.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">Chưa chọn ghế nào</span>';
    totalPriceElem.textContent = '0 đ';
    btnHoldProceed.disabled = true;
    return;
  }

  chipsContainer.innerHTML = selectedSeats.map(s => `
    <span class="seat-chip">${s.seat_row}${s.seat_number}</span>
  `).join('');

  const total = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
  totalPriceElem.textContent = formatCurrency(total);
  btnHoldProceed.disabled = false;
}

async function handleHoldOrProceed() {
  // If already holding seats, proceed to checkout page
  if (isHolding) {
    window.location.href = 'checkout.html';
    return;
  }

  if (selectedSeats.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 ghế.', 'warning');
    return;
  }

  const sessionId = getSessionId();
  const seatIds = selectedSeats.map(s => s.id);
  const btn = document.getElementById('btn-hold-proceed');
  btn.disabled = true;
  btn.textContent = 'Đang giữ ghế...';

  try {
    const res = await api.post('/bookings/hold-seats', {
      showtime_id: parseInt(currentShowtimeId, 10),
      seat_ids: seatIds,
      session_id: sessionId
    });

    if (res.success) {
      isHolding = true;
      holdRemainingSeconds = res.expires_in_seconds || 300;

      // Save hold state in sessionStorage for checkout page
      sessionStorage.setItem('cinewave_hold_data', JSON.stringify({
        showtimeId: currentShowtimeId,
        seatIds,
        selectedSeats,
        totalAmount: selectedSeats.reduce((acc, curr) => acc + curr.price, 0),
        sessionId,
        showtimeData,
        expiresAt: Date.now() + holdRemainingSeconds * 1000
      }));

      // Start countdown
      startHoldCountdown();

      // Update UI button
      btn.disabled = false;
      btn.textContent = 'Tiến Hành Thanh Toán →';
      document.getElementById('btn-release-seats').style.display = 'block';

      showToast('Đã giữ ghế thành công trong 5 phút! Vui lòng thanh toán sớm.', 'success');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Giữ Ghế & Tiếp Tục';

    if (err.status === 409) {
      showToast('Một hoặc nhiều ghế vừa bị người khác giữ hoặc đặt trước! Đang tải lại sơ đồ ghế...', 'error');
    } else {
      showToast(err.message || 'Không thể giữ ghế.', 'error');
    }

    // Refresh seat statuses
    selectedSeats = [];
    loadSeats(currentShowtimeId);
  }
}

function startHoldCountdown() {
  const timerContainer = document.getElementById('hold-timer-container');
  const timerDisplay = document.getElementById('timer-display');
  if (timerContainer) timerContainer.style.display = 'block';

  if (holdInterval) clearInterval(holdInterval);

  updateTimerDisplay();

  holdInterval = setInterval(() => {
    holdRemainingSeconds--;
    updateTimerDisplay();

    if (holdRemainingSeconds <= 0) {
      clearInterval(holdInterval);
      isHolding = false;
      sessionStorage.removeItem('cinewave_hold_data');
      if (timerContainer) timerContainer.style.display = 'none';

      showToast('Thời gian giữ ghế 5 phút đã hết hạn! Vui lòng chọn lại ghế.', 'warning');
      selectedSeats = [];
      document.getElementById('btn-hold-proceed').textContent = 'Giữ Ghế & Tiếp Tục';
      document.getElementById('btn-release-seats').style.display = 'none';
      loadSeats(currentShowtimeId);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const m = Math.floor(holdRemainingSeconds / 60).toString().padStart(2, '0');
    const s = (holdRemainingSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
  }
}

async function handleReleaseSeats() {
  const sessionId = getSessionId();
  const seatIds = selectedSeats.map(s => s.id);

  try {
    await api.post('/bookings/release-seats', {
      showtime_id: parseInt(currentShowtimeId, 10),
      seat_ids: seatIds,
      session_id: sessionId
    });

    if (holdInterval) clearInterval(holdInterval);
    isHolding = false;
    sessionStorage.removeItem('cinewave_hold_data');

    const timerContainer = document.getElementById('hold-timer-container');
    if (timerContainer) timerContainer.style.display = 'none';

    selectedSeats = [];
    document.getElementById('btn-hold-proceed').textContent = 'Giữ Ghế & Tiếp Tục';
    document.getElementById('btn-release-seats').style.display = 'none';

    showToast('Đã hủy giữ ghế thành công.', 'info');
    loadSeats(currentShowtimeId);
  } catch (err) {
    showToast('Lỗi giải phóng ghế: ' + err.message, 'error');
  }
}
