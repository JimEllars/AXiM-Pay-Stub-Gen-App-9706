import { BRANDING } from '../config/branding';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiX, FiLock } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';
import { useNavigate } from 'react-router-dom';

const PaymentModal = ({ isOpen, onClose }) => {

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState('single');
  const storeState = usePayStubStore();
  const syncDraftQueueToProfile = usePayStubStore(state => state.syncDraftQueueToProfile);
  const navigate = useNavigate();

  const isValid =
    storeState.employerDetails?.name?.trim() !== '' &&
    storeState.employeeDetails?.name?.trim() !== '' &&
    storeState.payPeriod?.startDate?.trim() !== '' &&
    storeState.calculatedTotals?.currentGross > 0;


  const handlePayment = async () => {
    if (!email) {
      alert("Please enter a delivery email.");
      return;
    }
    


    setLoading(true);

    // PHASE 3: Fortify State Handoff
    // Serialize and store the entire application state before redirecting to Stripe
    sessionStorage.setItem('paystub_delivery_email', email);
    sessionStorage.setItem('axim_paystub_plan_type', planType);

    // Explicitly select the state keys we want to store, to avoid storing actions/functions
    const stateToStore = {
      employerDetails: storeState.employerDetails,
      employeeDetails: storeState.employeeDetails,
      payPeriod: storeState.payPeriod,
      earnings: storeState.earnings,
      customDeductions: storeState.customDeductions,
      calculatedTotals: storeState.calculatedTotals
    };

        if (planType === 'bundle') {
       const existingQueueStr = sessionStorage.getItem('axim_paystub_draft_queue');
       let queue = existingQueueStr ? JSON.parse(existingQueueStr) : [];
       queue.push(stateToStore);
       sessionStorage.setItem('axim_paystub_draft_queue', JSON.stringify(queue));
       syncDraftQueueToProfile(queue);


       if (queue.length < 6) {
          // Alert user they can add more or proceed. For better UX, we'll confirm
          const addMore = window.confirm(`Added ${queue.length}/6 stubs to batch.\n\nClick OK to add another stub (you can change pay dates or amounts).\nClick Cancel to proceed to checkout with ${queue.length} stubs.`);
          if (addMore) {
             setLoading(false);
             onClose(); // close modal to allow them to edit and add more
             return; // don't proceed to checkout yet
          }
       }
    } else {
       sessionStorage.setItem('axim_paystub_draft', JSON.stringify(stateToStore));
    }


    try {

      let erData, eeData, ppData, eaData, cdData, miscData;
      if (planType === 'bundle') {
          const queueStr = sessionStorage.getItem('axim_paystub_draft_queue');
          const queue = queueStr ? JSON.parse(queueStr) : [stateToStore];
          erData = queue.map(s => ({ n: s.employerDetails?.name, a: s.employerDetails?.address, e: s.employerDetails?.ein }));
          eeData = queue.map(s => ({ n: s.employeeDetails?.name, a: s.employeeDetails?.address, s: s.employeeDetails?.ssnLast4, m: s.employeeDetails?.maritalStatus, st: s.employeeDetails?.state }));
          ppData = queue.map(s => s.payPeriod);
          eaData = queue.map(s => (s.earnings || []).map(e => ({ t: e.type, h: e.hours, r: e.rate })));
          cdData = queue.map(s => (s.customDeductions || []).map(d => ({ n: d.name, a: d.amount })));
          miscData = queue.map(s => ({ t: s.theme, ac: s.autoCalculate, ygo: s.ytdGrossOverridden, to: s.taxOverrides }));
      } else {
          erData = { n: storeState.employerDetails?.name, a: storeState.employerDetails?.address, e: storeState.employerDetails?.ein };
          eeData = { n: storeState.employeeDetails?.name, a: storeState.employeeDetails?.address, s: storeState.employeeDetails?.ssnLast4, m: storeState.employeeDetails?.maritalStatus, st: storeState.employeeDetails?.state };
          ppData = storeState.payPeriod;
          eaData = (storeState.earnings || []).map(e => ({ t: e.type, h: e.hours, r: e.rate }));
          cdData = (storeState.customDeductions || []).map(d => ({ n: d.name, a: d.amount }));
          miscData = { t: storeState.theme, ac: storeState.autoCalculate, ygo: storeState.ytdGrossOverridden, to: storeState.taxOverrides };
      }

      const response = await fetch('/api/create-checkout-session', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: planType === "bundle" ? "pay_stub_bundle" : "pay_stub_generator",
          metadata: {
            deliveryEmail: email,
            documentType: planType === "bundle" ? "pay_stub_bundle_v1" : "pay_stub_v1",
            state_part_er: JSON.stringify(erData),
            state_part_ee: JSON.stringify(eeData),
            state_part_pp: JSON.stringify(ppData),
            state_part_ea: JSON.stringify(eaData),
            state_part_cd: JSON.stringify(cdData),
            state_part_misc: JSON.stringify(miscData)
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `Failed to initialize checkout gateway. Status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) errMsg = errorData.error;
        } catch(e) {
          if (errorText) errMsg = errorText;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      if (data.url) {
        // Redirect to actual Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL not found in response.");
      }
    } catch (e) {
      console.error("Payment Initialization Failed:", e);
      alert(`Billing Gateway Error: ${e.message}. Please try again or contact ${BRANDING.supportEmail}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-bg-void/90 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-10 z-10"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
            <SafeIcon icon={FiX} size={24} />
          </button>

          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-axim-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-axim-teal">
              <SafeIcon icon={FiLock} size={32} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Finalize Order</h2>
            <p className="text-gray-400 text-sm font-light">Enter your email to receive your secure, high-resolution PDF pay stub.</p>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Delivery Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-axim-teal transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  setPlanType('single');
                  sessionStorage.removeItem('axim_paystub_draft_queue');
                  syncDraftQueueToProfile([]);
                }}
                className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${planType === 'single' ? 'bg-axim-teal/10 border-axim-teal' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
              >
                <div>
                  <p className="text-sm text-white font-medium">Single Pay Stub</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">One-time Generation</p>
                </div>
                <span className="text-axim-gold font-mono font-black text-xl">{BRANDING.singlePrice}</span>
              </button>

              <button
                onClick={() => {
                  setPlanType('bundle');
                  sessionStorage.removeItem('axim_paystub_draft_queue');
                  syncDraftQueueToProfile([]);
                }}
                className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all relative overflow-hidden ${planType === 'bundle' ? 'bg-axim-teal/10 border-axim-teal' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
              >
                <div className="absolute top-0 right-0 bg-axim-gold text-black text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-bl-lg">Most Popular</div>
                <div>
                  <p className="text-sm text-white font-medium flex items-center gap-2">Buy {BRANDING.bundleCredits - 1}, Get 1 Free <span className="bg-axim-teal text-black text-[9px] px-1.5 py-0.5 rounded font-black">+1</span></p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">6 Documents Added to Account</p>
                </div>
                <span className="text-axim-gold font-mono font-black text-xl">{BRANDING.bundlePrice}</span>
              </button>
            </div>

            <button 
              onClick={handlePayment}
              disabled={loading || !isValid}
              className="w-full bg-axim-teal text-bg-void font-black px-8 py-5 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,229,255,0.2)]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 border-2 border-bg-void/30 border-t-bg-void rounded-full animate-spin" />
                   <span>Initializing...</span>
                </div>
              ) : (
                <>
                  <SafeIcon icon={FiLock} />
                  Proceed to Secure Checkout
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-600 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
              <SafeIcon icon={FiLock} size={10} /> 256-bit Encryption
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;
