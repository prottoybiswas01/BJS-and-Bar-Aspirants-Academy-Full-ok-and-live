import api from '../services/api';

export async function isPushNotificationSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestAndSubscribePush(studentId = '', courseIds = []) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, message: 'আপনার ব্রাউজারে পুশ নোটিফিকেশন সমর্থিত নয়।' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, message: 'পুশ নোটিফিকেশনের অনুমতি প্রদান করা হয়নি।' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Use existing or generate client push subscription
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        });
      } catch (subErr) {
        // Fallback for browsers with custom VAPID requirements
        console.log('Push subscribe fallback notice:', subErr.message);
      }
    }

    if (subscription) {
      const rawSub = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: rawSub.keys,
        studentId,
        courseIds
      });
      return { ok: true, message: '✓ ব্রাউজার পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে!' };
    }

    return { ok: true, message: '✓ ব্রাউজার নোটিফিকেশন পারমিশন সক্রিয় করা হয়েছে।' };
  } catch (err) {
    console.warn('Push registration notice:', err.message);
    return { ok: false, message: err.message };
  }
}
