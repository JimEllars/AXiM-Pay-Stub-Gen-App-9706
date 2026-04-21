import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiArrowRight, FiShield, FiCpu, FiFileText } from 'react-icons/fi';

const Landing = () => {
  return (
    <div className="min-h-screen bg-bg-void text-white font-sans selection:bg-axim-teal selection:text-black">
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
        <Link to="/app/generator" className="bg-white/5 border border-white/10 px-5 py-2 rounded-full text-sm font-bold hover:bg-white/10 transition-all">
          Client Login
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 border border-axim-teal/30 bg-axim-teal/5 text-axim-teal px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
            <span className="w-1.5 h-1.5 bg-axim-teal rounded-full animate-pulse" />
            2024 Compliance Engine Ready
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">
            PRECISION <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-axim-teal via-white to-axim-gold">EARNINGS.</span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            The enterprise-grade pay stub generator for modern B2B ecosystems. 
            Automated tax calculations, multi-state compliance, and secure delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/app/generator"
              className="group bg-axim-teal text-bg-void font-black text-lg px-10 py-5 rounded-2xl hover:bg-white transition-all duration-500 flex items-center gap-3 shadow-[0_0_30px_rgba(0,229,255,0.3)]"
            >
              Generate Now
              <SafeIcon icon={FiArrowRight} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-10 py-5 rounded-2xl border border-white/10 font-bold bg-white/5 hover:bg-white/10 transition-all">
              View Sample Stub
            </button>
          </div>
        </motion.div>
      </header>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-axim-teal/20 rounded-xl flex items-center justify-center text-axim-teal mb-6">
            <SafeIcon icon={FiCpu} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">AI Tax Engine</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Automatically calculates FICA, Medicare, and Federal Income Tax based on the latest 2024 progressive tax brackets.
          </p>
        </div>

        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-axim-gold/20 rounded-xl flex items-center justify-center text-axim-gold mb-6">
            <SafeIcon icon={FiShield} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">Data Sovereignty</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enterprise-grade encryption for all financial data. Sensitive PII is never stored on our servers; documents are generated at the edge.
          </p>
        </div>

        <div className="bg-glass border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6">
            <SafeIcon icon={FiFileText} size={24} />
          </div>
          <h3 className="text-xl font-bold mb-3">PDF Verification</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Produces high-fidelity, industry-standard PDF documents suitable for mortgage applications, rentals, and employment verification.
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