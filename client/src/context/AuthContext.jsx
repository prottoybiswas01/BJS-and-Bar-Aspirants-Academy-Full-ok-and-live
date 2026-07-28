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

  // Real-Time Account Deletion/Deactivation & Access Sync Monitor (Auto Logouts deleted accounts, syncs granted courses in < 4s)
  useEffect(() => {
    if (!user || user.isAdmin || (!user.id && !user.regId)) return;

    const checkSessionStatus = async () => {
      try {
        const res = await api.get('/auth/verify-session', {
          params: {
            id: user.id || user.regId,
            isMentor: !!user.isMentor,
            isAdmin: !!user.isAdmin
          }
        });
        if (res.data && res.data.deleted) {
          logout();
          window.location.href = '/';
          return;
        }

        if (res.data && res.data.ok && res.data.student && !user.isMentor && !user.isAdmin) {
          const freshStudent = res.data.student;
          setUser((prev) => {
            if (!prev) return freshStudent;
            const updated = { ...prev, ...freshStudent };
            localStorage.setItem('bjs_user', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.data?.deleted)) {
          logout();
          window.location.href = '/';
        }
      }
    };

    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (identifier, password, isAdminPortal = false) => {
    const deviceId = getDeviceId();
    const platform = navigator.platform || 'Web Browser';
    const browser = navigator.userAgent || 'Standard Browser';

    try {
      const res = await api.post('/auth/login', {
        identifier,
        password,
        deviceId,
        platform,
        browser,
        isAdminPortal
      });

      if (res.data && res.data.ok) {
        const newToken = res.data.token;
        const userData = res.data.isAdmin
          ? res.data.user
          : res.data.isMentor
          ? (res.data.mentor || res.data.user || res.data.student)
          : res.data.student;

        if (res.data.isAdmin) userData.isAdmin = true;
        if (res.data.isMentor) userData.isMentor = true;

        setToken(newToken);
        setUser(userData);

        localStorage.setItem('bjs_token', newToken);
        localStorage.setItem('bjs_user', JSON.stringify(userData));
        return {
          ok: true,
          user: userData,
          isAdmin: !!res.data.isAdmin,
          isMentor: !!res.data.isMentor
        };
      }
      return { ok: false, message: res.data?.message || 'লগইন তথ্য সঠিক নয়।' };
    } catch (err) {
      console.error('Login Error:', err);
      return {
        ok: false,
        message: err.response?.data?.message || 'লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে আপনার তথ্য যাঁচাই করুন।'
      };
    }
  };

  const mentorLogin = async (email, password) => {
    try {
      const res = await api.post('/auth/mentor/login', { email, password });
      if (res.data && res.data.ok) {
        const newToken = res.data.token;
        const mentorData = { ...res.data.mentor, role: 'mentor', isMentor: true };

        setToken(newToken);
        setUser(mentorData);

        localStorage.setItem('bjs_token', newToken);
        localStorage.setItem('bjs_user', JSON.stringify(mentorData));
        return { ok: true, mentor: mentorData };
      }
      return { ok: false, message: res.data?.message || 'মেন্টর লগইন ব্যর্থ হয়েছে।' };
    } catch (err) {
      return {
        ok: false,
        message: err.response?.data?.message || 'সার্ভার সংযোগ সমস্যা। তথ্য পুনরায় যাচাই করুন।'
      };
    }
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
    <AuthContext.Provider value={{ user, token, loading, login, mentorLogin, logout, updateUserProfile, getDeviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
