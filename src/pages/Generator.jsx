import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmployerSection from '../components/FormSections/EmployerSection';
import EmployeeSection from '../components/FormSections/EmployeeSection';
import FinancialsSection from '../components/FormSections/FinancialsSection';
import PreviewSection from '../components/FormSections/PreviewSection';
import SummaryCard from '../components/SummaryCard';
import { usePayStubStore } from '../store/usePayStubStore';
import { useEffect } from 'react';
import { FiLoader, FiAlertTriangle } from 'react-icons/fi';
import PaymentModal from '../components/PaymentModal';

const STEPS = [
  { id: 1, title: 'Employer' },
  { id: 2, title: 'Employee' },
  { id: 3, title: 'Financials' },
  { id: 4, title: 'Preview & Pay' }
];

const Generator = () => {
  const storeState = usePayStubStore();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    // Only generate preview if we have some basic data
    if (!storeState.employerDetails.name && !storeState.employeeDetails.name) return;

    const generatePreview = async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch('/api/generate-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employerDetails: storeState.employerDetails,
            employeeDetails: storeState.employeeDetails,
            payPeriod: storeState.payPeriod,
            earnings: storeState.earnings,
            customDeductions: storeState.customDeductions,
            calculatedTotals: storeState.calculatedTotals
          }),
        });

        if (response.status === 429) {
           setPreviewError("Too many preview requests. Please wait a moment.");
           return;
        }

        if (!response.ok) {
          throw new Error('Failed to generate preview');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.error("Preview generation error:", err);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const handler = setTimeout(() => {
      generatePreview();
    }, 1000);

    return () => clearTimeout(handler);
  }, [
    storeState.employerDetails,
    storeState.employeeDetails,
    storeState.payPeriod,
    storeState.earnings,
    storeState.customDeductions,
    storeState.calculatedTotals
  ]);
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

      <div className="max-w-screen-2xl mx-auto px-4 py-12 md:py-20 lg:flex lg:gap-12">
        
        {/* Left Column - Form Content (70%) */}
        <div className="lg:w-1/2 mb-24 lg:mb-0">
          
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

        <div className="lg:w-1/2 hidden lg:flex flex-col gap-6 sticky top-24 h-[calc(100vh-8rem)]">
          <SummaryCard />
          <div className="flex-1 bg-glass border border-white/10 rounded-xl backdrop-blur-md overflow-hidden relative flex flex-col">
            <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center z-10">
              <h3 className="text-sm font-bold text-axim-teal uppercase tracking-wider flex items-center gap-2">
                Live Preview
                {isPreviewLoading && <FiLoader className="animate-spin text-axim-gold" />}
              </h3>
            </div>

            <div className="flex-1 bg-[#525659] relative w-full h-full flex items-center justify-center">
               {previewError && (
                 <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
                    <FiAlertTriangle className="text-axim-gold text-4xl mb-4" />
                    <p className="text-white font-bold">{previewError}</p>
                 </div>
               )}
               {previewUrl ? (
                 <iframe
                   src={previewUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
                   className="w-full h-full absolute inset-0 z-0 border-none"
                   title="PDF Preview"
                 />
               ) : (
                 <div className="text-gray-400 text-sm flex flex-col items-center">
                    {!isPreviewLoading && "Start typing to generate preview"}
                 </div>
               )}
               {isPreviewLoading && previewUrl && (
                  <div className="absolute top-4 right-4 bg-black/60 rounded-full p-2 backdrop-blur z-20">
                    <FiLoader className="animate-spin text-axim-teal" />
                  </div>
               )}
            </div>
          </div>
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