import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiDownload } from 'react-icons/fi';

const Success = () => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('paystub_delivery_email');
    if (storedEmail) setEmail(storedEmail);
  }, []);

  return (
    <div className="min-h-screen bg-bg-void flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-glass border border-white/10 p-10 rounded-2xl max-w-lg w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-axim-teal to-axim-gold" />
        
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-axim-teal/10 rounded-full flex items-center justify-center text-axim-teal">
            <SafeIcon icon={FiCheckCircle} size={40} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        <p className="text-gray-400 mb-8">
          Your professional pay stub has been generated. A copy has been securely emailed to <span className="text-white font-medium">{email || 'your email'}</span>.
        </p>

        <div className="space-y-4">
          <button className="w-full bg-axim-teal text-bg-void font-bold px-6 py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <SafeIcon icon={FiDownload} />
            Download PDF Now
          </button>
          
          <Link to="/" className="block w-full border border-white/20 text-white font-medium px-6 py-4 rounded-xl hover:bg-white/5 transition-all">
            Return to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;