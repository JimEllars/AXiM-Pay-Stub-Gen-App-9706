import React from 'react';
import { usePayStubStore } from '../../store/usePayStubStore';

const InputField = ({ label, value, onChange, type = "text", placeholder, required, error }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex justify-between">{label} {required && <span className="text-red-500 text-[10px]">*</span>}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-black/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono`}
    />
  </div>
);

const EmployerSection = () => {
  const { employerDetails, updateEmployer } = usePayStubStore();

  return (
    <div className="space-y-8">
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-axim-teal mb-4 uppercase tracking-wider">Employer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Company Name" value={employerDetails.name} required error={!employerDetails.name} onChange={(v) => updateEmployer('name', v)} placeholder="Acme Corp" />
          <InputField label="EIN (Employer ID)" value={employerDetails.ein} onChange={(v) => {
            const numbers = v.replace(/\D/g, '');
            let formatted = numbers;
            if (numbers.length > 2) {
              formatted = `${numbers.slice(0, 2)}-${numbers.slice(2, 9)}`;
            }
            updateEmployer('ein', formatted.slice(0, 10));
          }} placeholder="XX-XXXXXXX" />
          <div className="md:col-span-2 grid grid-cols-[1fr_120px] gap-4">
            <InputField label="Company Address" value={employerDetails.address} onChange={(v) => updateEmployer('address', v)} placeholder="123 Business Rd, City, ST" />
            <InputField label="ZIP Code" value={employerDetails.zipCode || ''} onChange={(v) => {
              const numbers = v.replace(/\D/g, '');
              updateEmployer('zipCode', numbers.slice(0, 5));
            }} placeholder="12345" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerSection;
