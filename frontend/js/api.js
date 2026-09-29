/**
 * CineWave API Client
 * Wraps Fetch API with relative path /api and Bearer authorization
 */

const API_BASE_URL = '/api';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('cinewave_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const error = new Error((data && data.error) || `Lỗi HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        err.message = 'Không thể kết nối đến máy chủ API. Vui lòng thử lại sau.';
      }
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
