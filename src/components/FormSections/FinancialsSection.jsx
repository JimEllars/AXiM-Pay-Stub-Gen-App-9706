import React from 'react';
import { usePayStubStore } from '../../store/usePayStubStore';
import SafeIcon from '../../common/SafeIcon';
import { FiPlus, FiTrash2, FiInfo, FiTrendingUp, FiCreditCard, FiRefreshCw } from 'react-icons/fi';

const FinancialsSection = () => {
  const { 
    earnings, addEarning, updateEarning, removeEarning, 
    customDeductions, addCustomDeduction, updateCustomDeduction, removeCustomDeduction,
    calculatedTotals, taxOverrides, updateTaxOverride, resetTaxOverride, updateYtdGross, autoCalculate, toggleAutoCalculate
  } = usePayStubStore();

  return (
    <div className="space-y-8 pb-10">
      {/* Earnings Section */}
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-axim-teal/20 p-2 rounded-lg">
              <SafeIcon icon={FiTrendingUp} className="text-axim-teal" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Earnings</h2>
          </div>
          <button onClick={addEarning} className="flex items-center gap-2 text-sm font-bold text-axim-teal hover:text-white transition-colors">
            <SafeIcon icon={FiPlus} /> Add Earning
          </button>
        </div>

        <div className="space-y-4">
          <div className="hidden md:grid grid-cols-12 gap-4 px-2 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <div className="col-span-4">Type</div>
            <div className="col-span-3">Hours</div>
            <div className="col-span-3">Rate/Amount</div>
            <div className="col-span-2"></div>
          </div>
          {earnings.map((earning) => (
            <div key={earning.id} className="grid grid-cols-12 gap-4 items-center group">
              <div className="col-span-12 md:col-span-4">
                <select 
                  value={earning.type} 
                  onChange={(e) => updateEarning(earning.id, 'type', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-axim-teal outline-none transition-all"
                >
                  <option value="Regular">Regular Pay</option>
                  <option value="Overtime">Overtime (1.5x)</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Commission">Commission</option>
                  <option value="Holiday">Holiday Pay</option>
                </select>
              </div>
              <div className="col-span-12 md:col-span-3">
                <input 
                  type="number" step="0.01" placeholder="Hours"
                  value={earning.hours || ''}
                  onChange={(e) => updateEarning(earning.id, 'hours', e.target.value)}
                  disabled={earning.type === 'Bonus' || earning.type === 'Commission'}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-axim-teal outline-none disabled:opacity-30 transition-all"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">$</span>
                  <input 
                    type="number" step="0.01" placeholder="Rate"
                    value={earning.rate || ''}
                    onChange={(e) => updateEarning(earning.id, 'rate', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm font-mono focus:border-axim-teal outline-none transition-all"
                  />
                </div>
              </div>
              <div className="col-span-12 md:col-span-2 text-right">
                {earnings.length > 1 && (
                  <button onClick={() => removeEarning(earning.id)} className="text-red-400/50 hover:text-red-400 p-2 transition-colors">
                    <SafeIcon icon={FiTrash2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deductions Section */}
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-axim-gold/20 p-2 rounded-lg">
              <SafeIcon icon={FiCreditCard} className="text-axim-gold" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Custom Deductions</h2>
          </div>
          <button onClick={addCustomDeduction} className="flex items-center gap-2 text-sm font-bold text-axim-gold hover:text-white transition-colors">
            <SafeIcon icon={FiPlus} /> Add Deduction
          </button>
        </div>

        <div className="space-y-4">
          {customDeductions.map((deduction) => (
            <div key={deduction.id} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-12 md:col-span-6">
                <input 
                  type="text" placeholder="e.g. Health Insurance"
                  value={deduction.name}
                  onChange={(e) => updateCustomDeduction(deduction.id, 'name', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-axim-teal outline-none transition-all"
                />
              </div>
              <div className="col-span-10 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">$</span>
                  <input 
                    type="number" step="0.01" placeholder="Amount"
                    value={deduction.amount || ''}
                    onChange={(e) => updateCustomDeduction(deduction.id, 'amount', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm font-mono focus:border-axim-teal outline-none transition-all"
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-2 text-right">
                <button onClick={() => removeCustomDeduction(deduction.id)} className="text-red-400/50 hover:text-red-400 p-2 transition-colors">
                  <SafeIcon icon={FiTrash2} />
                </button>
              </div>
            </div>
          ))}
          {customDeductions.length === 0 && (
            <p className="text-center text-gray-500 text-xs py-4 border border-dashed border-white/10 rounded-lg">No custom deductions added.</p>
          )}
        </div>
      </div>

      {/* Taxes Override Section */}
      <div className="bg-glass border border-white/10 p-6 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-axim-teal uppercase tracking-wider">Taxes (Auto-Calculated)</h2>
          <div className="group relative">
            <SafeIcon icon={FiInfo} className="text-gray-500 cursor-help" size={14} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-white/10 text-[10px] text-gray-400 rounded hidden group-hover:block z-20">
              Tax estimates are based on 2024 progressive brackets. You may manually edit these to match exact records.
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auto-Calculate</span>
            <button
              onClick={() => toggleAutoCalculate(!autoCalculate)}
              className={`w-10 h-5 rounded-full relative transition-colors ${autoCalculate ? 'bg-axim-teal' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoCalculate ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries({
            socialSecurity: 'Social Security',
            medicare: 'Medicare',
            federalIncomeTax: 'Federal (FIT)',
            stateIncomeTax: 'State Tax'
          }).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center mb-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>{taxOverrides[key] && <button onClick={() => resetTaxOverride(key)} className="text-[9px] text-axim-gold hover:text-white flex items-center gap-1 transition-colors"><SafeIcon icon={FiRefreshCw} size={10} /> Reset</button>}</div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">$</span>
                <input 
                  type="number" step="0.01"
                  value={calculatedTotals.taxes[key] || ''}
                  onChange={(e) => updateTaxOverride(key, e.target.value)}
                  className={`w-full bg-black/50 border ${taxOverrides[key] ? 'border-axim-gold/50' : 'border-white/10'} rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:border-axim-teal outline-none font-mono transition-all`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Prior YTD Gross (Optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">$</span>
              <input 
                type="number" step="0.01"
                value={calculatedTotals.ytdGross || ''}
                onChange={(e) => updateYtdGross(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:border-axim-teal outline-none font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 italic">Used to stop FICA tax if $168,600 limit is reached.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsSection;