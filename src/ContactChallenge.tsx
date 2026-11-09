import React from "react";
import { turnstileSiteKey } from "./contactDelivery";
type Turnstile = { render: (el: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.defer = true;
    const timeout = setTimeout(() => { script.remove(); loading = null; reject(new Error("timeout")); }, 15_000);
    script.onload = () => { clearTimeout(timeout); if (window.turnstile) resolve(); else { loading = null; reject(new Error("script")); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); loading = null; reject(new Error("script")); };
    document.head.appendChild(script);
  });
  return loading;
}
export default function ContactChallenge({ revision, onToken }: { revision: number; onToken: (token: string) => void }) {
  const [active, setActive] = React.useState(false), [error, setError] = React.useState(false);
  const target = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!active) return;
    let disposed = false, id: string | undefined;
    setError(false); onToken("");
    load().then(() => {
      if (disposed || !target.current) return;
      id = window.turnstile!.render(target.current, { sitekey: turnstileSiteKey, action: "contact", theme: "light", size: "compact", language: "fi", callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => { onToken(""); setError(true); } });
    }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [active, revision, onToken]);
  return <div className="contact-challenge">
    <p>Roskapostin torjunta käyttää Cloudflare Turnstilea. Tarkistus ladataan, kun valitset alla olevan painikkeen. <a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer">Cloudflaren tietosuoja</a>.</p>
    {!active && <button type="button" className="button outline" onClick={() => setActive(true)}>Tee turvatarkistus</button>}
    <div ref={target} aria-label="Lomakkeen turvatarkistus" />
    {error && <p role="alert">Turvatarkistuksen lataus epäonnistui. <button type="button" className="text-link" onClick={() => { setActive(false); onToken(""); }}>Yritä uudelleen</button> tai soita yritykselle.</p>}
  </div>;
}
