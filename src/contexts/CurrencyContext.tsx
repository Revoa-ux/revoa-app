import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('display_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.display_currency) {
          setCurrencyState(data.display_currency as CurrencyCode);
        }
      } catch (err) {
        console.error('Failed to load currency preference:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, [user?.id]);

  const setCurrency = async (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);

    if (!user?.id) return;

    try {
      await supabase
        .from('user_profiles')
        .update({ display_currency: newCurrency })
        .eq('id', user.id);
    } catch (err) {
      console.error('Failed to save currency preference:', err);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
