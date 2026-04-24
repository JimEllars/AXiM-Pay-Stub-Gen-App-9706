import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmployerSection from '../components/FormSections/EmployerSection';
import EmployeeSection from '../components/FormSections/EmployeeSection';
import FinancialsSection from '../components/FormSections/FinancialsSection';
import PreviewSection from '../components/FormSections/PreviewSection';
import SummaryCard from '../components/SummaryCard';
import { usePayStubStore } from '../store/usePayStubStore';
import PaymentModal from '../components/PaymentModal';

const STEPS = [
  { id: 1, title: 'Employer' },
  { id: 2, title: 'Employee' },
  { id: 3, title: 'Financials' },
  { id: 4, title: 'Preview & Pay' }
];

const Generator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const validateForm = usePayStubStore((state) => state.validateForm);

  const employerDetails = usePayStubStore((state) => state.employerDetails);
  const employeeDetails = usePayStubStore((state) => state.employeeDetails);
  const payPeriod = usePayStubStore((state) => state.payPeriod);

  const isNextDisabled = () => {
    if (currentStep === 1) return !employerDetails.name;
    if (currentStep === 2) return !(employeeDetails.name && payPeriod.startDate && payPeriod.endDate);
    return !validateForm();
  };


  const renderStep = () => {
    switch (currentStep) {
      case 1: return <EmployerSection />;
      case 2: return <EmployeeSection />;
      case 3: return <FinancialsSection />;
      case 4: return <PreviewSection onFinalize={() => setPaymentModalOpen(true)} />;
      default: return <EmployerSection />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-void text-white font-sans selection:bg-axim-teal selection:text-black">
      
      {/* Top Progress Bar */}
      <div className="w-full h-1 bg-white/10 fixed top-0 left-0 z-50">
        <motion.div 
          className="h-full bg-axim-teal" 
          initial={{ width: '25%' }}
          animate={{ width: `${(currentStep / 4) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 lg:flex lg:gap-12">
        
        {/* Left Column - Form Content (70%) */}
        <div className="lg:w-[70%] mb-24 lg:mb-0">
          
          {/* Step Navigation */}
          <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6 overflow-x-auto">
            {STEPS.map((step) => (
              <button 
                key={step.id}
                onClick={() => { if (step.id < currentStep || !isNextDisabled()) setCurrentStep(step.id); }}
                className={`flex items-center gap-3 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  currentStep === step.id 
                    ? 'bg-axim-teal/10 text-axim-teal border border-axim-teal/30' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${currentStep === step.id ? 'bg-axim-teal text-black' : 'bg-white/10'}`}>
                  {step.id}
                </span>
                {step.title}
              </button>
            ))}
          </div>

          {/* Animated Form Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          {currentStep < 4 && (
            <div className="mt-10 flex justify-end">
              <button 
                onClick={() => setCurrentStep(prev => Math.min(prev + 1, 4))}
                className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-axim-teal hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-none"
                disabled={isNextDisabled()}
              >
                Next Step
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Live Summary (30%) */}
        <div className="lg:w-[30%]">
          <SummaryCard />
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
      />
    </div>
  );
};

export default Generator;