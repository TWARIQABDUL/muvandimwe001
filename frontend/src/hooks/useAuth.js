import { useAuthStore } from '../store/authStore.js';

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    changePassword,
    init
  } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    changePassword,
    init
  };
}
