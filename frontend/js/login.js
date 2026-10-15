/**
 * CineWave Login & Register Script (Enterprise Features)
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authHeading = document.getElementById('auth-heading');
  const authSubheading = document.getElementById('auth-subheading');
  const quickCredsContainer = document.getElementById('quick-creds-container');

  // Tab Switching
  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister?.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
    if (authHeading) authHeading.textContent = 'Chào Mừng Trở Lại';
    if (authSubheading) authSubheading.textContent = 'Đăng nhập tài khoản để đặt vé và quản lý lịch chiếu';
    if (quickCredsContainer) quickCredsContainer.style.display = 'block';
  });

  tabRegister?.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin?.classList.remove('active');
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
    if (authHeading) authHeading.textContent = 'Tạo Tài Khoản Mới';
    if (authSubheading) authSubheading.textContent = 'Đăng ký thành viên CineWave để nhận ưu đãi xem phim';
    if (quickCredsContainer) quickCredsContainer.style.display = 'none';
  });

  // Quick Demo Credentials Buttons
  document.querySelectorAll('.btn-quick-fill').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-user');
      const p = btn.getAttribute('data-pass');
      const userInput = document.getElementById('login-username');
      const passInput = document.getElementById('login-password');

      if (userInput && passInput) {
        userInput.value = u;
        passInput.value = p;
        showToast(`Đã tự động điền tài khoản: ${u}`, 'info');

        // Focus and subtle highlight
        userInput.classList.add('input-highlight');
        passInput.classList.add('input-highlight');
        setTimeout(() => {
          userInput.classList.remove('input-highlight');
          passInput.classList.remove('input-highlight');
        }, 1000);
      }
    });
  });

  // Password Visibility Toggle
  setupPasswordToggle('toggle-login-pwd', 'login-password');
  setupPasswordToggle('toggle-reg-pwd', 'reg-password');

  // Login Form Submit
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login-submit');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xác thực...';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await auth.login(username, password);
      showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');

      setTimeout(() => {
        if (res.user && res.user.role === 'admin') {
          window.location.href = 'admin/index.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 700);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      showToast(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!', 'error');
    }
  });

  // Register Form Submit
  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-reg-submit');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tạo tài khoản...';

    const fullName = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      await auth.register({
        full_name: fullName,
        username,
        email,
        phone,
        password
      });

      showToast('Đăng ký thành công! Đang chuyển hướng...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 900);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      showToast(err.message || 'Đăng ký không thành công.', 'error');
    }
  });
});

function setupPasswordToggle(toggleBtnId, inputId) {
  const btn = document.getElementById(toggleBtnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword 
      ? '<i class="fa-regular fa-eye-slash" style="color:var(--accent-red);"></i>' 
      : '<i class="fa-regular fa-eye"></i>';
  });
}
