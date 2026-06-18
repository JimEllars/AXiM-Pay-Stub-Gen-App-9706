import { trackEvent } from '../utils/telemetry';
import { BRANDING } from '../config/branding';

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiDownload, FiLoader, FiAlertCircle, FiMail, FiSend, FiCopy } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';
import confetti from 'canvas-confetti';

const Success = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [downloading, setDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [emailInput, setEmailInput] = useState(sessionStorage.getItem('paystub_delivery_email') || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [uiMessage, setUiMessage] = useState({ type: "", text: "" });
  const hydrateStore = usePayStubStore(state => state.hydrateStore);
  const resetFinancialDefaults = usePayStubStore(state => state.resetFinancialDefaults);
  const storeState = usePayStubStore();

  const navigate = useNavigate();
  const recalculateAll = usePayStubStore(state => state.recalculateAll);


  const handleDuplicate = () => {

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
             const newEnd = new Date(nextYearStart, nextMonthStart, 0);
             newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
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
                 const newEnd = new Date(sY, sM, 0);
                 newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
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
             const nextPay = new Date(nextYear, nextMonth - 1, d1);
             newPayDate = nextPay.getFullYear() + '-' + String(nextPay.getMonth() + 1).padStart(2, '0') + '-' + String(nextPay.getDate()).padStart(2, '0');
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
    sessionStorage.removeItem('checkout_pending');
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setErrorMessage('No session ID found in the URL.');
        sessionStorage.removeItem('checkout_pending');
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
          } else if (data.metadata && (data.metadata.state_part_er || data.metadata.state_part_ee)) {
            try {
              const fbEr = data.metadata.state_part_er ? JSON.parse(data.metadata.state_part_er) : {};
              const fbEe = data.metadata.state_part_ee ? JSON.parse(data.metadata.state_part_ee) : {};
              const fbPp = data.metadata.state_part_pp ? JSON.parse(data.metadata.state_part_pp) : {};
              const fbEa = data.metadata.state_part_ea ? JSON.parse(data.metadata.state_part_ea) : [];
              const fbCd = data.metadata.state_part_cd ? JSON.parse(data.metadata.state_part_cd) : [];
              const fbMisc = data.metadata.state_part_misc ? JSON.parse(data.metadata.state_part_misc) : {};

              const isBundle = Array.isArray(fbEr);
              if (isBundle) {
                let reconstructedQueue = fbEr.map((er, idx) => {
                  const ee = fbEe[idx] || {};
                  const pp = fbPp[idx] || {};
                  const ea = fbEa[idx] || [];
                  const cd = fbCd[idx] || [];
                  const misc = fbMisc[idx] || {};

                  return {
                    employerDetails: { name: er.n, address: er.a, ein: er.e },
                    employeeDetails: { name: ee.n, address: ee.a, maritalStatus: ee.m, state: ee.st },
                    payPeriod: pp,
                    earnings: ea.map((e, index) => ({ id: `e_${index}`, type: e.t, hours: e.h, rate: e.r })),
                    customDeductions: cd.map((d, index) => ({ id: `d_${index}`, name: d.n, amount: d.a })),
                    theme: misc.t || "Standard Professional",
                    autoCalculate: misc.ac !== undefined ? fbMisc.ac : true,
                    ytdGrossOverridden: misc.ygo || false,
                    taxOverrides: misc.to || { socialSecurity: false, medicare: false, federalIncomeTax: false, stateIncomeTax: false }
                  };
                });

                if (reconstructedQueue.length === 1) {
                  const addDays = (dateStr, days) => {
                      if (!dateStr) return '';
                      const [y, m, d] = dateStr.split('-').map(Number);
                      const date = new Date(y, m - 1, d);
                      date.setDate(date.getDate() + days);
                      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                  };

                  let currentStub = reconstructedQueue[0];
                  for (let i = 1; i < 6; i++) {
                      let nextStub = JSON.parse(JSON.stringify(currentStub));
                      const { frequency, startDate, endDate, payDate } = currentStub.payPeriod;
                      let newStartDate = '';
                      let newEndDate = '';
                      let newPayDate = '';

                      if (startDate && endDate) {
                          if (frequency === 'monthly') {
                               const [y1, m1, d1] = endDate.split('-').map(Number);
                               const nextMonthStart = m1 === 12 ? 1 : m1 + 1;
                               const nextYearStart = m1 === 12 ? y1 + 1 : y1;
                               newStartDate = nextYearStart + '-' + String(nextMonthStart).padStart(2, '0') + '-01';
                               const newEnd = new Date(nextYearStart, nextMonthStart, 0);
                               newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
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
                                   const newEnd = new Date(sY, sM, 0);
                                   newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
                               } else {
                                   const nextMonth = sM === 12 ? 1 : sM + 1;
                                   const nextYear = sM === 12 ? sY + 1 : sY;
                                   newStartDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
                                   newEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
                               }
                          }
                      }

                      if (payDate) {
                          if (frequency === 'monthly') {
                               const [y1, m1, d1] = payDate.split('-').map(Number);
                               const nextMonth = m1 === 12 ? 1 : m1 + 1;
                               const nextYear = m1 === 12 ? y1 + 1 : y1;
                               const nextPay = new Date(nextYear, nextMonth - 1, d1);
                               newPayDate = nextPay.getFullYear() + '-' + String(nextPay.getMonth() + 1).padStart(2, '0') + '-' + String(nextPay.getDate()).padStart(2, '0');
                          } else if (frequency === 'weekly') {
                               newPayDate = addDays(payDate, 7);
                          } else if (frequency === 'bi-weekly') {
                               newPayDate = addDays(payDate, 14);
                          } else if (frequency === 'semi-monthly') {
                               newPayDate = addDays(payDate, 15);
                          }
                      }

                      nextStub.payPeriod.startDate = newStartDate;
                      nextStub.payPeriod.endDate = newEndDate;
                      nextStub.payPeriod.payDate = newPayDate;

                      reconstructedQueue.push(nextStub);
                      currentStub = nextStub;
                  }
                }
                sessionStorage.setItem('axim_paystub_draft_queue', JSON.stringify(reconstructedQueue));
                parsedDraft = reconstructedQueue[reconstructedQueue.length - 1];
              } else {
                parsedDraft = {
                  employerDetails: { name: fbEr.n, address: fbEr.a, ein: fbEr.e },
                  employeeDetails: { name: fbEe.n, address: fbEe.a, maritalStatus: fbEe.m, state: fbEe.st },
                  payPeriod: fbPp,
                  earnings: fbEa.map((e, index) => ({ id: `e_${index}`, type: e.t, hours: e.h, rate: e.r })),
                  customDeductions: fbCd.map((d, index) => ({ id: `d_${index}`, name: d.n, amount: d.a })),
                  theme: fbMisc.t || "Standard Professional",
                  autoCalculate: fbMisc.ac !== undefined ? fbMisc.ac : true,
                  ytdGrossOverridden: fbMisc.ygo || false,
                  taxOverrides: fbMisc.to || { socialSecurity: false, medicare: false, federalIncomeTax: false, stateIncomeTax: false }
                };
              }
              hydrateStore(parsedDraft);
              recalculateAll();
            } catch (e) {
              console.error("Failed to parse segmented fallback state from metadata", e);
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


          // Automatic Email Dispatch
          const savedEmail = sessionStorage.getItem('paystub_delivery_email');
          if (savedEmail && parsedDraft) {
             try {
                 fetch('/api/send-email', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     session_id: sessionId,
                     email: savedEmail,
                     formData: parsedDraft
                   })
                 }).then(res => {
                    if (!res.ok) setUiMessage({ type: 'error', text: 'Error sending email...' });
                 }).catch((e) => {
                    console.error('Email action failed');
                    setUiMessage({ type: 'error', text: 'Error sending email...' });
                 });
             } catch (e) {
                 console.error('Email action failed');
                 setUiMessage({ type: 'error', text: 'Error sending email...' });
             }
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
    const hasAlreadyDownloaded = sessionStorage.getItem('auto_downloaded_' + searchParams.get('session_id'));

    if (status === 'success' && !downloading && !autoDownloaded && !hasAlreadyDownloaded) {
      sessionStorage.setItem('auto_downloaded_' + searchParams.get('session_id'), 'true');
      setAutoDownloaded(true);
      handleDownload();
    }
  }, [status, autoDownloaded, searchParams]);


  const handleEmailSend = async () => {
    if (!emailInput) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setUiMessage({ type: 'error', text: 'Please enter a valid email address.' });
      setIsSendingEmail(false);
      return;
    }
    setUiMessage({ type: '', text: '' });
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
      setUiMessage({ type: 'success', text: 'Email sent successfully!' });
      setEmailInput('');
    } catch (e) {
      setUiMessage({ type: 'error', text: e.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // PHASE 4: Request Secure Edge PDF Generation
            const headers = { 'Content-Type': 'application/json' };
            let finalFormData = storeState;
      if (sessionStorage.getItem('axim_paystub_plan_type') === 'bundle') {
        let queueStr = sessionStorage.getItem('axim_paystub_draft_queue');
        let parsedQueue = [];
        if (queueStr) {
          try {
            parsedQueue = JSON.parse(queueStr);
          } catch (e) {
            console.error("Failed to parse bundle queue", e);
          }
        }

        if (!parsedQueue || parsedQueue.length === 0) {
          // Dynamically reconstruct the 6-stub array if missing
          const addDays = (dateStr, days) => {
              if (!dateStr) return '';
              const [y, m, d] = dateStr.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              date.setDate(date.getDate() + days);
              return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
          };

          let currentStub = JSON.parse(JSON.stringify(storeState));
          parsedQueue.push(currentStub);

          for (let i = 1; i < 6; i++) {
              let nextStub = JSON.parse(JSON.stringify(currentStub));
              const { frequency, startDate, endDate, payDate } = nextStub.payPeriod;
              let newStartDate = '';
              let newEndDate = '';
              let newPayDate = '';

              if (startDate && endDate) {
                  if (frequency === 'monthly') {
                       const [y1, m1, d1] = endDate.split('-').map(Number);
                       const nextMonthStart = m1 === 12 ? 1 : m1 + 1;
                       const nextYearStart = m1 === 12 ? y1 + 1 : y1;
                       newStartDate = nextYearStart + '-' + String(nextMonthStart).padStart(2, '0') + '-01';
                       const newEnd = new Date(nextYearStart, nextMonthStart, 0);
                       newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
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
                           const newEnd = new Date(sY, sM, 0);
                           newEndDate = newEnd.getFullYear() + '-' + String(newEnd.getMonth() + 1).padStart(2, '0') + '-' + String(newEnd.getDate()).padStart(2, '0');
                       } else {
                           const nextMonth = sM === 12 ? 1 : sM + 1;
                           const nextYear = sM === 12 ? sY + 1 : sY;
                           newStartDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
                           newEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
                       }
                  }
              }

              if (payDate) {
                  if (frequency === 'monthly') {
                       const [y1, m1, d1] = payDate.split('-').map(Number);
                       const nextMonth = m1 === 12 ? 1 : m1 + 1;
                       const nextYear = m1 === 12 ? y1 + 1 : y1;
                       const nextPay = new Date(nextYear, nextMonth - 1, d1);
                       newPayDate = nextPay.getFullYear() + '-' + String(nextPay.getMonth() + 1).padStart(2, '0') + '-' + String(nextPay.getDate()).padStart(2, '0');
                  } else if (frequency === 'weekly') {
                       newPayDate = addDays(payDate, 7);
                  } else if (frequency === 'bi-weekly') {
                       newPayDate = addDays(payDate, 14);
                  } else if (frequency === 'semi-monthly') {
                       newPayDate = addDays(payDate, 15);
                  }
              }

              nextStub.payPeriod.startDate = newStartDate;
              nextStub.payPeriod.endDate = newEndDate;
              nextStub.payPeriod.payDate = newPayDate;

              parsedQueue.push(nextStub);
              currentStub = nextStub;
          }
          sessionStorage.setItem('axim_paystub_draft_queue', JSON.stringify(parsedQueue));
        }
        finalFormData = parsedQueue;
      }

      sessionStorage.removeItem('checkout_pending');

      const response = await fetch('/api/generate-paystub', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: searchParams.get('session_id'),
          formData: finalFormData
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
      a.download = `Statement_${searchParams.get('session_id').substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      // Telemetry Sync
      const eventName = sessionStorage.getItem('axim_paystub_plan_type') === 'bundle' ? 'batch_bundle_downloaded' : 'single_generation_completed';
      const value = sessionStorage.getItem('axim_paystub_plan_type') === 'bundle' ? 20.00 : 4.00;
      trackEvent(eventName, { session_id: searchParams.get('session_id'), value, currency: 'USD' });
      trackEvent('document_generated', { session_id: searchParams.get('session_id'), value, currency: 'USD' });


    } catch (e) {
      console.error("Download Error:", e);
      setUiMessage({ type: 'error', text: `Download failed: ${e.message}. Please check your email for the backup copy.` });
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

        <p className="text-gray-400 mb-10 leading-relaxed px-4">
          Verification successful. Your pay stub for <span className="text-white font-bold">{storeState.employeeDetails?.name || 'the employee'}</span> is now available for download.
        </p>
        {uiMessage.text && (
          <div className={`p-4 rounded-xl mb-4 text-sm font-bold ${uiMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {uiMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`w-full bg-axim-teal text-bg-void font-black px-8 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 ${downloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white shadow-[0_0_40px_rgba(0,229,255,0.2)]'}`}
            >
              {downloading ? (
                <div className="flex items-center gap-3">
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <SafeIcon icon={FiLoader} />
                   </motion.div>
                   <span>Download Final PDF</span>
                </div>
              ) : (
                <>
                  <SafeIcon icon={FiDownload} />
                  Download Final PDF
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-400 mt-3 font-medium">If your download didn't start automatically, tap here.</p>
          </div>
          
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
                onClick={handleEmailSend}
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

          <Link
            to="/"
            onClick={() => {
              resetFinancialDefaults();
              const resetState = usePayStubStore.getState();
              hydrateStore({
                  ...resetState,
                  employeeDetails: { name: '', address: '', city: '', maritalStatus: 'single', state: 'TX', zipCode: '' },
                  payPeriod: { frequency: 'bi-weekly', startDate: '', endDate: '', payDate: '' }
              });
              sessionStorage.removeItem('axim_paystub_draft_continuous');
              sessionStorage.removeItem('axim_paystub_draft_queue');
              sessionStorage.removeItem('paystub_delivery_email');
            }}
            className="block w-full text-gray-500 font-bold py-4 mt-4 hover:text-white transition-all uppercase tracking-widest text-xs md:text-sm"
            role="button"
          >
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
