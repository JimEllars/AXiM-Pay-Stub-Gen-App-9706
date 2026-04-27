import React, { useState } from 'react';
import { usePayStubStore } from '../store/usePayStubStore';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SummaryCard = () => {
  const { calculatedTotals, employerDetails, employeeDetails } = usePayStubStore();
  const { currentGross, taxes, totalDeductions, netPay } = calculatedTotals;
  const [isExpanded, setIsExpanded] = useState(false);

  const isMortgageReady =
    employerDetails?.ein?.length >= 9 &&
    employeeDetails?.ssnLast4?.length >= 4 &&
    employerDetails?.address?.length > 5 &&
    employeeDetails?.address?.length > 5;


  return (
    <>
      {/* Desktop Version */}
      <div className="hidden lg:block sticky top-8 bg-glass border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Live Summary</h3>

        <div className={`mb-6 p-3 rounded-lg border flex items-center gap-3 ${isMortgageReady ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
          <div className={`w-3 h-3 rounded-full ${isMortgageReady ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-gray-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest">{isMortgageReady ? 'Mortgage/Rental Ready' : 'Draft Mode'}</span>
            <span className="text-[9px] opacity-70">{isMortgageReady ? 'All required verification fields complete' : 'Missing EIN, SSN, or Address data'}</span>
          </div>
        </div>


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
