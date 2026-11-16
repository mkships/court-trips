"use client";

import { AU, CA, CH, EU, GB, HK, IN, JP, NZ, SE, SG, US } from "country-flag-icons/react/3x2";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
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

const FLAGS: Record<(typeof CURRENCIES)[number][3], (props: { className?: string }) => React.ReactNode> = { US, EU, GB, AU, CA, CH, JP, NZ, SG, HK, SE, IN };

function Flag({ country }: { country: keyof typeof FLAGS }) {
  const Svg = FLAGS[country];
  return (
    <span aria-hidden="true" className="block h-[18px] w-[27px] shrink-0 overflow-hidden rounded-[4px] ring-1 ring-ink/10">
      <Svg className="block h-full w-full" />
    </span>
  );
}

// The currency menu: a pill that opens a list of flag, code, name and symbol. `dark` is the
// footer's version, on ink; `up` opens the list above the pill (the footer is at the page's end).
// Arrow keys move through the list, Esc closes it, and the choice is announced as a radio group.
export function CurrencyPicker({ dark = false, up = false, className = "" }: { dark?: boolean; up?: boolean; className?: string }) {
  const { currency, rates, choose } = useContext(CurrencyContext);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = CURRENCIES.find(([code]) => code === currency);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? [])];
    // start on the current choice, so the arrows move from where you are
    (items().find((el) => el.getAttribute("aria-checked") === "true") ?? items()[0])?.focus();
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLElement>("button[aria-haspopup]")?.focus();
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const list = items();
        const at = list.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
        list[next]?.focus();
      } else if (e.key === "Tab") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // nothing to convert with (rates unavailable, or outside the public site)
  if (!rates) return null;

  const pick = (code: string | null) => {
    choose(code);
    setOpen(false);
    root.current?.querySelector<HTMLElement>("button[aria-haspopup]")?.focus();
  };
  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-mist aria-checked:bg-mist aria-checked:shadow-[inset_0_0_0_1px_var(--color-ink)]";

  return (
    <div ref={root} className={`relative inline-block text-ink ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={current ? `Prices shown in ${current[1]}. Change currency` : "Choose a currency for prices"}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-full border py-2 pr-3 pl-3 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors ${
          dark ? "border-white/30 text-white hover:border-white hover:bg-white/10" : "border-rule bg-white hover:border-ink hover:bg-mist"
        }`}
      >
        {current ? <Flag country={current[3]} /> : null}
        {current ? current[0] : "Currency"}
        <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""} ${dark ? "text-white/70" : "text-ink-soft"}`} aria-hidden="true">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        // the on-paper scope keeps focus rings dark on this white panel, even inside the ink footer
        <div
          id={id}
          role="menu"
          aria-label="Show prices in"
          className={`on-paper absolute z-50 w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-2 shadow-pop ring-1 ring-ink/5 ${up ? "bottom-[calc(100%+8px)] left-0" : "top-[calc(100%+8px)] right-0"}`}
        >
          <div className="max-h-[min(420px,60vh)] overflow-y-auto p-0.5">
            <button type="button" role="menuitemradio" aria-checked={!current} onClick={() => pick(null)} className={row}>
              <span aria-hidden="true" className="grid h-[18px] w-[27px] shrink-0 place-items-center rounded-[4px] bg-mist text-[0.6875rem] font-extrabold ring-1 ring-ink/10">
                =
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-semibold">As listed</span>
                <span className="block truncate text-[0.8125rem] text-ink-soft">Each operator&apos;s own currency</span>
              </span>
            </button>
            {CURRENCIES.map(([code, name, symbol, country]) => (
              <button key={code} type="button" role="menuitemradio" aria-checked={code === currency} onClick={() => pick(code)} className={row}>
                <Flag country={country} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold">{code}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-soft">{name}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-[0.9375rem] text-ink-soft">
                  {symbol}
                </span>
              </button>
            ))}
          </div>
          <p className="border-t border-rule px-3 pt-2 pb-1 text-[0.75rem] leading-snug text-ink-soft">
            Converted prices are a guide. You pay the operator in their currency.
          </p>
        </div>
      )}
    </div>
  );
}
