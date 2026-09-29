/**
 * CineWave E-Ticket Display Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) {
    document.getElementById('ticket-details').innerHTML = '<p class="placeholder-text" style="color:var(--accent-red)">Thiếu mã đặt vé trong đường dẫn.</p>';
    return;
  }

  loadTicketData(code);
});

async function loadTicketData(bookingCode) {
  const detailsContainer = document.getElementById('ticket-details');
  const codeElem = document.getElementById('ticket-code');
  const qrImage = document.getElementById('qr-image');

  try {
    const res = await api.get(`/bookings/${bookingCode}`);
    const booking = res.data;

    codeElem.textContent = booking.booking_code;

    const seatsFormatted = (booking.seats || []).map(s => `${s.seat_row}${s.seat_number} (${s.seat_type.toUpperCase()})`).join(', ');

    detailsContainer.innerHTML = `
      <div class="ticket-row">
        <span>Khách hàng:</span>
        <strong>${booking.customer_name}</strong>
      </div>
      <div class="ticket-row">
        <span>Tên Phim:</span>
        <strong style="color:var(--accent-gold);text-align:right;">${booking.movie_title}</strong>
      </div>
      <div class="ticket-row">
        <span>Cụm Rạp:</span>
        <strong style="text-align:right;">${booking.cinema_name}</strong>
      </div>
      <div class="ticket-row">
        <span>Phòng Chiếu:</span>
        <strong>${booking.hall_name} (${booking.hall_type})</strong>
      </div>
      <div class="ticket-row">
        <span>Suất Chiếu:</span>
        <strong>${formatTimeOnly(booking.start_time)} - ${formatDate(booking.start_time)}</strong>
      </div>
      <div class="ticket-row">
        <span>Vị Trí Ghế:</span>
        <strong style="color:var(--accent-emerald);">${seatsFormatted || 'Chưa xác định'}</strong>
      </div>
      <div class="ticket-row">
        <span>Phương Thức:</span>
        <strong>${booking.payment_method || 'Mô phỏng'}</strong>
      </div>
      <div class="ticket-row" style="border-top:1px dashed var(--border-light);padding-top:0.75rem;margin-top:0.5rem;">
        <span style="font-size:1.05rem;">Tổng Thanh Toán:</span>
        <strong style="font-size:1.25rem;color:var(--accent-gold);">${formatCurrency(booking.total_amount)}</strong>
      </div>
    `;

    // Render QR Code Image if available
    if (booking.qr_code) {
      qrImage.src = booking.qr_code;
      qrImage.style.display = 'block';
    }
  } catch (err) {
    detailsContainer.innerHTML = `<p class="placeholder-text" style="color:var(--accent-red)">Lỗi nạp vé: ${err.message}</p>`;
  }
}
