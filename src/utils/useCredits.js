
import { useState } from 'react';

export const useCredits = () => {
  const [credits, setCredits] = useState(() =>
    parseInt(localStorage.getItem('axim_document_credits') || '0', 10)
  );

  const addCredits = (amount) => {
    const newAmount = credits + amount;
    localStorage.setItem('axim_document_credits', String(newAmount));
    setCredits(newAmount);
  };

  const useCredit = () => {
    if (credits <= 0) return false;
    const newAmount = credits - 1;
    localStorage.setItem('axim_document_credits', String(newAmount));
    setCredits(newAmount);
    return true;
  };

  return { credits, addCredits, useCredit };
};