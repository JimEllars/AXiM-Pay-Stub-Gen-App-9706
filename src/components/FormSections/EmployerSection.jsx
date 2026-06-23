import React, { useState } from 'react';
import { usePayStubStore } from '../../store/usePayStubStore';

const InputField = ({ label, value, onChange, type = "text", placeholder, required, error }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex justify-between">{label} {required && <span className="text-red-500 text-[10px]">*</span>}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`bg-black/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono`}
    />
  </div>
);

const EmployerSection = () => {
  const { employerDetails, updateEmployer } = usePayStubStore();
  const [isZipLoading, setIsZipLoading] = useState(false);
  const [logoError, setLogoError] = useState('');

  return (
    <div className="space-y-8">
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-axim-teal mb-4 uppercase tracking-wider">Employer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Company Name" value={employerDetails.name} required error={!employerDetails.name} onChange={(v) => updateEmployer('name', v)} placeholder="Acme Corp" maxLength={50} />
          <InputField label="EIN (Employer ID)" value={employerDetails.ein} onChange={(v) => {
            const numbers = v.replace(/\D/g, '');
            let formatted = numbers;
            if (numbers.length > 2) {
              formatted = `${numbers.slice(0, 2)}-${numbers.slice(2, 9)}`;
            }
            updateEmployer('ein', formatted.slice(0, 10));
          }} placeholder="XX-XXXXXXX" />
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">City</label>
             <input type="text" value={employerDetails.city || ''} onChange={(e) => updateEmployer('city', e.target.value)} placeholder="City" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono" />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">State</label>
             <input type="text" value={employerDetails.state || ''} onChange={(e) => updateEmployer('state', e.target.value)} placeholder="ST" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono" />
          </div>
          <div className="md:col-span-2 grid grid-cols-[1fr_120px] gap-4">
            <InputField label="Company Address" value={employerDetails.address} onChange={(v) => updateEmployer('address', v)} placeholder="123 Business Rd" />
            <div className="relative">
              <InputField label="ZIP Code" value={employerDetails.zipCode || ''} onChange={async (v) => {
                const numbers = v.replace(/\D/g, '');
                const zip = numbers.slice(0, 5);
                updateEmployer('zipCode', zip);

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
                         if (!employerDetails.state) updateEmployer('state', state);
                         if (!employerDetails.city) updateEmployer('city', city);
                      }
                    }
                  } catch (e) {
                    console.error('ZIP lookup failed', e);
                  } finally {
                    setIsZipLoading(false);
                  }
                }
              }} placeholder="12345" />
              {isZipLoading && (
                <div className="absolute right-3 top-9">
                  <div className="w-4 h-4 border-2 border-axim-teal/30 border-t-axim-teal rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-4 md:col-span-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex justify-between">Company Logo (Optional)</label>
            <input
              id="logo-upload-input"
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => {
                setLogoError('');
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 300 * 1024) {
                  setLogoError("Logo must be under 300KB");
                  e.target.value = '';
                  return;
                }
                if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
                  setLogoError('Only JPG or PNG images are supported.');
                  e.target.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                  setLogoError('');
                  updateEmployer('companyLogo', reader.result);
                };
                reader.readAsDataURL(file);
              }}
              className={`bg-black/50 border ${logoError ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-axim-teal file:text-black hover:file:bg-white`}
            />
            {logoError && <span className="text-red-500 text-xs mt-1">{logoError}</span>}
            {employerDetails.companyLogo && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    updateEmployer('companyLogo', null);
                    const fileInput = document.getElementById('logo-upload-input');
                    if (fileInput) fileInput.value = '';
                  }}
                  className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors"
                >
                  Remove Logo
                </button>
              </div>
            )}
          </div>

        </div>
          <div className="flex flex-col gap-1.5 mb-4 md:col-span-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex justify-between">Custom Memo / Notes (Optional, max 200 chars)</label>
            <textarea
              value={employerDetails.memo || ''}
              onChange={(e) => updateEmployer('memo', e.target.value.substring(0, 200))}
              placeholder="e.g., Q3 Bonus included"
              maxLength={200}
              rows={2}
              className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-axim-teal focus:ring-1 focus:ring-axim-teal transition-all font-mono resize-none"
            />
            <p className="text-[10px] text-gray-500 mt-1 italic">This note will appear at the bottom of the final document.</p>
          </div>
      </div>
    </div>
  );
};

export default EmployerSection;
