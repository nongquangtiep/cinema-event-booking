/**
 * CineWave Admin Dashboard Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = auth.getUser();
  if (!user || user.role !== 'admin') {
    showToast('Khu vực dành riêng cho Quản trị viên (Admin). Vui lòng đăng nhập tài khoản Admin!', 'error');
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1200);
    return;
  }

  // Clean display name immediately (resolving any stale cached mojibake in localStorage)
  let displayName = user.full_name || user.username;
  if (displayName && (displayName.includes('Quá') || displayName.includes('Ã'))) {
    displayName = 'Quản Trị Viên Hệ Thống';
  }
  document.getElementById('admin-name').textContent = displayName;

  // Always sync fresh profile from /api/auth/me to update client localStorage
  api.get('/auth/me').then(res => {
    if (res && res.user) {
      auth.setSession(auth.getToken(), res.user);
      document.getElementById('admin-name').textContent = res.user.full_name || res.user.username;
    }
  }).catch(() => {});

  // Sidebar Tab Navigation
  document.querySelectorAll('.sidebar-menu button.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-menu button.menu-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId)?.classList.add('active');

      const titleMap = {
        'sec-stats': 'Báo Cáo Thống Kê',
        'sec-movies': 'Quản Lý Danh Mục Phim',
        'sec-bookings': 'Quản Lý Đơn Đặt Vé',
        'sec-checkin': 'Soát Vé & Check-in'
      };
      document.getElementById('section-title').textContent = titleMap[targetId] || 'Quản Trị';

      if (targetId === 'sec-movies') loadAdminMovies();
      if (targetId === 'sec-bookings') loadAdminBookings();
    });
  });

  // Admin Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    auth.clearSession();
    window.location.href = '../index.html';
  });

  // Toggle Movie Form
  const btnToggleMovie = document.getElementById('btn-toggle-movie-form');
  const movieFormBox = document.getElementById('movie-form-box');
  const btnCancelMovie = document.getElementById('btn-cancel-movie');

  btnToggleMovie?.addEventListener('click', () => {
    movieFormBox.style.display = movieFormBox.style.display === 'none' ? 'block' : 'none';
  });

  btnCancelMovie?.addEventListener('click', () => {
    movieFormBox.style.display = 'none';
  });

  // Add Movie Submit
  document.getElementById('form-add-movie')?.addEventListener('submit', handleAddMovie);

  // Check-in Submit
  document.getElementById('form-checkin')?.addEventListener('submit', handleCheckIn);

  // Initial load
  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    const res = await api.get('/admin/dashboard/stats');
    const stats = res.data;

    document.getElementById('kpi-revenue').textContent = formatCurrency(stats.total_revenue);
    document.getElementById('kpi-tickets').textContent = stats.total_tickets.toLocaleString();
    document.getElementById('kpi-movies').textContent = stats.total_movies.toLocaleString();
    document.getElementById('kpi-users').textContent = stats.total_users.toLocaleString();

    const tbody = document.getElementById('recent-bookings-body');
    const bookings = stats.recent_bookings || [];

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có đơn đặt vé nào.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td><code>${b.booking_code}</code></td>
        <td>${b.customer_name}</td>
        <td><strong>${b.movie_title}</strong></td>
        <td style="color:var(--accent-gold);">${formatCurrency(b.total_amount)}</td>
        <td>
          <span class="badge ${b.payment_status === 'paid' ? 'success' : 'muted'}">
            ${b.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : b.payment_status.toUpperCase()}
          </span>
        </td>
        <td>${formatDateTime(b.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Lỗi tải số liệu thống kê: ' + err.message, 'error');
  }
}

async function loadAdminMovies() {
  const tbody = document.getElementById('admin-movies-body');
  try {
    const res = await api.get('/movies');
    const movies = res.data || [];

    tbody.innerHTML = movies.map(m => `
      <tr>
        <td>#${m.id}</td>
        <td><strong>${m.title}</strong></td>
        <td>${m.category_name || '-'}</td>
        <td>${m.duration_minutes} phút</td>
        <td>${formatDate(m.release_date)}</td>
        <td>
          <span class="badge ${m.status === 'now_showing' ? 'success' : 'blue'}">
            ${m.status === 'now_showing' ? 'Đang Chiếu' : 'Sắp Chiếu'}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red)">Lỗi: ${err.message}</td></tr>`;
  }
}

async function handleAddMovie(e) {
  e.preventDefault();
  const title = document.getElementById('m-title').value.trim();
  const category_id = parseInt(document.getElementById('m-category').value, 10);
  const duration_minutes = parseInt(document.getElementById('m-duration').value, 10);
  const release_date = document.getElementById('m-release').value;
  const status = document.getElementById('m-status').value;
  const poster_url = document.getElementById('m-poster').value.trim();
  const description = document.getElementById('m-desc').value.trim();

  try {
    await api.post('/movies', {
      title,
      category_id,
      duration_minutes,
      release_date,
      status,
      poster_url,
      description
    });

    showToast('Thêm phim mới thành công!', 'success');
    document.getElementById('movie-form-box').style.display = 'none';
    document.getElementById('form-add-movie').reset();
    loadAdminMovies();
  } catch (err) {
    showToast('Lỗi thêm phim: ' + err.message, 'error');
  }
}

async function loadAdminBookings() {
  const tbody = document.getElementById('admin-all-bookings-body');
  try {
    const res = await api.get('/admin/bookings?limit=50');
    const bookings = res.data || [];

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chưa có đơn đặt vé nào.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td><code>${b.booking_code}</code></td>
        <td>${b.customer_name}</td>
        <td>${b.customer_phone}</td>
        <td><strong>${b.movie_title}</strong></td>
        <td>${b.cinema_name} - ${b.hall_name} (${formatTimeOnly(b.start_time)})</td>
        <td style="color:var(--accent-gold);">${formatCurrency(b.total_amount)}</td>
        <td>
          <span class="badge ${b.payment_status === 'paid' ? 'success' : 'muted'}">
            ${b.payment_status.toUpperCase()}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red)">Lỗi: ${err.message}</td></tr>`;
  }
}

async function handleCheckIn(e) {
  e.preventDefault();
  const input = document.getElementById('input-checkin-code');
  const code = input.value.trim();
  const resultBox = document.getElementById('checkin-result-box');

  if (!code) return;

  try {
    const res = await api.post('/admin/check-in', { booking_code: code });

    resultBox.className = 'checkin-result success';
    resultBox.innerHTML = `
      <h4 style="margin-bottom:0.5rem;">✅ ${res.message}</h4>
      <div style="font-size:0.9rem;display:flex;flex-direction:column;gap:4px;">
        <p>Khách hàng: <strong>${res.ticket.customer_name}</strong></p>
        <p>Phim: <strong>${res.ticket.movie_title}</strong></p>
        <p>Rạp / Phòng: <strong>${res.ticket.cinema_name} - ${res.ticket.hall_name}</strong></p>
        <p>Suất chiếu: <strong>${formatDateTime(res.ticket.start_time)}</strong></p>
        <p>Vị trí ghế: <strong style="color:#fff;">${res.ticket.seats.join(', ')}</strong></p>
      </div>
    `;
    input.value = '';
    showToast('Xác thực vé thành công!', 'success');
  } catch (err) {
    resultBox.className = 'checkin-result error';
    resultBox.innerHTML = `
      <h4>❌ Không thể soát vé</h4>
      <p style="font-size:0.9rem;margin-top:4px;">${err.message}</p>
    `;
    showToast(err.message || 'Mã vé không hợp lệ!', 'error');
  }
}
