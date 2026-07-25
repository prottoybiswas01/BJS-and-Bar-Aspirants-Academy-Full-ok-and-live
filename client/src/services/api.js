import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bjs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // Auto-retry up to 2 times for transient network/serverless cold start delays
    if (config && (!config._retryCount || config._retryCount < 2)) {
      if (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED') {
        config._retryCount = (config._retryCount || 0) + 1;
        await new Promise((r) => setTimeout(r, 700 * config._retryCount));
        return api(config);
      }
    }

    if (error.response && (error.response.status === 401 || error.response.data?.deleted)) {
      const storedUser = localStorage.getItem('bjs_user');
      if (storedUser) {
        localStorage.removeItem('bjs_token');
        localStorage.removeItem('bjs_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
