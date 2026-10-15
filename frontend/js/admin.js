/**
 * CineWave Admin Dashboard Script (Enterprise UI & Real-Time Filtering)
 */

let globalStats = null;
let allAdminBookings = [];
let allAdminMovies = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = auth.getUser();
  if (!user || user.role !== 'admin') {
    showToast('Khu vực dành riêng cho Quản trị viên (Admin). Vui lòng đăng nhập tài khoản Admin!', 'error');
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1200);
    return;
  }

  // Set Admin Name & Avatar
  let displayName = user.full_name || user.username || 'Quản Trị Viên';
  if (displayName && (displayName.includes('Quá') || displayName.includes('Ã'))) {
    displayName = 'Quản Trị Viên';
  }
  updateAdminProfileDisplay(displayName);

  // Sync fresh profile from /api/auth/me
  api.get('/auth/me').then(res => {
    if (res && res.user) {
      auth.setSession(auth.getToken(), res.user);
      updateAdminProfileDisplay(res.user.full_name || res.user.username);
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
        'sec-stats': { title: '<i class="fa-solid fa-chart-pie" style="color:var(--accent-red);margin-right:8px;"></i>Báo Cáo Thống Kê', breadcrumb: 'Báo Cáo Thống Kê' },
        'sec-movies': { title: '<i class="fa-solid fa-film" style="color:var(--accent-red);margin-right:8px;"></i>Quản Lý Danh Mục Phim', breadcrumb: 'Quản Lý Phim' },
        'sec-bookings': { title: '<i class="fa-solid fa-ticket" style="color:var(--accent-red);margin-right:8px;"></i>Quản Lý Đơn Đặt Vé', breadcrumb: 'Danh Sách Vé' },
        'sec-checkin': { title: '<i class="fa-solid fa-qrcode" style="color:var(--accent-red);margin-right:8px;"></i>Soát Vé & Check-in', breadcrumb: 'Soát Vé Check-in' }
      };

      const meta = titleMap[targetId] || { title: 'Quản Trị', breadcrumb: 'Quản Trị' };
      document.getElementById('section-title').innerHTML = meta.title;
      document.getElementById('breadcrumb-current').textContent = meta.breadcrumb;

      if (targetId === 'sec-movies') loadAdminMovies();
      if (targetId === 'sec-bookings') loadAdminBookings();
    });
  });

  // Refresh Button in Header
  const btnRefresh = document.getElementById('btn-refresh-stats');
  btnRefresh?.addEventListener('click', async () => {
    const icon = btnRefresh.querySelector('i');
    icon?.classList.add('spinning');
    btnRefresh.disabled = true;

    const activeSec = document.querySelector('.admin-section.active');
    const secId = activeSec ? activeSec.id : 'sec-stats';

    if (secId === 'sec-stats') await loadDashboardStats();
    else if (secId === 'sec-movies') await loadAdminMovies();
    else if (secId === 'sec-bookings') await loadAdminBookings();

    setTimeout(() => {
      icon?.classList.remove('spinning');
      btnRefresh.disabled = false;
      showToast('Đã làm mới dữ liệu hệ thống!', 'success');
    }, 450);
  });

  // Admin Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    auth.clearSession();
    showToast('Đã đăng xuất khỏi trang Quản trị.', 'info');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 400);
  });

  // Live Search Filters
  const recentSearch = document.getElementById('recent-search-input');
  recentSearch?.addEventListener('input', (e) => {
    filterRecentBookings(e.target.value.trim().toLowerCase());
  });

  const moviesSearch = document.getElementById('movies-search-input');
  moviesSearch?.addEventListener('input', (e) => {
    filterAdminMovies(e.target.value.trim().toLowerCase());
  });

  const bookingsSearch = document.getElementById('bookings-search-input');
  bookingsSearch?.addEventListener('input', (e) => {
    filterAdminBookings(e.target.value.trim().toLowerCase());
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

function updateAdminProfileDisplay(name) {
  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.textContent = name;
  const avatarEl = document.querySelector('.admin-avatar');
  if (avatarEl) {
    const initials = name.split(' ').map(w => w.charAt(0)).filter(Boolean).slice(-2).join('').toUpperCase();
    avatarEl.textContent = initials || 'AD';
  }
}

async function loadDashboardStats() {
  try {
    const res = await api.get('/admin/dashboard/stats');
    globalStats = res.data;

    document.getElementById('kpi-revenue').textContent = formatCurrency(globalStats.total_revenue);
    document.getElementById('kpi-tickets').textContent = globalStats.total_tickets.toLocaleString();
    document.getElementById('kpi-movies').textContent = globalStats.total_movies.toLocaleString();
    document.getElementById('kpi-users').textContent = globalStats.total_users.toLocaleString();

    renderRecentBookings(globalStats.recent_bookings || []);
  } catch (err) {
    showToast('Lỗi tải số liệu thống kê: ' + err.message, 'error');
  }
}

function renderRecentBookings(bookings) {
  const tbody = document.getElementById('recent-bookings-body');
  const counter = document.getElementById('recent-counter');
  if (!tbody) return;

  if (counter) counter.textContent = `${bookings.length} đơn vé`;

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;" class="placeholder-text">Không có đơn đặt vé nào phù hợp.</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const isPaid = b.payment_status === 'paid';
    const initial = (b.customer_name || 'K').charAt(0).toUpperCase();

    return `
      <tr>
        <td><span class="code-pill">${b.booking_code}</span></td>
        <td>
          <div class="user-inline">
            <span class="avatar-sm">${initial}</span>
            <strong>${b.customer_name || 'Khách vãng lai'}</strong>
          </div>
        </td>
        <td>
          <div class="movie-inline">
            <i class="fa-solid fa-film" style="color:var(--accent-red);font-size:0.85rem;"></i>
            <span>${b.movie_title}</span>
          </div>
        </td>
        <td style="color:var(--accent-gold);font-weight:700;">${formatCurrency(b.total_amount)}</td>
        <td>
          <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
            <i class="fa-solid fa-circle"></i> ${isPaid ? 'ĐÃ THANH TOÁN' : b.payment_status.toUpperCase()}
          </span>
        </td>
        <td style="color:var(--text-muted);font-size:0.82rem;"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>${formatDateTime(b.created_at)}</td>
      </tr>
    `;
  }).join('');
}

