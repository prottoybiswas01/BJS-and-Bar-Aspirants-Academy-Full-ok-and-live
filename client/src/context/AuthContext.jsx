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
        const restoredUser = JSON.parse(storedUser);
        if (restoredUser && Object.hasOwn(restoredUser, 'password')) {
          delete restoredUser.password;
          localStorage.setItem('bjs_user', JSON.stringify(restoredUser));
        }
        setUser(restoredUser);
      } catch (e) {
        localStorage.removeItem('bjs_user');
      }
    }
    setLoading(false);
  }, [token]);

  // Real-Time Account Deletion/Deactivation & Access Sync Monitor (30s interval + visibilitychange)
  useEffect(() => {
    if (!token) return;

    const isCurrentSession = () => localStorage.getItem('bjs_token') === token;
    let isChecking = false;
    const checkSessionStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await api.get('/auth/verify-session');
        if (!isCurrentSession()) return;

        if (res.data?.ok && res.data.student) {
          const freshStudent = res.data.student;
          setUser((prev) => {
            if (!prev) return freshStudent;
            if (
              JSON.stringify(prev.allowedCourseIds) === JSON.stringify(freshStudent.allowedCourseIds) &&
              prev.status === freshStudent.status &&
              prev.loginApproval === freshStudent.loginApproval
            ) {
              return prev;
            }
            const updated = { ...prev, ...freshStudent };
            localStorage.setItem('bjs_user', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        if (isCurrentSession() && err.response?.status === 401) {
          logout();
          window.location.href = '/';
        }
      } finally {
        isChecking = false;
      }
    };

    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [token]);

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

  const googleLogin = async (firebaseUser, extraPayload = {}) => {
    const deviceId = getDeviceId();
    const platform = navigator.platform || 'Web Browser';
    const browser = navigator.userAgent || 'Standard Browser';

    try {
      const res = await api.post('/auth/google-login', {
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'Google Student',
        photoUrl: firebaseUser.photoURL || '',
        firebaseUid: firebaseUser.uid,
        deviceId,
        platform,
        browser,
        ...extraPayload
      });

      if (res.data && res.data.ok) {
        if (res.data.isNewUser) {
          return {
            ok: true,
            isNewUser: true,
            googleData: {
              email: res.data.email || firebaseUser.email,
              name: res.data.name || firebaseUser.displayName || 'Google Student',
              photoUrl: res.data.photoUrl || firebaseUser.photoURL || '',
              firebaseUid: res.data.firebaseUid || firebaseUser.uid || ''
            },
            message: res.data.message
          };
        }

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
          isNewUser: false,
          user: userData,
          isAdmin: !!res.data.isAdmin,
          isMentor: !!res.data.isMentor
        };
      }
      return { ok: false, message: res.data?.message || 'Google লগইন সম্পন্ন করা যায়নি।' };
    } catch (err) {
      return {
        ok: false,
        message: err.response?.data?.message || 'সার্ভার সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
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
    delete newObj.password;
    setUser(newObj);
    localStorage.setItem('bjs_user', JSON.stringify(newObj));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, mentorLogin, googleLogin, logout, updateUserProfile, getDeviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
