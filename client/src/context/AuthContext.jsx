import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bjs_token') || '');
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('bjs_token')));

  const rememberSession = (profile, value) => {
    localStorage.setItem('bjs_token', value);
    setUser(profile);
    setToken(value);
    setLoading(false);
  };

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
    localStorage.removeItem('bjs_user');
    const syncSession = event => {
      if (event.key !== 'bjs_token' && event.key !== null) return;
      const next = localStorage.getItem('bjs_token') || '';
      setUser(null);
      setLoading(Boolean(next));
      setToken(next);
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  // Real-Time Account Deletion/Deactivation & Access Sync Monitor (30s interval + visibilitychange)
  useEffect(() => {
    if (!token) return;

    let disposed = false;
    const isCurrentSession = () => !disposed && localStorage.getItem('bjs_token') === token;
    let isChecking = false;
    const checkSessionStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await api.get('/auth/verify-session');
        if (!isCurrentSession()) return;

        const profile = res.data?.user || res.data?.student;
        if (res.data?.ok && profile) {
          setUser(previous => JSON.stringify(previous) === JSON.stringify(profile) ? previous : profile);
        }
      } catch (err) {
        if (isCurrentSession() && err.response?.status === 401) {
          logout();
          window.location.href = '/';
        }
      } finally {
        isChecking = false;
        if (isCurrentSession()) setLoading(false);
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
      disposed = true;
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

        rememberSession(userData, newToken);
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

        rememberSession(mentorData, newToken);
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

  const googleLogin = async (firebaseUser, profile) => {
    try {
      const res = await api.post('/auth/google-login', {
        idToken: await firebaseUser.getIdToken(),
        ...(profile && { university: profile.university, courseId: profile.courseId, phone: profile.phone })
      });

      if (res.data && res.data.ok) {
        if (res.data.isNewUser) {
          return {
            ok: true,
            isNewUser: true,
            googleData: {
              email: res.data.email,
              name: res.data.name,
              photoUrl: res.data.photoUrl
            },
            message: res.data.message
          };
        }

        const newToken = res.data.token;
        const isMentor = res.data.isMentor === true;
        const userData = isMentor ? res.data.mentor : res.data.student;
        if (!newToken || !userData) return { ok: false, message: 'Google লগইন সম্পন্ন করা যায়নি।' };

        rememberSession(userData, newToken);
        return {
          ok: true,
          isNewUser: false,
          user: userData,
          isMentor
        };
      }
      return { ok: false, message: res.data?.message || 'Google লগইন সম্পন্ন করা যায়নি।' };
    } catch (err) {
      const failure = err.response?.data;
      return {
        ok: false,
        message: failure?.message || 'Google লগইন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।',
        linkRequest: failure?.code === 'GOOGLE_LINK_REQUIRED' ? failure.linkRequest : undefined
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setLoading(false);
    localStorage.removeItem('bjs_token');
    localStorage.removeItem('bjs_user');
  };

  const updateUserProfile = (updatedData) => {
    setUser(previous => previous ? { ...previous, ...updatedData } : previous);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, mentorLogin, googleLogin, logout, updateUserProfile, getDeviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
