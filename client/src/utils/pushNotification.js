import api from '../services/api';

export async function isPushNotificationSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestAndSubscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, message: 'আপনার ব্রাউজারে পুশ নোটিফিকেশন সমর্থিত নয়।' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, message: 'পুশ নোটিফিকেশনের অনুমতি প্রদান করা হয়নি।' };
    }

    const registration = await navigator.serviceWorker.ready;
    const manager = registration.pushManager;
    const subscribe = () => manager.subscribe({ userVisibleOnly: true, applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' });
    const save = subscription => api.post("/push/subscribe", {
      endpoint: subscription.endpoint, keys: subscription.toJSON().keys
    });
    const existing = await manager.getSubscription();
    const subscription = existing || await subscribe();
    try {
      await save(subscription);
    } catch (error) {
      if (error.response?.data?.code !== "PUSH_SUBSCRIPTION_CONFLICT" || !existing) throw error;
      await existing.unsubscribe();
      await save(await subscribe());
    }
    return { ok: true, message: "✓ ব্রাউজার পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে!" };
  } catch (err) {
    return { ok: false, message: err.response?.data?.message || "পুশ নোটিফিকেশন চালু করা যায়নি।" };
  }
}
