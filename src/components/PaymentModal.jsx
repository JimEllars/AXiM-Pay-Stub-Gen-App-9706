import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiX, FiLock } from 'react-icons/fi';

const PaymentModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!email) {
      alert("Please enter a delivery email.");
      return;
    }
    
    setLoading(true);
    sessionStorage.setItem('paystub_delivery_email', email);

    try {
      // In a real app, this hits the Cloudflare worker proxy
      // We simulate the API request here
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

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback for demo mode
        setTimeout(() => {
          window.location.hash = '#/success';
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      // Fallback for demo without worker running locally
      setTimeout(() => {
        window.location.hash = '#/success';
      }, 1000);
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
          className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-8 z-10"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <SafeIcon icon={FiX} size={24} />
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Secure Checkout</h2>
            <p className="text-gray-400 text-sm">Your document is ready. Enter your email to receive the final unmarked PDF pay stub.</p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Delivery Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all"
              />
            </div>

            <div className="bg-glass border border-white/5 p-4 rounded-lg flex justify-between items-center">
              <span className="text-gray-300 font-medium">One-time generation</span>
              <span className="text-axim-gold font-mono font-bold text-xl">$9.99</span>
            </div>

            <button 
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-axim-teal text-bg-void font-bold px-6 py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            >
              {loading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <SafeIcon icon={FiLock} />
                  Pay with Card
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
              <SafeIcon icon={FiLock} size={10} /> Secured by Stripe
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;