import { trackEvent } from '../utils/telemetry';
import { useCredits } from '../utils/useCredits';
import { BRANDING } from '../config/branding';
import { syncDraftQueueToProfile } from '../store/usePayStubStore';

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiDownload, FiLoader, FiAlertCircle, FiMail, FiSend, FiCopy } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';
import confetti from 'canvas-confetti';

const Success = () => {
  const { credits, addCredits, consumeCredit } = useCredits();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [downloading, setDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const hydrateStore = usePayStubStore(state => state.hydrateStore);
  const storeState = usePayStubStore();

  const navigate = useNavigate();
  const recalculateAll = usePayStubStore(state => state.recalculateAll);


  const handleDuplicate = () => {
    trackEvent('duplicate_rate');

    // 1. Get current store state
    const currentState = usePayStubStore.getState();

    // 2. We need to increment dates.
    const { frequency, startDate, endDate, payDate } = currentState.payPeriod;
    let newStartDate = '';
    let newEndDate = '';
    let newPayDate = '';


    const addDays = (dateStr, days) => {
        if (!dateStr) return '';
        // Use manual parts parsing to avoid timezone timezone-offset issues
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    };

    if (startDate && endDate) {
        if (frequency === 'monthly') {
             const [y1, m1, d1] = endDate.split('-').map(Number);
             const nextMonthStart = m1 === 12 ? 1 : m1 + 1;
             const nextYearStart = m1 === 12 ? y1 + 1 : y1;

             // First day of next month
             newStartDate = nextYearStart + '-' + String(nextMonthStart).padStart(2, '0') + '-01';

             // properly clamp to end of month, including leap year safely using UTC 0th day approach
             const newEnd = new Date(Date.UTC(nextYearStart, nextMonthStart, 0));
             newEndDate = newEnd.getUTCFullYear() + '-' + String(newEnd.getUTCMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getUTCDate()).padStart(2, '0');
        } else if (frequency === 'weekly') {
             newStartDate = addDays(startDate, 7);
             newEndDate = addDays(endDate, 7);
        } else if (frequency === 'bi-weekly') {
             newStartDate = addDays(startDate, 14);
             newEndDate = addDays(endDate, 14);
        } else if (frequency === 'semi-monthly') {
             const [sY, sM, sD] = startDate.split('-').map(Number);
             if (sD === 1 || sD < 15) {
                 newStartDate = `${sY}-${String(sM).padStart(2, '0')}-16`;
                 const newEnd = new Date(Date.UTC(sY, sM, 0));
                 newEndDate = newEnd.getUTCFullYear() + '-' + String(newEnd.getUTCMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getUTCDate()).padStart(2, '0');
             } else {
                 const nextMonth = sM === 12 ? 1 : sM + 1;
                 const nextYear = sM === 12 ? sY + 1 : sY;
                 newStartDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
                 // Find 15th of next month
                 newEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
             }
        }
    }

    if (payDate) {
        if (frequency === 'monthly') {
             const [y1, m1, d1] = payDate.split('-').map(Number);
             const nextMonth = m1 === 12 ? 1 : m1 + 1;
             const nextYear = m1 === 12 ? y1 + 1 : y1;
             const nextPay = new Date(Date.UTC(nextYear, nextMonth - 1, d1));
             newPayDate = nextPay.getUTCFullYear() + '-' + String(nextPay.getUTCMonth() + 1).padStart(2, '0') + '-' + String(nextPay.getUTCDate()).padStart(2, '0');
        } else if (frequency === 'weekly') {
             newPayDate = addDays(payDate, 7);
        } else if (frequency === 'bi-weekly') {
             newPayDate = addDays(payDate, 14);
        } else if (frequency === 'semi-monthly') {
             newPayDate = addDays(payDate, 15);
        }
    }

    const newDraft = {
        ...currentState,
        theme: currentState.theme || BRANDING.defaultTheme,
        payPeriod: {
            ...currentState.payPeriod,
            startDate: newStartDate,
            endDate: newEndDate,
            payDate: newPayDate
        },
        calculatedTotals: {
            ...currentState.calculatedTotals,
            // Carry over current Gross into YTD to jump start the next period
            ytdGross: currentState.calculatedTotals.ytdGross + currentState.calculatedTotals.currentGross,
        },
        ytdGrossOverridden: true
    };

    // 3. Hydrate
    hydrateStore(newDraft);
    recalculateAll();

    // 4. Navigate
    navigate('/app/generator');
  };


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
           const errorText = await response.text();
           let errMsg = `Verification API returned status ${response.status}`;
           try {
             const edata = JSON.parse(errorText);
             if (edata.error) errMsg = edata.error;
           } catch (e) {
             if (errorText) errMsg = errorText;
           }
           throw new Error(errMsg);
        }

        const data = await response.json();

        if (data.isPaid) {
          // PHASE 3: Re-hydrate State
          const queueStr = sessionStorage.getItem('axim_paystub_draft_queue');
          const rawDraft = sessionStorage.getItem('axim_paystub_draft');
          let parsedDraft = null;

          if (queueStr) {
             const q = JSON.parse(queueStr);
             parsedDraft = q; // Array
             // Hydrate the store with the last one to show *some* details
             if (q.length > 0) {
               hydrateStore(q[q.length - 1]);
             }
          } else if (rawDraft) {
            parsedDraft = JSON.parse(rawDraft);
            hydrateStore(parsedDraft);
          } else if (data.metadata && data.metadata.fallback_state) {
            try {
              const fb = JSON.parse(data.metadata.fallback_state);
              parsedDraft = {
                employerDetails: { name: fb.er.n, address: fb.er.a, ein: fb.er.e },
                employeeDetails: { name: fb.ee.n, address: fb.ee.a, ssnLast4: fb.ee.s, maritalStatus: fb.ee.m, state: fb.ee.st },
                payPeriod: fb.pp,
                earnings: fb.ea.map(e => ({ type: e.t, hours: e.h, rate: e.r })),
                customDeductions: fb.cd.map(d => ({ name: d.n, amount: d.a }))
              };
              hydrateStore(parsedDraft);
              recalculateAll();
            } catch (e) {
              console.error("Failed to parse fallback state from metadata", e);
            }
          }


          if (data.metadata?.documentType === "pay_stub_bundle_v1" || sessionStorage.getItem("axim_paystub_plan_type") === "bundle") {
            try {
              // Add 6 Document Credits to user profile via Quest Labs API
              const userId = localStorage.getItem('axim_user_id') || searchParams.get('session_id');
              await fetch('/api/grant-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  creditsToAdd: 6,
                  creditType: 'DOCUMENT_CREDITS',
                  description: 'Streamlined bundle redemption bonus',
                  session_id: sessionId
                })
              });

              // Also store locally for immediate sync after API confirms success
              addCredits(6);
            } catch (e) {
              console.error('Failed to add credits via Quest', e);
            }
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
    const isCreditRedemption = searchParams.get('session_id')?.startsWith('credit_redemption_');
    const hasAlreadyDownloaded = sessionStorage.getItem('auto_downloaded_' + searchParams.get('session_id'));

    if (status === 'success' && !downloading && !autoDownloaded && !isCreditRedemption && !hasAlreadyDownloaded) {
      setAutoDownloaded(true);
      sessionStorage.setItem('auto_downloaded_' + searchParams.get('session_id'), 'true');

      // Deduct 1 credit for the auto-download if this was a new bundle purchase.
      consumeCredit();
      handleDownload();
    }
  }, [status, downloading, autoDownloaded, searchParams, consumeCredit]);


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
      a.download = 'PayStub.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      trackEvent('time_to_first_download', { session_id: searchParams.get('session_id') });

      // Telemetry Sync


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
          We could not verify your payment session. {errorMessage && <span className="block mt-2 text-red-400">{errorMessage}</span>} If you believe this is an error, please contact support at {BRANDING.supportEmail}.
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

        {credits > 0 && (
          <div className="bg-axim-teal/10 border border-axim-teal p-4 rounded-xl mb-6">
            <p className="text-axim-teal font-bold mb-2">🎉 {credits >= 6 ? '6 document credits added to your account' : 'Credits Available'}</p>
            <p className="text-sm text-white mb-4">Current Balance: {credits} credits</p>
            <Link to="/app/generator" className="inline-block bg-axim-teal text-black font-bold px-6 py-2 rounded-lg hover:bg-white transition-all text-sm">
              Use a Credit
            </Link>
          </div>
        )}

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


          <button
            onClick={handleDuplicate}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <SafeIcon icon={FiCopy} />
            Duplicate for Next Pay Period
          </button>

          <Link to="/" className="block w-full text-gray-500 font-bold py-4 mt-4 hover:text-white transition-all uppercase tracking-widest text-[10px]">
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
