import React from 'react';

/**
 * Enterprise Fault-Isolation Error Boundary
 * Prevents single-component runtime exceptions from crashing the entire SPA.
 * Allows other pages/sections to remain 100% operational.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("⚠️ [Component Fault Isolated]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, retry: this.handleRetry })
          : this.props.fallback;
      }

      const sectionTitle = this.props.sectionName || 'এই সেকশনে';

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 my-8">
          <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl backdrop-blur-md space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-2xl shadow-inner">
              ⚠️
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {sectionTitle} সাময়িক রেন্ডারিং সমস্যা হয়েছে
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                ওয়েবসাইটের এই নির্দিষ্ট অংশটিতে একটি টেকনিক্যাল জটিলতা দেখা দিয়েছে, তবে ওয়েবসাইটের অন্যান্য সকল সেবা ও পেজ স্বাভাবিকভাবে চালু রয়েছে।
              </p>
            </div>

            {/* Error Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                🔄 আবার চেষ্টা করুন (Retry)
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                🏠 মূল পাতায় ফিরে যান
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                 পেজ রিলোড করুন
              </button>
            </div>

            {/* Technical Detail (Collapsible) */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="text-left pt-2 border-t border-slate-800/80">
                <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400 font-mono">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-rose-300 text-[10px] font-mono overflow-auto max-h-32 text-left">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
