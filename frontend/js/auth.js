/**
 * CineWave Authentication Client
 * Handles token storage, user session and login/logout state
 */

const auth = {
  getToken() {
    return localStorage.getItem('cinewave_token');
  },
  getUser() {
    const userStr = localStorage.getItem('cinewave_user');
    return userStr ? JSON.parse(userStr) : null;
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
  }
};
