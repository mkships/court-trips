"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile didn't load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void };

// Cloudflare's bot check. It adds a hidden `cf-turnstile-response` input to the form it sits in,
// which the server action verifies. Tokens work once, so the form resets it after each attempt.
export function Turnstile(props: { siteKey: string; action: string; onToken: (ok: boolean) => void; ref?: Ref<TurnstileHandle> }) {
  const { siteKey, action, onToken, ref } = props;
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(false);
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !box.current) return;
        widget.current = turnstile.render(box.current, {
          sitekey: siteKey,
          action,
          size: "flexible",
          callback: () => onTokenRef.current(true),
          "expired-callback": () => onTokenRef.current(false),
          "error-callback": () => onTokenRef.current(false),
        });
      })
      .catch(() => onTokenRef.current(false));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  return <div ref={box} className="min-h-[65px] max-w-[400px]" />;
}
