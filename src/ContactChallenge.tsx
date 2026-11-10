import React from "react";
import { turnstileSiteKey } from "./contactDelivery";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
export class ContactChallengeError extends Error {
  constructor(public code: "expired" | "failed" | "unavailable" | "cancelled") { super(code); }
}
export type ContactChallengeHandle = { execute: () => Promise<string>; reset: () => void };
let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.defer = true;
    const fail = () => { script.remove(); loading = null; reject(new ContactChallengeError("unavailable")); };
    const timeout = setTimeout(fail, 15_000);
    script.onload = () => { clearTimeout(timeout); if (window.turnstile) resolve(); else fail(); };
    script.onerror = () => { clearTimeout(timeout); fail(); };
    document.head.appendChild(script);
  });
  return loading;
}

const ContactChallenge = React.forwardRef<ContactChallengeHandle>(function ContactChallenge(_, ref) {
  const target = React.useRef<HTMLDivElement>(null);
  const widget = React.useRef<string>();
  const run = React.useRef(0), cancel = React.useRef<(() => void) | null>(null);
  const mounted = React.useRef(true);
  const [interactive, setInteractive] = React.useState(false);
  const reset = React.useCallback(() => {
    cancel.current?.(); cancel.current = null; run.current++;
    if (widget.current && window.turnstile) {
      try { window.turnstile.remove(widget.current); } catch { /* discarded widget is never reused */ }
    }
    widget.current = undefined;
    if (mounted.current) setInteractive(false);
  }, []);
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; reset(); };
  }, [reset]);
  React.useImperativeHandle(ref, () => ({ reset, execute() {
    // A fresh widget per attempt prevents stale callbacks and consumed-token reuse.
    reset();
    const attempt = run.current;
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (token?: string, error: ContactChallengeError["code"] = "failed") => {
        if (settled || attempt !== run.current) return;
        settled = true; clearTimeout(timeout); cancel.current = null;
        if (mounted.current) setInteractive(false);
        if (token) resolve(token); else reject(new ContactChallengeError(error));
      };
      const timeout = setTimeout(() => finish(undefined, "expired"), 120_000);
      cancel.current = () => finish(undefined, "cancelled");
      load().then(() => {
        if (settled || attempt !== run.current) return;
        if (!target.current || !window.turnstile) { finish(undefined, "unavailable"); return; }
        widget.current = window.turnstile.render(target.current, {
          sitekey: turnstileSiteKey, action: "contact", theme: "light", size: "compact", language: "fi",
          execution: "execute", appearance: "interaction-only", retry: "never",
          "refresh-expired": "manual", "refresh-timeout": "manual", "response-field": false,
          callback: (token: string) => finish(token),
          "expired-callback": () => finish(undefined, "expired"),
          "timeout-callback": () => finish(undefined, "expired"),
          "error-callback": () => { finish(undefined, "failed"); return true; },
          "before-interactive-callback": () => {
            if (settled || attempt !== run.current) return;
            setInteractive(true);
            target.current?.focus({ preventScroll: true });
            target.current?.scrollIntoView({ block: "center", behavior: "instant" });
          },
        });
        if (!settled) window.turnstile.execute(widget.current);
      }).catch(() => finish(undefined, "unavailable"));
    });
  } }), [reset]);
  return <div className={"contact-challenge" + (interactive ? " is-interactive" : "")}>
    {interactive && <p role="status">Vahvista lähetys alla olevalla tarkistuksella.</p>}
    <div ref={target} tabIndex={-1} aria-label="Lähetyksen vahvistus" />
  </div>;
});
export default ContactChallenge;
