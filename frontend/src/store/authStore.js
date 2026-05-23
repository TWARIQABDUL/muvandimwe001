import { create } from 'zustand';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3000/api'
});

// Interceptor to attach token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 Unauthorized responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname + window.location.search;
      
      // Prevent infinite redirect loops if already on login
      if (!currentPath.startsWith('/login')) {
        useAuthStore.getState().logout();
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Load user from localStorage on init
  init: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      set({
        token,
        user: JSON.parse(user),
        isAuthenticated: true
      });
    }
  },

  // Login
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        loading: false
      });

      return user;
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed';
      set({ error, loading: false });
      throw new Error(error);
    }
  },

  // Logout
  logout: async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      const response = await API.patch('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      // Update first_login flag in user
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.first_login = 0;
      localStorage.setItem('user', JSON.stringify(user));

      set({
        loading: false,
        user: { ...useAuthStore.getState().user, first_login: 0 }
      });

      return response.data;
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to change password';
      set({ error, loading: false });
      throw new Error(error);
    }
  }
}));

export const api = API;
