import React from 'react';
import { usePayStubStore } from '../store/usePayStubStore';

const SummaryCard = () => {
  const { calculatedTotals } = usePayStubStore();
  const { currentGross, taxes, totalDeductions, netPay } = calculatedTotals;

  return (
    <div className="sticky top-8 bg-glass border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Live Summary</h3>
      
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
  );
};

export default SummaryCard;