/**
 * CineWave API Client
 * Wraps Fetch API for backend communication via Nginx reverse proxy
 */

const API_BASE_URL = '/api';

const api = {
  async get(endpoint) {
    const token = localStorage.getItem('cinewave_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Lỗi mạng hoặc server' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post(endpoint, data) {
    const token = localStorage.getItem('cinewave_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Lỗi mạng hoặc server' }));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }
};
