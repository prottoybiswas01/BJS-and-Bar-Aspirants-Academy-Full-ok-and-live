import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
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
  (error) => {
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
