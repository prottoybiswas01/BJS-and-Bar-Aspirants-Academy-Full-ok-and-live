import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bjs_token') || '');
  const [loading, setLoading] = useState(true);

  // Generate or retrieve persistent browser deviceId
  const getDeviceId = () => {
    let devId = localStorage.getItem('bjs_device_id');
    if (!devId) {
      devId = 'DEV-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
      localStorage.setItem('bjs_device_id', devId);
    }
    return devId;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('bjs_user');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('bjs_user');
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (identifier, password) => {
    const deviceId = getDeviceId();
    const platform = navigator.platform || 'Web Browser';
    const browser = navigator.userAgent || 'Standard Browser';

    const res = await api.post('/auth/login', {
      identifier,
      password,
      deviceId,
      platform,
      browser,
    });

    if (res.data.ok) {
      const newToken = res.data.token;
      const userData = res.data.isAdmin ? res.data.user : res.data.student;
      if (res.data.isAdmin) userData.isAdmin = true;

      setToken(newToken);
      setUser(userData);

      localStorage.setItem('bjs_token', newToken);
      localStorage.setItem('bjs_user', JSON.stringify(userData));
      return { ok: true, user: userData };
    }
    return { ok: false, message: res.data.message };
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('bjs_token');
    localStorage.removeItem('bjs_user');
  };

  const updateUserProfile = (updatedData) => {
    const newObj = { ...user, ...updatedData };
    setUser(newObj);
    localStorage.setItem('bjs_user', JSON.stringify(newObj));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserProfile, getDeviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
