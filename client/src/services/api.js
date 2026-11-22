import axios from 'axios';

const API_BASE = '/api';
const loginRoutes = new Set(['/auth/login', '/auth/mentor/login', '/auth/google', '/auth/google-login']);
const sessionFailures = new Set(['SESSION_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED']);
const currentAuthorization = () => {
  const token = localStorage.getItem('bjs_token');
  return token ? `Bearer ${token}` : undefined;
};
const sentAuthorization = config => config?.headers?.get?.('Authorization') || config?.headers?.Authorization || undefined;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const authorization = currentAuthorization();
  if (config._retryCount && sentAuthorization(config) !== authorization) throw new axios.CanceledError('Session changed');
  if (authorization) config.headers.Authorization = authorization;
  return config;
});

api.interceptors.response.use(
  response => {
    if (sentAuthorization(response.config) !== currentAuthorization()) throw new axios.CanceledError('Session changed');
    return response;
  },
  async (error) => {
    const config = error.config;
    if (axios.isCancel(error) || loginRoutes.has(config?.url) || sentAuthorization(config) !== currentAuthorization()) {
      return Promise.reject(error);
    }

    // Auto-retry up to 2 times for transient network/serverless cold start delays
    if (config && (!config._retryCount || config._retryCount < 2)) {
      if (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED') {
        config._retryCount = (config._retryCount || 0) + 1;
        await new Promise((r) => setTimeout(r, 700 * config._retryCount));
        return api(config);
      }
    }

    if (sentAuthorization(config) && config?.url !== '/auth/verify-session' &&
        error.response?.status === 401 && sessionFailures.has(error.response.data?.code)) {
      localStorage.removeItem('bjs_token');
      localStorage.removeItem('bjs_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
