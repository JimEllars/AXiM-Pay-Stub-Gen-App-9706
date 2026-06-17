import React, { useState } from 'react';
import { usePayStubStore } from '../store/usePayStubStore';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SummaryCard = () => {
  const { calculatedTotals, employerDetails, employeeDetails, payPeriod, setCurrentStep } = usePayStubStore();
  const { currentGross, taxes, totalDeductions, netPay } = calculatedTotals;
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date().setHours(0, 0, 0, 0);
  const payDateObj = payPeriod?.payDate ? new Date(payPeriod.payDate + 'T00:00:00').getTime() : null;
  const isPayDateValid = payDateObj && payDateObj <= today;

  const isMortgageReady =
    employerDetails?.ein?.length >= 9 &&
    employeeDetails?.ssnLast4?.length >= 4 &&
    employerDetails?.address?.length > 5 &&
    employeeDetails?.address?.length > 5 &&
    isPayDateValid &&
    calculatedTotals?.currentGross > 0;

  const isProgressiveState = employeeDetails?.state && ['CA', 'NY'].includes(employeeDetails.state.toUpperCase());
  const { hasDeductionOverflow } = usePayStubStore();

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden lg:block sticky top-8 bg-glass border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Live Summary</h3>


        <div className={`mb-6 p-3 rounded-lg border ${isMortgageReady ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className="flex flex-col gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isMortgageReady ? 'text-green-400' : 'text-gray-400'}`}>
              {isMortgageReady ? 'Mortgage/Rental Ready' : 'Document Checklist'}
            </span>
            <div className="flex flex-col gap-1 text-[9px] opacity-80">
               <button
                 aria-label="Address OK Checklist Item" role="button" aria-pressed={(employerDetails?.address?.length > 5 && employeeDetails?.address?.length > 5) ? "true" : "false"}
                 tabIndex={0}
                 onClick={() => { if (!(employerDetails?.address?.length > 5)) setCurrentStep(1); else if (!(employeeDetails?.address?.length > 5)) setCurrentStep(2); }}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!(employerDetails?.address?.length > 5)) setCurrentStep(1); else if (!(employeeDetails?.address?.length > 5)) setCurrentStep(2); } }}
                 className="flex items-center gap-1 hover:opacity-100 transition-opacity text-left focus:outline-none"
               >
                 <div className={`w-2 h-2 rounded-full ${(employerDetails?.address?.length > 5 && employeeDetails?.address?.length > 5) ? 'bg-green-400' : 'bg-gray-500'}`} />
                 <span className={(employerDetails?.address?.length > 5 && employeeDetails?.address?.length > 5) ? 'text-green-400' : 'text-gray-400 hover:text-white'}>Address OK</span>
               </button>
               <button
                 aria-label="Tax ID OK Checklist Item" role="button" aria-pressed={(employerDetails?.ein?.length >= 9 && employeeDetails?.ssnLast4?.length >= 4) ? "true" : "false"}
                 tabIndex={0}
                 onClick={() => { if (!(employerDetails?.ein?.length >= 9)) setCurrentStep(1); else if (!(employeeDetails?.ssnLast4?.length >= 4)) setCurrentStep(2); }}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!(employerDetails?.ein?.length >= 9)) setCurrentStep(1); else if (!(employeeDetails?.ssnLast4?.length >= 4)) setCurrentStep(2); } }}
                 className="flex items-center gap-1 hover:opacity-100 transition-opacity text-left focus:outline-none"
               >
                 <div className={`w-2 h-2 rounded-full ${(employerDetails?.ein?.length >= 9 && employeeDetails?.ssnLast4?.length >= 4) ? 'bg-green-400' : 'bg-gray-500'}`} />
                 <span className={(employerDetails?.ein?.length >= 9 && employeeDetails?.ssnLast4?.length >= 4) ? 'text-green-400' : 'text-gray-400 hover:text-white'}>Tax ID OK</span>
               </button>
               <button
                 aria-label="Pay Date OK Checklist Item" role="button" aria-pressed={isPayDateValid ? "true" : "false"}
                 tabIndex={0}
                 onClick={() => { if (!isPayDateValid) setCurrentStep(2); }}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isPayDateValid) setCurrentStep(2); } }}
                 className="flex items-center gap-1 hover:opacity-100 transition-opacity text-left focus:outline-none"
               >
                 <div className={`w-2 h-2 rounded-full ${isPayDateValid ? 'bg-green-400' : 'bg-gray-500'}`} />
                 <span className={isPayDateValid ? 'text-green-400' : 'text-gray-400 hover:text-white'}>Pay Date OK</span>
               </button>
               <button
                 aria-label="Gross Pay OK Checklist Item" role="button" aria-pressed={(calculatedTotals?.currentGross > 0) ? "true" : "false"}
                 tabIndex={0}
                 onClick={() => { if (!(calculatedTotals?.currentGross > 0)) setCurrentStep(3); }}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!(calculatedTotals?.currentGross > 0)) setCurrentStep(3); } }}
                 className="flex items-center gap-1 hover:opacity-100 transition-opacity text-left focus:outline-none"
               >
                 <div className={`w-2 h-2 rounded-full ${(calculatedTotals?.currentGross > 0) ? 'bg-green-400' : 'bg-gray-500'}`} />
                 <span className={(calculatedTotals?.currentGross > 0) ? 'text-green-400' : 'text-gray-400 hover:text-white'}>Gross Pay OK</span>
               </button>
            </div>
            {isMortgageReady && (
              <span className="text-[9px] text-green-400 mt-1 opacity-90 border-t border-green-500/30 pt-1">Document meets standard requirements for rental or loan applications.</span>
            )}
          </div>
        </div>



        {isProgressiveState && (
          <div className="mb-6 p-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 text-xs flex items-start gap-2">
            <span className="font-bold flex-shrink-0">Tax Accuracy Warning:</span>
            <span>You selected {employeeDetails.state}, which has a progressive tax structure. Tax estimates shown here may vary from exact CPA values. Please verify values manually if needed.</span>
          </div>
        )}

        {hasDeductionOverflow && (
          <div className="mb-6 p-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 text-xs flex items-start gap-2">
            <span className="font-bold flex-shrink-0">Warning:</span>
            <span>Total deductions exceed gross period compensation. Net pay has been clamped to $0.00. Please review adjustments.</span>
          </div>
        )}

        <div className="space-y-4 font-mono text-sm">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="text-gray-400">Gross Pay</span>
            <span className="text-white">${currentGross.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-gray-400">
            <span>Social Security</span>
            <span>-${taxes.socialSecurity.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-400">
            <span>Medicare</span>
            <span>-${taxes.medicare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-400">
            <span>Federal Income Tax</span>
            <span>-${taxes.federalIncomeTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-400 border-b border-white/10 pb-2">
            <span>State Tax</span>
            <span>-${taxes.stateIncomeTax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="text-gray-400">Total Deductions</span>
            <span className="text-red-400">-${totalDeductions.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 text-lg font-bold">
            <span className="text-white">Net Pay</span>
            <span className="text-axim-gold">${netPay.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Mobile Version (Sticky Bottom Bar) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-void/90 border-t border-white/10 backdrop-blur-md pb-safe">
        {/* Expanded View */}
        {isExpanded && (
          <div className="p-4 border-b border-white/5 space-y-3 font-mono text-xs bg-black/50">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gross Pay</span>
              <span className="text-white">${currentGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Social Security</span>
              <span>-${taxes.socialSecurity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Medicare</span>
              <span>-${taxes.medicare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Federal Income Tax</span>
              <span>-${taxes.federalIncomeTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>State Tax</span>
              <span>-${taxes.stateIncomeTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Deductions</span>
              <span className="text-red-400">-${totalDeductions.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Compact View / Header */}
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-sm font-bold uppercase tracking-wider text-white">Net Pay</span>
            {isExpanded ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />}
          </button>

          <div className="text-xl font-bold font-mono text-axim-gold">
            ${netPay.toFixed(2)}
          </div>
        </div>
      </div>
    </>
  );
};

export default SummaryCard;
