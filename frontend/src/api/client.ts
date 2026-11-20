import axios from 'axios';
import { clearAuth } from '../stores/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('aethelgard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error?.config?.url || '');
    if (error?.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearAuth();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
