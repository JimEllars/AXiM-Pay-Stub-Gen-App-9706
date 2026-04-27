import React, { useState } from 'react';
import { usePayStubStore } from '../../store/usePayStubStore';
import { PAY_FREQUENCIES } from '../../utils/constants';

const InputField = ({ label, value, onChange, type = "text", placeholder, required, error, maxLength }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex justify-between">{label} {required && <span className="text-red-500 text-[10px]">*</span>}</label>
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`bg-black/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono`}
    />
  </div>
);

const EmployeeSection = () => {
  const { employeeDetails, updateEmployee, payPeriod, updatePayPeriod } = usePayStubStore();
  const [isZipLoading, setIsZipLoading] = useState(false);

  return (
    <div className="space-y-8">
      {/* Employee Details */}
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-axim-teal mb-4 uppercase tracking-wider">Employee Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Full Name" value={employeeDetails.name} required error={!employeeDetails.name} onChange={(v) => updateEmployee('name', v)} placeholder="John Doe" />
          <InputField label="SSN (Last 4 digits)" value={employeeDetails.ssnLast4 || ''} onChange={(v) => {
            const numbers = v.replace(/\D/g, '');
            updateEmployee('ssnLast4', numbers.slice(0, 4));
          }} placeholder="1234" maxLength={4} />
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">City</label>
             <input type="text" value={employeeDetails.city || ''} onChange={(e) => updateEmployee('city', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono" />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">State</label>
             <input type="text" value={employeeDetails.state} onChange={(e) => updateEmployee('state', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono" />
          </div>
          <div className="md:col-span-2 grid grid-cols-[1fr_120px] gap-4">
            <InputField label="Home Address" value={employeeDetails.address} onChange={(v) => updateEmployee('address', v)} placeholder="456 Residential Way" />
            <div className="relative">
              <InputField label="ZIP Code" value={employeeDetails.zipCode || ''} onChange={async (v) => {
                const numbers = v.replace(/\D/g, '');
                const zip = numbers.slice(0, 5);
                updateEmployee('zipCode', zip);

                if (zip.length === 5) {
                  setIsZipLoading(true);
                  try {
                    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
                    if (res.ok) {
                      const data = await res.json();
                      const place = data.places[0];
                      if (place) {
                         const city = place['place name'];
                         const state = place['state abbreviation'];
                         updateEmployee('state', state);
                         updateEmployee('city', city);
                      }
                    } else {
                      throw new Error('ZIP not found');
                    }
                  } catch (e) {
                    console.error('ZIP lookup failed', e);
                    fetch('/api/v1/telemetry/ingest', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ event: "zip_lookup_failed", zipCode: zip, error: e.message })
                    }).catch(console.error);
                  } finally {
                    setIsZipLoading(false);
                  }
                }
              }} placeholder="12345" maxLength={5} />
              {isZipLoading && (
                <div className="absolute right-3 top-9">
                  <div className="w-4 h-4 border-2 border-axim-teal/30 border-t-axim-teal rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Marital Status</label>
             <select value={employeeDetails.maritalStatus} onChange={(e) => updateEmployee('maritalStatus', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono">
               <option value="single">Single</option>
               <option value="married">Married</option>
             </select>
          </div>
        </div>
      </div>

      {/* Pay Period Details */}
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-axim-teal mb-4 uppercase tracking-wider">Pay Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Frequency</label>
             <select value={payPeriod.frequency} onChange={(e) => updatePayPeriod('frequency', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono">
               {Object.entries(PAY_FREQUENCIES).map(([key, {label}]) => (
                 <option key={key} value={key}>{label}</option>
               ))}
             </select>
          </div>
          <InputField label="Pay Date" type="date" value={payPeriod.payDate} onChange={(v) => updatePayPeriod('payDate', v)} />
          <InputField label="Start Date" type="date" value={payPeriod.startDate} required error={!payPeriod.startDate} onChange={(v) => updatePayPeriod('startDate', v)} />
          <InputField label="End Date" type="date" value={payPeriod.endDate} required error={!payPeriod.endDate} onChange={(v) => updatePayPeriod('endDate', v)} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeSection;
