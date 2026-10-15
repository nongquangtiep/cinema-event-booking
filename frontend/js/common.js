/**
 * CineWave Common Utilities & UI Helpers
 */

/**
 * Format number to Vietnamese Currency (VND)
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format ISO datetime string to localized format
 */
function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get or create unique session ID in sessionStorage for seat locking
 */
function getSessionId() {
  let sessId = sessionStorage.getItem('cinewave_session_id');
  if (!sessId) {
    sessId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    sessionStorage.setItem('cinewave_session_id', sessId);
  }
  return sessId;
}

/**
 * Display toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.1rem;margin-left:10px;">&times;</button>
  `;

  toast.querySelector('button').onclick = () => toast.remove();

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4500);
}

/**
 * Theme Manager: Dark / Light Mode
 */
function getSavedTheme() {
  return localStorage.getItem('cinewave_theme') || 'dark';
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  if (isLight) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Update all theme toggle buttons on the page
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    btn.title = isLight ? 'Chuyển sang Giao diện Tối (Dark Mode)' : 'Chuyển sang Giao diện Sáng (Light Mode)';
    btn.setAttribute('aria-label', btn.title);
  });
}

function toggleTheme() {
  const current = getSavedTheme();
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cinewave_theme', nextTheme);
  applyTheme(nextTheme);
  showToast(nextTheme === 'light' ? 'Đã chuyển sang Giao diện Sáng' : 'Đã chuyển sang Giao diện Tối', 'info');
}

function initTheme() {
  applyTheme(getSavedTheme());

  // Attach click listener to existing or newly created theme toggle buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle-btn');
    if (btn) {
      toggleTheme();
    }
  });

  // If in admin page and no theme toggle exists in header, add one next to profile
  const adminProfile = document.getElementById('admin-profile');
  if (adminProfile && !document.getElementById('admin-theme-btn')) {
    const adminBtn = document.createElement('button');
    adminBtn.id = 'admin-theme-btn';
    adminBtn.className = 'theme-toggle-btn';
    adminBtn.style.marginLeft = '12px';
    adminProfile.appendChild(adminBtn);
    applyTheme(getSavedTheme());
  }
}

/**
 * Sync & Update Navbar user session display
 */
function updateNavAuth() {
  const authContainer = document.querySelector('.nav-auth');
  if (!authContainer) return;

  const userStr = localStorage.getItem('cinewave_user');
  const token = localStorage.getItem('cinewave_token');
  const currentTheme = getSavedTheme();
  const themeIcon = currentTheme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  const themeTitle = currentTheme === 'light' ? 'Chuyển sang Giao diện Tối' : 'Chuyển sang Giao diện Sáng';

  const themeBtnHtml = `
    <button class="theme-toggle-btn" id="nav-theme-btn" title="${themeTitle}" aria-label="${themeTitle}">
      ${themeIcon}
    </button>
  `;

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      let displayName = user.full_name || user.username || 'Người dùng';
      if (displayName && (displayName.includes('Quá') || displayName.includes('Ã'))) {
        displayName = 'Quản Trị Viên';
      }
      const isAdmin = user.role === 'admin';
      const shortName = displayName.length > 16 ? displayName.substring(0, 14) + '...' : displayName;

      authContainer.innerHTML = `
        <div class="user-profile-nav">
          <div class="user-capsule" title="${displayName} (${isAdmin ? 'Quản Trị Viên' : 'Thành Viên'})">
            <span class="user-avatar-icon"><i class="fa-solid ${isAdmin ? 'fa-user-shield' : 'fa-circle-user'}"></i></span>
            <span class="user-name">${shortName}</span>
            ${isAdmin ? '<span class="role-pill">ADMIN</span>' : ''}
          </div>
          ${isAdmin ? `
            <a href="admin/index.html" class="nav-admin-btn" title="Truy cập Bảng Quản Trị Hệ Thống">
              <i class="fa-solid fa-gauge-high"></i>
              <span>Quản Trị</span>
            </a>
          ` : ''}
          <button id="btn-logout" class="nav-icon-btn nav-logout-btn" title="Đăng Xuất Khỏi Hệ Thống">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
          ${themeBtnHtml}
        </div>
      `;

      document.getElementById('btn-logout').onclick = () => {
        localStorage.removeItem('cinewave_token');
        localStorage.removeItem('cinewave_user');
        showToast('Đã đăng xuất tài khoản.', 'info');
        setTimeout(() => window.location.reload(), 500);
      };
    } catch (e) {
      localStorage.removeItem('cinewave_user');
      authContainer.innerHTML = `
        <div class="guest-nav-group">
          ${themeBtnHtml}
          <a href="login.html" class="btn btn-primary btn-sm" id="auth-btn"><i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập</a>
        </div>
      `;
    }
  } else {
    authContainer.innerHTML = `
      <div class="guest-nav-group">
        ${themeBtnHtml}
        <a href="login.html" class="btn btn-primary btn-sm" id="auth-btn"><i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập</a>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNavAuth();
});
