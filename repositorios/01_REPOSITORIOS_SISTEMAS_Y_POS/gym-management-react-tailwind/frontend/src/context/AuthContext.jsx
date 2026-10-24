import { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ibbc_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = (token, u) => {
    localStorage.setItem('ibbc_token', token);
    localStorage.setItem('ibbc_user', JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authService.login(payload);
      persist(res.data.token, res.data.user);
      return res.data.user;
    } finally { setLoading(false); }
  }, []);

  const adminLogin = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authService.adminLogin(payload);
      persist(res.data.token, res.data.user);
      return res.data.user;
    } finally { setLoading(false); }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authService.register(payload);
      persist(res.data.token, res.data.user);
      return res.data.user;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ibbc_token');
    localStorage.removeItem('ibbc_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
