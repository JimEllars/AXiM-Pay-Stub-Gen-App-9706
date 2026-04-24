import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    fetch('/api/v1/telemetry/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: "frontend_crash",
        app_type: "pay_stub",
        severity: "CRITICAL",
        error_message: error.message
      })
    }).catch(e => console.error("Telemetry failed:", e));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-void flex items-center justify-center p-4">
          <div className="bg-glass border border-red-500/30 p-8 rounded-xl max-w-lg text-center backdrop-blur-md">
            <h1 className="text-2xl font-black text-red-500 mb-4 uppercase tracking-wider">Critical System Failure</h1>
            <p className="text-gray-400 font-mono text-sm mb-6">
              A frontend exception has occurred. Our telemetry systems have been notified. Please refresh the application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white font-bold px-6 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
