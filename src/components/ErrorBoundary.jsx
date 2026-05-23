import React from 'react';
import { trackEvent } from '../utils/telemetry';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    trackEvent('frontend_crash', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="bg-red-500/10 p-6 rounded-full text-red-500 mb-8">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="64" width="64" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-4xl font-black tracking-tighter mb-4">APPLICATION ERROR</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
            Something went wrong. Our team has been notified.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-white text-black font-bold px-10 py-5 rounded-2xl hover:bg-axim-teal transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
