/**
 * CineWave Authentication Helper
 */

const auth = {
  getToken() {
    return localStorage.getItem('cinewave_token');
  },

  getUser() {
    const userStr = localStorage.getItem('cinewave_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('cinewave_token', token);
    localStorage.setItem('cinewave_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('cinewave_token');
    localStorage.removeItem('cinewave_user');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    if (res.token && res.user) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async register(data) {
    const res = await api.post('/auth/register', data);
    if (res.token && res.user) {
      this.setSession(res.token, res.user);
    }
    return res;
  }
};
