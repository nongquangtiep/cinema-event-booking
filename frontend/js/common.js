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
 * Sync & Update Navbar user session display
 */
function updateNavAuth() {
  const authContainer = document.querySelector('.nav-auth');
  if (!authContainer) return;

  const userStr = localStorage.getItem('cinewave_user');
  const token = localStorage.getItem('cinewave_token');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      authContainer.innerHTML = `
        <span class="nav-user-greeting">Xin chào, <strong>${user.full_name || user.username}</strong></span>
        ${user.role === 'admin' ? '<a href="admin/index.html" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.85rem;">Quản Trị</a>' : ''}
        <button id="btn-logout" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.85rem;">Đăng Xuất</button>
      `;

      document.getElementById('btn-logout').onclick = () => {
        localStorage.removeItem('cinewave_token');
        localStorage.removeItem('cinewave_user');
        showToast('Đã đăng xuất tài khoản.', 'info');
        setTimeout(() => window.location.reload(), 600);
      };
    } catch (e) {
      localStorage.removeItem('cinewave_user');
    }
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline" id="auth-btn">Đăng Nhập</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
});
