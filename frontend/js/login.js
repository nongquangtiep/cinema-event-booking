/**
 * CineWave Login & Register Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login-submit');
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';

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
      }, 800);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Đăng Nhập';
      showToast(err.message || 'Đăng nhập thất bại.', 'error');
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-reg-submit');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý đăng ký...';

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

      showToast('Đăng ký tài khoản thành công! Đang vào hệ thống...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Tạo Tài Khoản Mới';
      showToast(err.message || 'Đăng ký không thành công.', 'error');
    }
  });
});
