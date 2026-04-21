import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiDownload, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';

const Success = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hydrateStore = usePayStubStore(state => state.hydrateStore);
  const storeState = usePayStubStore();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setErrorMessage('No session ID found in the URL.');
        setStatus('failed');
        return;
      }

      try {
        // PHASE 2: Secure Verification Proxy
        const response = await fetch('/api/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
           throw new Error(`Verification API returned status ${response.status}`);
        }

        const data = await response.json();

        if (data.isPaid) {
          // PHASE 3: Re-hydrate State
          const rawDraft = sessionStorage.getItem('paystub_draft_data');
          if (rawDraft) {
            hydrateStore(JSON.parse(rawDraft));
          }
          setStatus('success');
        } else {
          setErrorMessage(data.error || 'Payment was not marked as paid.');
          setStatus('failed');
        }
      } catch (e) {
        console.error("Verification Error:", e);
        setErrorMessage(e.message || 'An error occurred during verification.');
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [searchParams, hydrateStore]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // PHASE 4: Request Secure Edge PDF Generation
      const response = await fetch('/api/generate-paystub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: searchParams.get('session_id'),
          formData: storeState
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF Generation API failed');
      }

      const data = await response.json();
      if (data.success) {
        // In a real app, this would be a Blob download
        alert("PDF Generation Initiated. In a production environment, your download would start now.");
      } else {
        throw new Error(data.error || 'Unknown error occurred during PDF generation');
      }
    } catch (e) {
      console.error("Download Error:", e);
      alert(`Download failed: ${e.message}. Please check your email for the backup copy.`);
    } finally {
      setDownloading(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-6 text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-axim-teal mb-6"
        >
          <SafeIcon icon={FiLoader} size={48} />
        </motion.div>
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Verifying Payment</h2>
        <p className="text-gray-500 font-mono text-xs">Authenticating Stripe Session ID...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-red-500/10 p-6 rounded-full text-red-500 mb-8">
          <SafeIcon icon={FiAlertCircle} size={64} />
        </div>
        <h2 className="text-4xl font-black tracking-tighter mb-4">VERIFICATION FAILED</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
          We could not verify your payment session. {errorMessage && <span className="block mt-2 text-red-400">{errorMessage}</span>} If you believe this is an error, please contact our enterprise support team.
        </p>
        <Link to="/app/generator" className="bg-white text-black font-bold px-10 py-5 rounded-2xl hover:bg-axim-teal transition-all">
          Return to Generator
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-void flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0a0a0a] border border-white/10 p-12 rounded-3xl max-w-xl w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-axim-teal to-axim-gold" />
        
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-axim-teal/10 rounded-3xl flex items-center justify-center text-axim-teal shadow-[0_0_40px_rgba(0,229,255,0.15)]">
            <SafeIcon icon={FiCheckCircle} size={48} />
          </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">ORDER COMPLETE</h1>
        <p className="text-gray-400 mb-10 leading-relaxed px-4">
          Verification successful. Your pay stub for <span className="text-white font-bold">{storeState.employeeDetails?.name || 'the employee'}</span> is now available for download.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-axim-teal text-bg-void font-black px-8 py-5 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_40px_rgba(0,229,255,0.2)]"
          >
            {downloading ? (
              <span className="animate-pulse">Generating Secure PDF...</span>
            ) : (
              <>
                <SafeIcon icon={FiDownload} />
                Download Final PDF
              </>
            )}
          </button>
          
          <Link to="/" className="block w-full text-gray-500 font-bold py-4 hover:text-white transition-all uppercase tracking-widest text-[10px]">
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
