/**
 * CineWave My Bookings & Lookup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lookup-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('lookup-code').value.trim();
      if (code) {
        window.location.href = `ticket-success.html?code=${encodeURIComponent(code)}`;
      }
    });
  }

  loadRecentBookings();
});

async function loadRecentBookings() {
  const grid = document.getElementById('history-grid');
  const recentCodes = JSON.parse(localStorage.getItem('cinewave_recent_codes') || '[]');

  if (recentCodes.length === 0) {
    grid.innerHTML = '<p class="placeholder-text">Bạn chưa có mã vé nào được lưu gần đây. Hãy đặt vé hoặc tra cứu mã vé ở trên!</p>';
    return;
  }

  grid.innerHTML = '<p class="placeholder-text">Đang tải lịch sử vé...</p>';

  const cardsHtml = [];
  for (const code of recentCodes.slice(0, 8)) {
    try {
      const res = await api.get(`/bookings/${code}`);
      const b = res.data;
      cardsHtml.push(`
        <div class="card" style="background-color:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <span class="badge ${b.payment_status === 'paid' ? 'success' : 'muted'}">
              ${b.payment_status === 'paid' ? 'Đã Thanh Toán' : 'Đang Chờ'}
            </span>
            <code style="font-size:0.85rem;color:var(--accent-gold);">${b.booking_code}</code>
          </div>
          <h4 style="font-size:1.1rem;color:#fff;margin-bottom:0.5rem;">${b.movie_title}</h4>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.3rem;">Rạp: ${b.cinema_name} (${b.hall_name})</p>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">Suất: ${formatTimeOnly(b.start_time)} - ${formatDate(b.start_time)}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:0.75rem;">
            <strong style="color:var(--accent-gold);">${formatCurrency(b.total_amount)}</strong>
            <a href="ticket-success.html?code=${b.booking_code}" class="btn btn-outline" style="padding:0.35rem 0.75rem;font-size:0.85rem;">Xem Vé</a>
          </div>
        </div>
      `);
    } catch {
      // Ignore invalid or deleted code
    }
  }

  if (cardsHtml.length > 0) {
    grid.innerHTML = cardsHtml.join('');
  } else {
    grid.innerHTML = '<p class="placeholder-text">Không tìm thấy thông tin vé từ các mã đã lưu.</p>';
  }
}
