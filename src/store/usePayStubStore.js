import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PAY_FREQUENCIES, STANDARD_DEDUCTION_2024 } from '../utils/constants';

const TAX_RATES = {
  SOCIAL_SECURITY: 0.062,
  MEDICARE: 0.0145,
  MEDICARE_SURCHARGE: 0.009,
  MEDICARE_THRESHOLD: 200000,
  SS_WAGE_BASE: 168600
};

const initialFormState = {
  ytdGrossOverridden: false,
  employerDetails: { name: '', address: '', ein: '' },
  employeeDetails: { name: '', address: '', maritalStatus: 'single', state: 'TX' },
  payPeriod: { frequency: 'bi-weekly', startDate: '', endDate: '', payDate: '' },
  earnings: [
    { id: '1', type: 'Regular', hours: 40, rate: 0.00, currentTotal: 0.00, ytdTotal: 0.00 }
  ],
  customDeductions: [],
  taxOverrides: { socialSecurity: false, medicare: false, federalIncomeTax: false, stateIncomeTax: false },
  autoCalculate: true,
  calculatedTotals: {
    currentGross: 0.00,
    ytdGross: 0.00,
    taxes: { socialSecurity: 0.00, medicare: 0.00, federalIncomeTax: 0.00, stateIncomeTax: 0.00 },
    totalDeductions: 0.00,
    netPay: 0.00
  }
};

