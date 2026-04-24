import React from 'react';
import { usePayStubStore } from '../../store/usePayStubStore';
import SafeIcon from '../../common/SafeIcon';
import { FiDownload, FiLock } from 'react-icons/fi';

const PreviewSection = ({ onFinalize }) => {
  const { employerDetails, employeeDetails, payPeriod, earnings, customDeductions, calculatedTotals, validateForm } = usePayStubStore();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Hardened Professional Watermark Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 overflow-hidden mix-blend-multiply select-none" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.03) 100px, rgba(0,0,0,0.03) 200px)' }}>
           {[...Array(30)].map((_, i) => (
             <div
               key={i}
               className="transform text-black font-black uppercase tracking-tighter whitespace-nowrap opacity-[0.08]"
               style={{
                 fontSize: `${Math.random() * 3 + 2}vw`,
                 rotate: `${(Math.random() - 0.5) * 60}deg`,
                 margin: `${Math.random() * 20 - 10}px 0`,
                 marginLeft: `${Math.random() * 40 - 20}%`,
                 textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
                 position: 'relative',
                 zIndex: Math.random() > 0.5 ? 1 : 30 // weave it through the content
               }}
             >
               SAMPLE / DRAFT ONLY - NOT VALID FOR VERIFICATION
             </div>
           ))}
        </div>
        <div className="relative z-20 select-none">
          {/* Stub Header */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-black/10 pb-8 mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">{employerDetails.name || 'UNSPECIFIED COMPANY'}</h1>
              <p className="text-xs font-mono text-gray-500 max-w-xs">{employerDetails.address || 'COMPANY ADDRESS NOT SET'}</p>
              {employerDetails.ein && <p className="text-[10px] font-mono text-gray-400 mt-1">EIN: {employerDetails.ein}</p>}
            </div>
            <div className="text-left md:text-right font-mono text-[10px] flex flex-col gap-1 uppercase tracking-wider">
              <p className="bg-black text-white px-3 py-1 font-bold mb-2 inline-block ml-auto">Earnings Statement</p>
              <p><span className="text-gray-400">Pay Frequency:</span> {payPeriod.frequency}</p>
              <p><span className="text-gray-400">Period:</span> {payPeriod.startDate || 'N/A'} - {payPeriod.endDate || 'N/A'}</p>
              <p><span className="text-gray-400">Pay Date:</span> {payPeriod.payDate || 'N/A'}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-5 rounded-lg border border-black/5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Employee Details</p>
              <p className="font-bold text-xl tracking-tight">{employeeDetails.name || 'EMPLOYEE NAME'}</p>
              <p className="text-xs font-mono text-gray-500 mt-1 leading-relaxed">{employeeDetails.address || 'HOME ADDRESS'}</p>
            </div>
            <div className="flex flex-col justify-center font-mono text-[10px] uppercase">
               <div className="flex justify-between border-b border-black/5 py-1">
                 <span className="text-gray-400">Marital Status</span>
                 <span>{employeeDetails.maritalStatus}</span>
               </div>
               <div className="flex justify-between border-b border-black/5 py-1">
                 <span className="text-gray-400">State Tax Code</span>
                 <span>{employeeDetails.state} - 01</span>
               </div>
            </div>
          </div>

          {/* Table Header Labels */}
          <div className="grid grid-cols-2 gap-12 mb-2 font-black text-[10px] uppercase tracking-widest text-gray-400">
            <div>Income Description</div>
            <div>Deductions & Taxes</div>
          </div>

          {/* Financial Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
            {/* Earnings Column */}
            <div className="space-y-2">
              <div className="space-y-1.5 font-mono text-[11px]">
                {earnings.map(e => (
                  <div key={e.id} className="flex justify-between items-center py-1 border-b border-black/5">
                    <span className="text-gray-600">{e.type} {e.hours > 0 ? `@ ${e.hours}h` : ''}</span>
                    <span className="font-bold">${e.currentTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-sm pt-4 border-t-2 border-black/10 mt-4 uppercase">
                <span>Gross Pay</span>
                <span>${calculatedTotals.currentGross.toFixed(2)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="space-y-2">
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-gray-600">FICA - Social Security</span>
                  <span>-${calculatedTotals.taxes.socialSecurity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-gray-600">FICA - Medicare</span>
                  <span>-${calculatedTotals.taxes.medicare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-gray-600">Fed Income Tax (FIT)</span>
                  <span>-${calculatedTotals.taxes.federalIncomeTax.toFixed(2)}</span>
                </div>
                {calculatedTotals.taxes.stateIncomeTax > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-black/5">
                    <span className="text-gray-600">State Income Tax</span>
                    <span>-${calculatedTotals.taxes.stateIncomeTax.toFixed(2)}</span>
                  </div>
                )}
                {customDeductions.map(d => (
                  <div key={d.id} className="flex justify-between items-center py-1 border-b border-black/5">
                    <span className="text-gray-600">{d.name}</span>
                    <span>-${(d.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-sm pt-4 border-t-2 border-black/10 mt-4 uppercase">
                <span>Total Deductions</span>
                <span className="text-red-600">-${calculatedTotals.totalDeductions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Footer */}
          <div className="bg-black text-white p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiLock} className="text-axim-teal" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Employee Take-Home</p>
                <p className="text-xl font-black tracking-tight uppercase">Net Pay Amount</p>
              </div>
            </div>
            <div className="text-3xl md:text-5xl font-black font-mono tracking-tighter">
              ${calculatedTotals.netPay.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-glass border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="text-sm text-gray-400 font-light max-w-sm">
          Once finalized, you will be redirected to our secure payment gateway to unlock the unmarked, high-resolution PDF.
        </div>

        <button
          onClick={async () => {
            const formData = usePayStubStore.getState();
            try {
              const res = await fetch('/api/generate-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData })
              });
              if (!res.ok) throw new Error("Preview generation failed");
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              window.open(url, '_blank');
              setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            } catch (err) {
              alert("Failed to generate preview: " + err.message);
            }
          }}
          className="group w-full sm:w-auto bg-transparent border border-axim-teal text-axim-teal font-black px-10 py-5 rounded-2xl hover:bg-axim-teal hover:text-bg-void transition-all duration-500 flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(0,229,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!validateForm()}
        >
          Preview Draft
        </button>
        <button 
          onClick={onFinalize}

          className="group w-full sm:w-auto bg-axim-teal text-bg-void font-black px-10 py-5 rounded-2xl hover:bg-white transition-all duration-500 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,229,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-axim-teal"
          disabled={!validateForm()}
        >
          <SafeIcon icon={FiDownload} />
          Finalize & Download
        </button>
      </div>
    </div>
  );
};

export default PreviewSection;