function filterRecentBookings(term) {
  if (!globalStats || !globalStats.recent_bookings) return;
  if (!term) {
    renderRecentBookings(globalStats.recent_bookings);
    return;
  }
  const filtered = globalStats.recent_bookings.filter(b => 
    b.booking_code.toLowerCase().includes(term) ||
    b.customer_name.toLowerCase().includes(term) ||
    b.movie_title.toLowerCase().includes(term)
  );
  renderRecentBookings(filtered);
}

async function loadAdminMovies() {
  const tbody = document.getElementById('admin-movies-body');
  const counter = document.getElementById('movies-counter');
  try {
    const res = await api.get('/movies');
    allAdminMovies = res.data || [];
    if (counter) counter.textContent = `${allAdminMovies.length} phim`;
    renderAdminMoviesTable(allAdminMovies);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red)">Lỗi: ${err.message}</td></tr>`;
  }
}

function renderAdminMoviesTable(movies) {
  const tbody = document.getElementById('admin-movies-body');
  if (!tbody) return;

  if (movies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;" class="placeholder-text">Không tìm thấy phim phù hợp.</td></tr>';
    return;
  }

  tbody.innerHTML = movies.map(m => {
    const isNow = m.status === 'now_showing';
    const poster = m.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100';

    return `
      <tr>
        <td style="color:var(--text-muted);font-weight:700;">#${m.id}</td>
        <td>
          <div class="movie-inline">
            <img src="${poster}" alt="${m.title}" class="movie-thumb" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100'">
            <div>
              <strong style="color:var(--text-primary);display:block;">${m.title}</strong>
              <small style="color:var(--text-muted);"><i class="fa-solid fa-star" style="color:var(--accent-gold);margin-right:3px;"></i>${m.rating || '9.0'}</small>
            </div>
          </div>
        </td>
        <td><span style="color:var(--accent-blue);font-weight:600;">${m.category_name || '-'}</span></td>
        <td><i class="fa-regular fa-clock" style="color:var(--text-muted);margin-right:4px;"></i>${m.duration_minutes} phút</td>
        <td style="color:var(--text-muted);">${formatDate(m.release_date)}</td>
        <td>
          <span class="status-pill ${isNow ? 'status-paid' : 'status-pending'}">
            <i class="fa-solid fa-circle"></i> ${isNow ? 'ĐANG CHIẾU' : 'SẮP CHIẾU'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminMovies(term) {
  if (!term) {
    renderAdminMoviesTable(allAdminMovies);
    return;
  }
  const filtered = allAdminMovies.filter(m =>
    m.title.toLowerCase().includes(term) ||
    (m.category_name && m.category_name.toLowerCase().includes(term))
  );
  renderAdminMoviesTable(filtered);
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
  const counter = document.getElementById('bookings-counter');
  try {
    const res = await api.get('/admin/bookings?limit=100');
    allAdminBookings = res.data || [];
    if (counter) counter.textContent = `${allAdminBookings.length} đơn vé`;
    renderAdminBookingsTable(allAdminBookings);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red)">Lỗi: ${err.message}</td></tr>`;
  }
}

function renderAdminBookingsTable(bookings) {
  const tbody = document.getElementById('admin-all-bookings-body');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;" class="placeholder-text">Chưa có đơn đặt vé nào.</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const isPaid = b.payment_status === 'paid';
    const initial = (b.customer_name || 'K').charAt(0).toUpperCase();

    return `
      <tr>
        <td><span class="code-pill">${b.booking_code}</span></td>
        <td>
          <div class="user-inline">
            <span class="avatar-sm">${initial}</span>
            <strong>${b.customer_name || 'Khách vãng lai'}</strong>
          </div>
        </td>
        <td style="color:var(--text-secondary);font-family:monospace;">${b.customer_phone || '-'}</td>
        <td><strong>${b.movie_title}</strong></td>
        <td>
          <span style="font-size:0.83rem;color:var(--text-muted);"><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${b.cinema_name} - ${b.hall_name}</span>
          <br>
          <strong style="color:var(--accent-blue);font-size:0.82rem;">${formatTimeOnly(b.start_time)}</strong>
        </td>
        <td style="color:var(--accent-gold);font-weight:700;">${formatCurrency(b.total_amount)}</td>
        <td>
          <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
            <i class="fa-solid fa-circle"></i> ${isPaid ? 'ĐÃ THANH TOÁN' : b.payment_status.toUpperCase()}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminBookings(term) {
  if (!term) {
    renderAdminBookingsTable(allAdminBookings);
    return;
  }
  const filtered = allAdminBookings.filter(b => 
    b.booking_code.toLowerCase().includes(term) ||
    (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
    (b.customer_phone && b.customer_phone.toLowerCase().includes(term)) ||
    (b.movie_title && b.movie_title.toLowerCase().includes(term))
  );
  renderAdminBookingsTable(filtered);
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
      <h4 style="margin-bottom:0.75rem;font-size:1.15rem;"><i class="fa-solid fa-circle-check"></i> ${res.message}</h4>
      <div style="font-size:0.92rem;display:flex;flex-direction:column;gap:6px;background:rgba(0,0,0,0.2);padding:1rem;border-radius:8px;">
        <p>Khách hàng: <strong>${res.ticket.customer_name}</strong></p>
        <p>Phim: <strong style="color:var(--accent-red);">${res.ticket.movie_title}</strong></p>
        <p>Rạp & Phòng chiếu: <strong>${res.ticket.cinema_name} - ${res.ticket.hall_name}</strong></p>
        <p>Suất chiếu: <strong>${formatDateTime(res.ticket.start_time)}</strong></p>
        <p>Vị trí ghế ngồi: <strong style="color:var(--accent-gold);font-size:1.1rem;">${res.ticket.seats.join(', ')}</strong></p>
      </div>
    `;
    input.value = '';
    showToast('Xác thực vé hợp lệ! Cho phép vào phòng chiếu.', 'success');
  } catch (err) {
    resultBox.className = 'checkin-result error';
    resultBox.innerHTML = `
      <h4 style="font-size:1.1rem;"><i class="fa-solid fa-triangle-exclamation"></i> Không thể soát vé</h4>
      <p style="font-size:0.92rem;margin-top:6px;">${err.message}</p>
    `;
    showToast(err.message || 'Mã vé không hợp lệ!', 'error');
  }
}
