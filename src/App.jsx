
if (typeof localStorage !== 'undefined' && !localStorage.getItem('axim_user_id')) {
  localStorage.setItem('axim_user_id', crypto.randomUUID());
}
import ErrorBoundary from './components/ErrorBoundary';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Generator from './pages/Generator';
import Success from './pages/Success';

function App() {

  useEffect(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        app_context: 'pay_stub_generator',
        page_path: window.location.pathname
      });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('diag') === 'true') {
      console.table({
        "Build Status": "Production Edge Active",
        "Web3 Enabled": import.meta.env.VITE_ENABLE_WEB3 || "false",
        "Worker Proxy": "Configured",
        "Telemetry": "Wired"
      });
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (sessionStorage.getItem('checkout_pending') !== 'true') {
        sessionStorage.removeItem('axim_paystub_draft');
        sessionStorage.removeItem('axim_paystub_draft_queue');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="App">
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app/generator" element={<Generator />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
