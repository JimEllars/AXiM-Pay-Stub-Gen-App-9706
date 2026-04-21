import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiX, FiLock } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';

const PaymentModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const storeState = usePayStubStore();

  const handlePayment = async () => {
    if (!email) {
      alert("Please enter a delivery email.");
      return;
    }
    
    setLoading(true);

    // PHASE 3: Fortify State Handoff
    // Serialize and store the entire application state before redirecting to Stripe
    sessionStorage.setItem('paystub_delivery_email', email);

    // Explicitly select the state keys we want to store, to avoid storing actions/functions
    const stateToStore = {
      employerDetails: storeState.employerDetails,
      employeeDetails: storeState.employeeDetails,
      payPeriod: storeState.payPeriod,
      earnings: storeState.earnings,
      customDeductions: storeState.customDeductions,
      calculatedTotals: storeState.calculatedTotals
    };

    sessionStorage.setItem('paystub_draft_data', JSON.stringify(stateToStore));

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: "pay_stub_generator",
          metadata: {
            deliveryEmail: email,
            documentType: "pay_stub_v1"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to initialize checkout gateway. Status: ${response.status}`);
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
      alert(`Billing Gateway Error: ${e.message}. Please try again or contact support@axim.us.com`);
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

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-medium">Professional Pay Stub</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">One-time Generation</p>
              </div>
              <span className="text-axim-gold font-mono font-black text-2xl">$9.99</span>
            </div>

            <button 
              onClick={handlePayment}
              disabled={loading}
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
