import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiDownload, FiLoader, FiAlertCircle, FiMail, FiSend } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';
import confetti from 'canvas-confetti';

const Success = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [downloading, setDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [emailInput, setEmailInput] = useState('');
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
          const rawDraft = sessionStorage.getItem('axim_paystub_draft');
          let parsedDraft = null;
          if (rawDraft) {
            parsedDraft = JSON.parse(rawDraft);
            hydrateStore(parsedDraft);
          }

          setStatus('success');

          // Trigger Confetti Celebration
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00e5ff', '#ffea00', '#ffffff']
          });

          localStorage.removeItem('axim_paystub_draft_continuous');

          // Automatic Email Dispatch
          const savedEmail = sessionStorage.getItem('paystub_delivery_email');
          if (savedEmail && parsedDraft) {
             fetch('/api/send-email', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 session_id: sessionId,
                 email: savedEmail,
                 formData: parsedDraft
               })
             }).catch(console.error);
          }
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


  useEffect(() => {
    if (status === 'success' && !downloading && !autoDownloaded) {
      setAutoDownloaded(true);
      handleDownload();
    }
  }, [status]);


  const handleDownload = async () => {
    setDownloading(true);
    try {
      // PHASE 4: Request Secure Edge PDF Generation
            const headers = { 'Content-Type': 'application/json' };
            const response = await fetch('/api/generate-paystub', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: searchParams.get('session_id'),
          formData: storeState
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'PDF Generation API failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

            const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AXiM_PayStub.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      // Telemetry Sync
      fetch('/api/v1/telemetry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: "document_generated", type: "pay_stub", session_id: searchParams.get('session_id') })
      }).catch(console.error);

      if (window.dataLayer) {
         window.dataLayer.push({ event: "document_generated", type: "pay_stub", session_id: searchParams.get('session_id') });
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
              <div className="flex items-center gap-3">
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <SafeIcon icon={FiLoader} />
                 </motion.div>
                 <span>Success! Your document is downloading...</span>
              </div>
            ) : (
              <>
                <SafeIcon icon={FiDownload} />
                Download Final PDF
              </>
            )}
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">Email My Document</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="name@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-axim-teal transition-all font-mono text-sm"
              />
              <button
                onClick={async () => {
                  if (!emailInput) return;
                  setIsSendingEmail(true);
                  try {
                    const res = await fetch('/api/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        session_id: searchParams.get('session_id'),
                        email: emailInput,
                        formData: storeState
                      })
                    });
                    if (!res.ok) throw new Error("Failed to send email");
                    alert("Email sent successfully!");
                    setEmailInput('');
                  } catch (e) {
                    alert("Error sending email: " + e.message);
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
                disabled={isSendingEmail || !emailInput}
                className="bg-white/10 hover:bg-axim-teal hover:text-black text-white px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isSendingEmail ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <SafeIcon icon={FiLoader} />
                  </motion.div>
                ) : (
                  <SafeIcon icon={FiSend} />
                )}
              </button>
            </div>
          </div>

          <Link to="/" className="block w-full text-gray-500 font-bold py-4 mt-4 hover:text-white transition-all uppercase tracking-widest text-[10px]">
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
