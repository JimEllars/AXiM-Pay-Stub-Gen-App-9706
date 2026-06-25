import React from 'react';
import { trackEvent } from '../utils/telemetry';
import { FiAlertCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

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
    trackEvent('application_crash', { error_message: error.toString() });
    trackEvent('frontend_crash', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-void flex items-center justify-center p-6 text-white text-center">
          <div className="bg-[#0a0a0a] border border-white/10 p-12 rounded-3xl max-w-lg w-full">
            <div className="text-axim-teal mb-6 flex justify-center"><SafeIcon icon={FiAlertCircle} size={64} /></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Session Disrupted</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              A rendering anomaly interrupted your session. Our support systems have been automatically notified.
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('axim_paystub_draft_continuous');
                sessionStorage.removeItem('axim_paystub_draft_queue');
                window.location.href = '/';
              }}
              className="w-full bg-white text-black font-bold px-8 py-4 rounded-xl hover:bg-axim-teal transition-all"
            >
              Securely Reset & Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
