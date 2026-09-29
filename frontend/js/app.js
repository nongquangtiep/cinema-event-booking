/**
 * CineWave Home Page Script
 */

let allMovies = [];
let currentFilter = 'now_showing';

document.addEventListener('DOMContentLoaded', () => {
  loadMovies();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderMoviesList(e.target.value.trim().toLowerCase());
    });
  }
});

async function loadMovies() {
  const grid = document.getElementById('movies-grid');
  try {
    const res = await api.get('/movies');
    allMovies = res.data || [];
    renderMoviesList();
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-text" style="color:var(--accent-red)">Không thể tải danh sách phim: ${err.message}</p>`;
  }
}

function filterTab(status) {
  currentFilter = status;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (status === 'now_showing') document.getElementById('tab-now')?.classList.add('active');
  else if (status === 'coming_soon') document.getElementById('tab-soon')?.classList.add('active');
  else document.getElementById('tab-all')?.classList.add('active');

  const searchVal = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  renderMoviesList(searchVal);
}

function renderMoviesList(searchTerm = '') {
  const grid = document.getElementById('movies-grid');
  if (!grid) return;

  let filtered = allMovies;

  if (currentFilter !== 'all') {
    filtered = filtered.filter(m => m.status === currentFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(searchTerm) ||
      (m.description && m.description.toLowerCase().includes(searchTerm)) ||
      (m.category_name && m.category_name.toLowerCase().includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="placeholder-text">Không tìm thấy phim hoặc sự kiện nào phù hợp.</p>';
    return;
  }

  grid.innerHTML = filtered.map(movie => {
    const isNow = movie.status === 'now_showing';
    const badgeText = isNow ? 'Đang chiếu' : 'Sắp chiếu';
    const badgeClass = isNow ? 'success' : 'blue';
    const defaultPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600';

    return `
      <div class="movie-card">
        <div class="card-poster">
          <span class="badge ${badgeClass} card-badge">${badgeText}</span>
          <span class="card-duration">${movie.duration_minutes} phút</span>
          <img src="${movie.poster_url || defaultPoster}" alt="${movie.title}" onerror="this.src='${defaultPoster}'">
        </div>
        <div class="card-content">
          <div class="card-category">${movie.category_name || 'Phim'}</div>
          <h3 class="card-title">${movie.title}</h3>
          <p class="card-desc">${movie.description || 'Chưa có mô tả chi tiết.'}</p>
          <div class="card-actions">
            <a href="movie-detail.html?id=${movie.id}" class="btn btn-primary btn-block">
              ${isNow ? 'Đặt Vé Ngay' : 'Xem Chi Tiết'}
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