export const usePayStubStore = create(persist((set, get) => ({
  ...initialFormState,

  // PHASE 3: Re-hydration for Post-Checkout Workflow

  validateForm: () => {
    const state = get();
    return !!(
      state.employerDetails.name &&
      state.employeeDetails.name &&
      state.payPeriod.startDate &&
      state.payPeriod.endDate
    );
  },



  toggleAutoCalculate: (value) => {
    set({ autoCalculate: value });
    if (value) {
      // reset overrides if turning ON auto-calculate
      set({ taxOverrides: { socialSecurity: false, medicare: false, federalIncomeTax: false, stateIncomeTax: false } });
      get().recalculateAll();
    }
  },

  hydrateStore: (data) => {
    if (!data) return;
    set({ ...data });
  },

  updateEmployer: (field, value) => set((state) => ({ employerDetails: { ...state.employerDetails, [field]: value } })),
  updateEmployee: (field, value) => {
    set((state) => ({ employeeDetails: { ...state.employeeDetails, [field]: value } }));
    get().recalculateAll();
  },


  updatePayPeriod: (field, value) => {
    set((state) => {
      const newPayPeriod = { ...state.payPeriod, [field]: value };

      if (field === 'startDate' || field === 'frequency') {
        const startDate = field === 'startDate' ? value : newPayPeriod.startDate;
        if (startDate) {
          // Parse YYYY-MM-DD safely into parts to avoid timezone offset issues
          const [year, month, day] = startDate.split('-').map(Number);
          // Create date in local timezone to safely manipulate
          const start = new Date(year, month - 1, day);
          let daysToAdd = 0;

          if (newPayPeriod.frequency === 'weekly') {
            daysToAdd = 6;
          } else if (newPayPeriod.frequency === 'bi-weekly') {
            daysToAdd = 13;
          } else if (newPayPeriod.frequency === 'semi-monthly') {
            daysToAdd = 14;
          } else if (newPayPeriod.frequency === 'monthly') {
            // End of the month
            const end = new Date(year, month, 0); // 0th day of next month is last day of current month

            // formatting helper
            const formatD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            newPayPeriod.endDate = formatD(end);

            const payD = new Date(end);
            payD.setDate(payD.getDate() + 2);
            newPayPeriod.payDate = formatD(payD);
            return { payPeriod: newPayPeriod };
          }

          if (daysToAdd > 0) {
            const end = new Date(start);
            end.setDate(end.getDate() + daysToAdd);

            const formatD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            newPayPeriod.endDate = formatD(end);

            const payD = new Date(end);
            payD.setDate(payD.getDate() + 2);
            newPayPeriod.payDate = formatD(payD);
          }
        }
      }
      return { payPeriod: newPayPeriod };
    });
    get().recalculateAll();
  },
addEarning: () => set((state) => ({
    earnings: [...state.earnings, { id: Date.now().toString(), type: 'Custom', hours: 0, rate: 0, currentTotal: 0, ytdTotal: 0 }]
  })),

  updateEarning: (id, field, value) => {
    set((state) => ({
      earnings: state.earnings.map(e => e.id === id ? { ...e, [field]: field === 'type' ? value : (parseFloat(value) || 0) } : e)
    }));
    get().recalculateAll();
  },

  removeEarning: (id) => {
    set((state) => ({ earnings: state.earnings.filter(e => e.id !== id) }));
    get().recalculateAll();
  },

  addCustomDeduction: () => {
    set((state) => ({ customDeductions: [...state.customDeductions, { id: Date.now().toString(), name: 'New Deduction', amount: 0 }] }));
    get().recalculateAll();
  },

  updateCustomDeduction: (id, field, value) => {
    set((state) => ({
      customDeductions: state.customDeductions.map(d => d.id === id ? { ...d, [field]: field === 'name' ? value : (parseFloat(value) || 0) } : d)
    }));
    get().recalculateAll();
  },

  removeCustomDeduction: (id) => {
    set((state) => ({ customDeductions: state.customDeductions.filter(d => d.id !== id) }));
    get().recalculateAll();
  },

  updateTaxOverride: (taxType, amount) => {
    set((state) => ({
      autoCalculate: false,
      taxOverrides: { ...state.taxOverrides, [taxType]: true },
      calculatedTotals: { ...state.calculatedTotals, taxes: { ...state.calculatedTotals.taxes, [taxType]: parseFloat(amount) || 0 } }
    }));
    get().recalculateNetPay();
  },

  resetTaxOverride: (taxType) => {
    set((state) => ({ taxOverrides: { ...state.taxOverrides, [taxType]: false } }));
    get().recalculateAll();
  },

  updateYtdGross: (amount) => {
    set((state) => ({
      ytdGrossOverridden: true,
      calculatedTotals: { ...state.calculatedTotals, ytdGross: parseFloat(amount) || 0 }
    }));
    get().recalculateAll();
  },

  calculateGrossPay: () => {
    const { earnings } = get();
    let currentGross = 0;
    const updatedEarnings = earnings.map(e => {
      let total = 0;
      if (e.type === 'Overtime') total = e.hours * (e.rate * 1.5);
      else if (e.type === 'Regular') total = e.hours * e.rate;
      else total = e.rate || 0;
      currentGross += total;
      return { ...e, currentTotal: parseFloat(total.toFixed(2)) };
    });
    set({ earnings: updatedEarnings });
    return parseFloat(currentGross.toFixed(2));
  },

  calculateFICA: (grossPay, ytdGross) => {
    let socialSecurity = 0;
    if (ytdGross < TAX_RATES.SS_WAGE_BASE) socialSecurity = Math.min(grossPay, TAX_RATES.SS_WAGE_BASE - ytdGross) * TAX_RATES.SOCIAL_SECURITY;
    let medicare = grossPay * TAX_RATES.MEDICARE;
    if (ytdGross > TAX_RATES.MEDICARE_THRESHOLD) medicare += (grossPay * TAX_RATES.MEDICARE_SURCHARGE);
    return { socialSecurity: parseFloat(socialSecurity.toFixed(2)), medicare: parseFloat(medicare.toFixed(2)) };
  },

  calculateFIT: (grossPay, frequency, maritalStatus) => {
    const periodsPerYear = PAY_FREQUENCIES[frequency]?.periodsPerYear || 26;
    const annualized = grossPay * periodsPerYear;
    const standardDeduction = STANDARD_DEDUCTION_2024[maritalStatus] || STANDARD_DEDUCTION_2024.single;
    const taxableIncome = Math.max(0, annualized - standardDeduction);
    let annualTax = 0;
    if (taxableIncome <= 11600) annualTax = taxableIncome * 0.10;
    else if (taxableIncome <= 47150) annualTax = 1160 + ((taxableIncome - 11600) * 0.12);
    else if (taxableIncome <= 100525) annualTax = 5426 + ((taxableIncome - 47150) * 0.22);
    else annualTax = 17168 + ((taxableIncome - 100525) * 0.24);
    return parseFloat((annualTax / periodsPerYear).toFixed(2));
  },

  recalculateNetPay: () => {
    const state = get();
    const { currentGross, taxes } = state.calculatedTotals;
    const totalTaxes = taxes.socialSecurity + taxes.medicare + taxes.federalIncomeTax + taxes.stateIncomeTax;
    let totalCustomDeductions = 0;
    state.customDeductions.forEach(d => totalCustomDeductions += (d.amount || 0));
    const totalDeductions = totalTaxes + totalCustomDeductions;
    const netPay = currentGross - totalDeductions;
    set((state) => ({
      calculatedTotals: { ...state.calculatedTotals, totalDeductions: parseFloat(totalDeductions.toFixed(2)), netPay: parseFloat(netPay.toFixed(2)) }
    }));
  },

  recalculateAll: () => {
    const state = get();
    const grossPay = state.calculateGrossPay();

    const payDate = state.payPeriod.payDate;
    const frequency = state.payPeriod.frequency;
    let elapsedPeriods = 1;

    if (payDate) {
      const [year, month, day] = payDate.split('-').map(Number);
      const currentPayDate = new Date(year, month - 1, day);
      const startOfYear = new Date(year, 0, 1);

      const diffTime = Math.abs(currentPayDate - startOfYear);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (frequency === 'weekly') {
        elapsedPeriods = Math.max(1, Math.ceil(diffDays / 7));
      } else if (frequency === 'bi-weekly') {
        elapsedPeriods = Math.max(1, Math.ceil(diffDays / 14));
      } else if (frequency === 'semi-monthly') {
        elapsedPeriods = Math.max(1, (month - 1) * 2 + (day > 15 ? 2 : 1));
      } else if (frequency === 'monthly') {
        elapsedPeriods = Math.max(1, month);
      }
    }

    // update ytd for earnings based on elapsed periods
    let calculatedYtdGross = 0;
    const updatedEarningsWithYtd = state.earnings.map(e => {
       const newYtdTotal = e.currentTotal * elapsedPeriods;
       calculatedYtdGross += newYtdTotal;
       return { ...e, ytdTotal: parseFloat(newYtdTotal.toFixed(2)) };
    });

    set({ earnings: updatedEarningsWithYtd });

    let parsedYtd = state.ytdGrossOverridden ? state.calculatedTotals.ytdGross : parseFloat(calculatedYtdGross.toFixed(2));

    if (parsedYtd < grossPay) {
      parsedYtd = grossPay;
    }
    set((s) => ({ calculatedTotals: { ...s.calculatedTotals, ytdGross: parsedYtd } }));
    const fica = state.calculateFICA(grossPay, parsedYtd);
    const fit = state.calculateFIT(grossPay, state.payPeriod.frequency, state.employeeDetails.maritalStatus);

    set((state) => ({
      calculatedTotals: {
        ...state.calculatedTotals,
        currentGross: grossPay,
        taxes: state.autoCalculate
          ? {
              ...state.calculatedTotals.taxes,
              socialSecurity: fica.socialSecurity,
              medicare: fica.medicare,
              federalIncomeTax: fit,
              // Keep stateIncomeTax as it is since it's an override only
            }
          : {
              ...state.calculatedTotals.taxes,
              socialSecurity: state.taxOverrides.socialSecurity ? state.calculatedTotals.taxes.socialSecurity : fica.socialSecurity,
              medicare: state.taxOverrides.medicare ? state.calculatedTotals.taxes.medicare : fica.medicare,
              federalIncomeTax: state.taxOverrides.federalIncomeTax ? state.calculatedTotals.taxes.federalIncomeTax : fit
            }
      }
    }));
    get().recalculateNetPay();
  }
}), {
  name: 'axim_paystub_draft_continuous',
}));