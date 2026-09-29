/**
 * CineWave Movie Detail & Showtimes Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');

  if (!movieId) {
    document.getElementById('movie-detail-view').innerHTML = '<p class="placeholder-text" style="color:var(--accent-red)">Thiếu ID phim. Vui lòng quay lại trang chủ.</p>';
    return;
  }

  loadMovieDetail(movieId);
});

async function loadMovieDetail(id) {
  const detailContainer = document.getElementById('movie-detail-view');
  const showtimesContainer = document.getElementById('showtimes-container');

  try {
    const res = await api.get(`/movies/${id}`);
    const movie = res.data;

    // Render Movie Hero Info
    detailContainer.innerHTML = `
      <div class="movie-hero-layout">
        <div class="detail-poster">
          <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600'}" alt="${movie.title}">
        </div>
        <div class="detail-info">
          <span class="badge ${movie.status === 'now_showing' ? 'success' : 'blue'}">
            ${movie.status === 'now_showing' ? 'Đang Chiếu' : 'Sắp Chiếu'}
          </span>
          <h1>${movie.title}</h1>
          
          <div class="detail-meta-list">
            <div class="meta-item">Thể loại: <strong>${movie.category_name || 'Phim'}</strong></div>
            <div class="meta-item">Thời lượng: <strong>${movie.duration_minutes} phút</strong></div>
            <div class="meta-item">Khởi chiếu: <strong>${formatDate(movie.release_date)}</strong></div>
          </div>

          <div class="detail-desc">
            ${movie.description || 'Chưa có tóm tắt nội dung chi tiết cho bộ phim này.'}
          </div>

          ${movie.trailer_url ? `
            <a href="${movie.trailer_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
              ▶ Xem Trailer Chính Thức
            </a>
          ` : ''}
        </div>
      </div>
    `;

    // Render Showtimes grouped by Cinema
    const showtimes = movie.showtimes || [];
    if (showtimes.length === 0) {
      showtimesContainer.innerHTML = '<p class="placeholder-text">Hiện chưa có lịch chiếu cho phim này. Vui lòng quay lại sau.</p>';
      return;
    }

    // Group showtimes by cinema_name
    const cinemaMap = {};
    showtimes.forEach(st => {
      const cName = st.cinema_name;
      if (!cinemaMap[cName]) {
        cinemaMap[cName] = {
          address: st.cinema_address,
          city: st.cinema_city,
          slots: []
        };
      }
      cinemaMap[cName].slots.push(st);
    });

    let html = '';
    for (const [cinemaName, data] of Object.entries(cinemaMap)) {
      html += `
        <div class="cinema-group">
          <div class="cinema-header">
            <div>
              <div class="cinema-title">${cinemaName}</div>
              <div class="cinema-address">${data.address} - ${data.city}</div>
            </div>
          </div>
          <div class="slots-grid">
            ${data.slots.map(slot => `
              <a href="seat-selection.html?showtimeId=${slot.id}" class="slot-btn">
                <span class="slot-time">${formatTimeOnly(slot.start_time)}</span>
                <span class="slot-hall">${slot.hall_name} (${slot.hall_type})</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    showtimesContainer.innerHTML = html;
  } catch (err) {
    detailContainer.innerHTML = `<p class="placeholder-text" style="color:var(--accent-red)">Lỗi tải chi tiết: ${err.message}</p>`;
  }
}
