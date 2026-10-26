import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('library_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/auth/me');
        if (res.success) {
          setUser(res.user);
        } else {
          localStorage.removeItem('library_token');
        }
      } catch (err) {
        localStorage.removeItem('library_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (res.success && res.token) {
      localStorage.setItem('library_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: userData
    });
    if (res.success && res.token) {
      localStorage.setItem('library_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('library_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
