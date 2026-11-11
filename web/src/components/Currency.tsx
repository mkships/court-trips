"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CURRENCIES, convert, type Rates } from "@/lib/currency";
import { money } from "@/lib/format";

// The visitor's display currency. Pages are rendered once for everyone in each listing's own
// currency (so they stay cached); a saved choice is applied in the browser after load.

const STORAGE_KEY = "ct_currency";
type Value = { currency: string | null; rates: Rates | null; choose: (code: string | null) => void };
const CurrencyContext = createContext<Value>({ currency: null, rates: null, choose: () => {} });

export function CurrencyProvider({ rates, children }: { rates: Rates | null; children: React.ReactNode }) {
  const [currency, setCurrency] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES.some(([code]) => code === saved)) setCurrency(saved);
    } catch {
      // private windows can block storage; prices just stay as listed
    }
  }, []);

  const choose = (code: string | null) => {
    setCurrency(code);
    try {
      if (code) localStorage.setItem(STORAGE_KEY, code);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return <CurrencyContext.Provider value={{ currency, rates, choose }}>{children}</CurrencyContext.Provider>;
}

// The amount in the visitor's currency, or as listed when they haven't chosen one or there's no rate.
function useShown(amount: number, listed: string) {
  const { currency, rates } = useContext(CurrencyContext);
  const converted = currency && currency !== listed ? convert(amount, listed, currency, rates) : null;
  return converted == null ? { text: money(amount, listed), converted: false } : { text: `≈ ${money(converted, currency!)}`, converted: true };
}

// A price. Converted prices get "≈" and say what the operator actually charges on hover.
export function Money({ amount, currency, prefix }: { amount: number; currency: string; prefix?: string }) {
  const { text, converted } = useShown(amount, currency);
  return (
    <span title={converted ? `${money(amount, currency)} (${currency}), converted at today's rate` : undefined}>
      {prefix && `${prefix} `}
      {text}
    </span>
  );
}

// Beside a converted price on the booking card: what the operator will actually charge.
export function ListedPrice({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  const { converted } = useShown(amount, currency);
  if (!converted) return null;
  return (
    <p className={className}>
      The operator charges {money(amount, currency)} ({currency}). The converted price is a guide.
    </p>
  );
}

// `dark` is the footer's version, on ink.
export function CurrencyPicker({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { currency, rates, choose } = useContext(CurrencyContext);
  // nothing to convert with (rates unavailable, or outside the public site)
  if (!rates) return null;
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">Show prices in</span>
      <select
        value={currency ?? ""}
        onChange={(e) => choose(e.target.value || null)}
        className={`appearance-none rounded-full border py-2 pr-8 pl-3.5 text-[0.9375rem] font-semibold transition-colors ${
          dark
            ? "border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10"
            : "border-rule bg-white hover:border-ink hover:bg-mist"
        }`}
      >
        <option value="">{currency ? "As listed" : "Currency"}</option>
        {CURRENCIES.map(([code, symbol]) => (
          <option key={code} value={code}>
            {symbol === code ? code : `${code} ${symbol}`}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 16 16" className={`pointer-events-none absolute right-3 size-3.5 ${dark ? "text-white/70" : "text-ink-soft"}`} aria-hidden="true">
        <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
