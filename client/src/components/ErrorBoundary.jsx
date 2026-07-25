import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("⚠️ React Component Exception Guarded:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-3xl">
            ⚖️
          </div>
          <h2 className="text-xl font-bold text-white">অ্যাডমিন প্যানেল লোড হতে সাময়িক সময় লাগছে</h2>
          <p className="text-xs text-slate-400 max-w-md">
            সিস্টেমের নতুন আপডেট বা নেটওয়ার্ক ধীরগতির কারণে রেন্ডার হতে বিলম্ব হয়েছিল। নিচে রিফ্রেশ বাটনে ক্লিক করুন।
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            🔄 অ্যাডমিন প্যানেল রিফ্রেশ করুন (Reload)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
