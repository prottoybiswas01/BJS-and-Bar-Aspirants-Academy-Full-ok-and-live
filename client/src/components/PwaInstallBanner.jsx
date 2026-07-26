import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check if user dismissed banner recently
    const dismissedTime = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 3 * 24 * 60 * 60 * 1000) {
      // Dismissed less than 3 days ago
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show for iOS after 3 seconds delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if prompt isn't ready
      alert("অ্যাপ ইনস্টল করতে আপনার ব্রাউজার মেনু (3-dots) থেকে 'Add to Home screen' বেছে নিন।");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (!showBanner || installed) return null;

  return (
    <>
      {/* Top Floating PWA Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[999] max-w-md animate-fade-in-up">
        <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 rounded-2xl p-4 text-slate-100">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0 overflow-hidden">
              <img 
                src="/pwa-192x192.png" 
                alt="App Icon" 
                className="w-full h-full object-cover" 
                onError={(e) => { e.target.style.display = 'none'; }} 
              />
              <Smartphone className="w-6 h-6 text-slate-950 absolute" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base text-amber-400 truncate">
                BJS & Bar App ইনস্টল করুন
              </h4>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                ফোনে সেভ করুন এবং প্লে স্টোর ছাড়াই অ্যাপ হিসেবে ব্যবহার করুন!
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>ইনস্টল করুন (Install App)</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              পরে করব
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 relative shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-400">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">iPhone/iPad এ ইনস্টল করার উপায়</h3>
              <p className="text-xs text-slate-400 mt-1">Safari ব্রাউজার দিয়ে খুব সহজেই আপনার ফোনে সেভ করুন</p>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-white block">১. শেয়ার বাটনে চাপ দিন</span>
                  Safari ব্রাউজারের নিচে থাকা <span className="text-amber-400 font-medium">Share</span> আইকনে চাপ দিন।
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-white block">২. 'Add to Home Screen' বেছে নিন</span>
                  স্ক্রোল করে নিচে নামুন এবং <span className="text-amber-400 font-medium">Add to Home Screen</span> অপশনটি বেছে নিন।
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-white block">৩. 'Add' অপশনে চাপ দিন</span>
                  উপরে ডানপাশে <span className="text-emerald-400 font-medium">Add</span> এ চাপ দিলেই ফোনের হোম স্ক্রিনে অ্যাপ চলে আসবে!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 font-semibold text-sm rounded-xl text-slate-200 transition-colors"
            >
              বুঝেছি (Got It)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
