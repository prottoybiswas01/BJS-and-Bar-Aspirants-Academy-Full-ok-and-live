import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, Monitor, Chrome, Laptop, ArrowRight } from 'lucide-react';
import Modal from './ui/Modal';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState('android'); // 'android' | 'ios' | 'desktop'
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setInstalled(true);
    }

    // Detect device type to preselect appropriate tab
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    if (isIosDevice) {
      setActiveTab('ios');
    } else if (isMobileDevice) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    // Listen for Chrome/Android/Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed, 10) > 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
    });

    // Global listener so navbar, footer, or buttons can trigger the install flow anytime
    const handleTriggerInstall = () => {
      if (installed || window.matchMedia('(display-mode: standalone)').matches) {
        alert("✅ আপনি ইতোমধ্যে BJS & Bar Academy ওয়েব অ্যাপটি সফলভাবে ইনস্টল করে ব্যবহার করছেন!");
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }) => {
          if (outcome === 'accepted') {
            setInstalled(true);
            setShowBanner(false);
            setShowGuideModal(false);
          }
          setDeferredPrompt(null);
        });
      } else {
        setShowGuideModal(true);
      }
    };

    window.addEventListener('open-pwa-install', handleTriggerInstall);
    window.openPwaInstall = handleTriggerInstall;

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleTriggerInstall);
      delete window.openPwaInstall;
    };
  }, [installed, deferredPrompt]);

  const handleInstallClick = async () => {
    if (installed) {
      alert("✅ আপনি ইতোমধ্যে BJS & Bar Academy অ্যাপটি ইনস্টল করে ব্যবহার করছেন!");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
        setShowGuideModal(false);
      }
      setDeferredPrompt(null);
      return;
    }

    setShowGuideModal(true);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Permanent Side Floating "ওয়েব অ্যাপ" Trigger Badge (Shown on both Desktop & Mobile when not standalone) */}
      {!installed && (
        <aside
          aria-label="ওয়েব অ্যাপ ইনস্টলেশন শর্টকাট"
          className="fixed bottom-20 md:bottom-6 right-3 md:right-5 z-40 group animate-fadeIn"
        >
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-300 border-2 border-amber-500/50 hover:border-amber-400 shadow-xl shadow-amber-500/20 backdrop-blur-md text-xs sm:text-sm font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="BJS & Bar Academy ওয়েব অ্যাপ ইনস্টল করুন"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-base">📲</span>
            <span className="hidden sm:inline">ওয়েব অ্যাপ (Install)</span>
            <span className="sm:hidden">ওয়েব অ্যাপ</span>
          </button>
        </aside>
      )}

      {/* Floating Bottom Prompt Banner (when active) */}
      {showBanner && !installed && (
        <div className="fixed bottom-24 md:bottom-6 left-3 right-3 md:left-auto md:right-6 z-[990] max-w-md animate-fadeIn">
          <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl shadow-amber-500/15 rounded-2xl p-4 text-slate-100">
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
                <span className="text-xl">⚖️</span>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-amber-300 truncate">
                  BJS & Bar Academy অ্যাপ ইনস্টল করুন
                </h4>
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                  প্লে স্টোর ছাড়াই ফোনে ও পিসিতে সরাসরি অ্যাপ হিসেবে চালান!
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ইনস্টল করুন (Install App)</span>
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                পরে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Step-by-Step PWA Install Guide Modal */}
      {showGuideModal && (
        <Modal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
          title="BJS Academy ওয়েব অ্যাপ ইনস্টল নির্দেশিকা"
          subtitle="মোবাইল, ট্যাবলেট ও কম্পিউটারে যেকোনো জায়গা থেকে সরাসরি ব্যবহার করুন"
          icon={<Smartphone className="w-5 h-5 text-amber-400" />}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-200">
            {/* Direct Instant Install Button if browser prompt is ready */}
            {deferredPrompt && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs sm:text-sm">⚡ সরাসরি ১-ক্লিকে ইনস্টল উপলব্ধ:</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>এখনই অ্যাপটি ইনস্টল করুন (Install Now)</span>
                </button>
              </div>
            )}

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'android'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'ios'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'desktop'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC / Laptop</span>
              </button>
            </div>

            {/* TAB: Android Instructions */}
            {activeTab === 'android' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 font-bold font-mono">
                    ১
                  </div>
                  <div>
                    <span className="font-bold text-white block">ব্রাউজার মেনু খুলুন</span>
                    Google Chrome বা ব্রাউজারের উপরে ডানপাশের <span className="text-amber-400 font-bold">৩-ডট (⋮) মেনুতে</span> ট্যাপ করুন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 font-bold font-mono">
                    ২
                  </div>
                  <div>
                    <span className="font-bold text-white block">'Install app' বা 'Add to Home screen' নির্বাচন করুন</span>
                    মেনু তালিকা থেকে <span className="text-amber-400 font-bold">"Install app"</span> অথবা <span className="text-amber-400 font-bold">"Add to Home screen"</span> অপশনটি বেছে নিন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">ইনস্টলেশন সম্পন্ন</span>
                    কনফার্মেশন ডায়ালগে <span className="text-emerald-400 font-bold">"Install"</span> চাপলেই আপনার ফোনের হোম স্ক্রিনে অ্যাপ যুক্ত হয়ে যাবে।
                  </div>
                </div>
              </div>
            )}

            {/* TAB: iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">১. Safari এর শেয়ার বাটনে চাপ দিন</span>
                    আইফোনে Safari ব্রাউজারের নিচে থাকা <span className="text-amber-400 font-bold">Share (শেয়ার)</span> আইকনে চাপ দিন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">২. 'Add to Home Screen' বেছে নিন</span>
                    মেনুটি একটু নিচে স্ক্রোল করে <span className="text-amber-400 font-bold">"Add to Home Screen"</span> অপশনটি স্পর্শ করুন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">৩. 'Add' চাপুন</span>
                    উপরে ডানপাশের <span className="text-emerald-400 font-bold">"Add"</span> বাটনে চাপ দিলেই আপনার আইফোনের হোম পেজে অ্যাপ ইনস্টল হয়ে যাবে।
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Desktop PC/Laptop Instructions */}
            {activeTab === 'desktop' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">১. ক্রোম / এজ ব্রাউজারের অ্যাড্রেস বার দেখুন</span>
                    URL বার-এর ডানপাশে একটি ছোট <span className="text-amber-400 font-bold">💻 বা ⊕ (Install)</span> আইকন দেখতে পাবেন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 font-bold font-mono">
                    ২
                  </div>
                  <div>
                    <span className="font-bold text-white block">অথবা ব্রাউজার মেনু থেকে ইনস্টল করুন</span>
                    ক্রোমের ৩-ডট মেনু থেকে <span className="text-amber-400 font-bold">"Save and share" → "Install BJS Academy"</span> ক্লিক করুন।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">ডেস্কটপ উইন্ডো হিসেবে চলবে</span>
                    কোনো অতিরিক্ত সফটওয়্যার বা এমুলেটর ছাড়াই এটি আপনার কম্পিউটারে পূর্ণাঙ্গ ডেস্কটপ অ্যাপের মতো ওপেন হবে।
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs sm:text-sm rounded-xl text-slate-200 transition-colors cursor-pointer"
            >
              বুঝেছি (Got It)
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
