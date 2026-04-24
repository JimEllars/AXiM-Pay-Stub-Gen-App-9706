import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiArrowRight, FiShield, FiCpu, FiFileText, FiUser } from 'react-icons/fi';
import { usePayStubStore } from '../store/usePayStubStore';

const Landing = () => {
  const userProfile = usePayStubStore(state => state.userProfile);
  return (
    <div className="min-h-screen bg-bg-void text-white font-sans selection:bg-axim-teal selection:text-black overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-void to-bg-void" />

      {/* Navigation */}
      <nav className="relative z-20 flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-axim-teal to-axim-gold rounded-lg flex items-center justify-center">
            <span className="text-bg-void font-black text-xs">AX</span>
          </div>
          <span className="font-bold tracking-tighter text-xl uppercase">AXiM <span className="text-gray-500 font-light">Systems</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-axim-teal transition-colors">Enterprise</a>
          <a href="#" className="hover:text-axim-teal transition-colors">Compliance</a>
          <a href="#" className="hover:text-axim-teal transition-colors">Pricing</a>
        </div>
        {userProfile ? (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <div className="w-6 h-6 bg-axim-teal/20 rounded-full flex items-center justify-center text-axim-teal">
              <SafeIcon icon={FiUser} size={14} />
            </div>
            <span className="text-sm font-bold text-white">{userProfile.email}</span>
            <Link to="/app/generator" className="ml-4 text-xs font-bold text-axim-teal hover:text-white transition-colors">
              Dashboard &rarr;
            </Link>
          </div>
        ) : (
          <Link to="/app/generator" className="bg-white/5 border border-white/10 px-5 py-2 rounded-full text-sm font-bold hover:bg-white/10 transition-all">
            Client Login
          </Link>
        )}
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <motion.div
          className="flex-1 text-left"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 border border-axim-teal/30 bg-axim-teal/5 text-axim-teal px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
            <span className="w-1.5 h-1.5 bg-axim-teal rounded-full animate-pulse" />
            2024 Compliance Engine Ready
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[1.1]">
            GENERATE PROFESSIONAL <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-axim-teal via-white to-axim-gold">PAY STUBS INSTANTLY.</span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
            Mathematically accurate, enterprise-grade pay stubs for contractors and SMBs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Link 
              to="/app/generator"
              className="group bg-axim-teal text-bg-void font-black text-lg px-10 py-5 rounded-2xl hover:bg-white transition-all duration-500 flex items-center gap-3 shadow-[0_0_30px_rgba(0,229,255,0.3)]"
            >
              Create Pay Stub - $4.00
              <SafeIcon icon={FiArrowRight} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-10 py-5 rounded-2xl border border-white/10 font-bold bg-white/5 hover:bg-white/10 transition-all">
              View Sample Stub
            </button>
          </div>
        </motion.div>

        {/* Floating Pay Stub Visual Anchor */}
        <motion.div
          className="flex-1 hidden md:flex justify-center relative"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="relative w-full max-w-md">
            {/* Glow effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-axim-teal/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-axim-gold/10 blur-[80px] rounded-full" />

            {/* Stub Card */}
            <motion.div
              className="relative z-10 bg-black/60 border border-white/20 backdrop-blur-xl p-6 rounded-xl shadow-2xl overflow-hidden"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 1, -1, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Header */}
              <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-center">
                <div>
                  <div className="w-24 h-4 bg-white/20 rounded mb-2" />
                  <div className="w-32 h-3 bg-white/10 rounded" />
                </div>
                <div className="text-right">
                  <div className="w-16 h-4 bg-axim-teal/30 rounded mb-2 ml-auto" />
                  <div className="w-20 h-3 bg-white/10 rounded ml-auto" />
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3 mb-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="w-20 h-3 bg-white/10 rounded" />
                    <div className="w-12 h-3 bg-white/20 rounded" />
                    <div className="w-16 h-3 bg-white/10 rounded" />
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div className="space-y-3 mb-6 border-t border-white/10 pt-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="w-24 h-3 bg-red-400/20 rounded" />
                    <div className="w-16 h-3 bg-red-400/20 rounded" />
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-white/20 pt-4 flex justify-between items-center">
                <div className="w-16 h-5 bg-white/30 rounded" />
                <div className="w-24 h-6 bg-axim-gold/40 rounded" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </header>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-axim-teal/20 rounded-xl flex items-center justify-center text-axim-teal mb-6">
            <SafeIcon icon={FiCpu} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">Auto-Calculated FICA & FIT</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Automatically calculates FICA, Medicare, and Federal Income Tax based on the latest 2024 progressive tax brackets.
          </p>
        </div>

        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-axim-gold/20 rounded-xl flex items-center justify-center text-axim-gold mb-6">
            <SafeIcon icon={FiFileText} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">Instant Edge PDF Generation</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Produces high-fidelity, industry-standard PDF documents suitable for mortgage applications, rentals, and employment verification.
          </p>
        </div>

        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6">
            <SafeIcon icon={FiShield} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">Bank-Grade 256-bit Encryption</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enterprise-grade encryption for all financial data. Sensitive PII is never stored on our servers; documents are generated at the edge.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-xs font-mono">
            &copy; 2024 AXIM SYSTEMS INC. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
