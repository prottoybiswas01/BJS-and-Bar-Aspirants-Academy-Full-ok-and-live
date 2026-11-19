import React from 'react';

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[PageErrorBoundary:${this.props.pageName || 'page'}]`, error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.pageName !== this.props.pageName && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mb-4 text-amber-400">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            এই পেজটি লোড হতে সমস্যা হয়েছে
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            একটি সাময়িক ত্রুটির কারণে কনটেন্ট প্রদর্শনে সমস্যা হচ্ছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              🔄 পুনরায় চেষ্টা করুন
            </button>
            <button
              onClick={() => {
                if (this.props.onNavigateHome) {
                  this.props.onNavigateHome();
                } else {
                  window.location.href = '/';
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-colors"
            >
              হোম পেজে যান
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
