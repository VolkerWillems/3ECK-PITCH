"use client";

import { forwardRef, useState } from "react";
import { CloseIcon } from "./icons";

const MESSAGES: Record<string, string> = {
  invalid_code: "That code is not valid. Check the message you received.",
  code_used: "This code has already been used.",
  invalid_number: "Dutch mobile numbers only for now, for example 06 12 34 56 78.",
  number_used: "This number has already been called.",
  consent_required: "Please tick the box to agree.",
  not_configured: "Calling is not switched on yet.",
  too_many_attempts: "Too many attempts. Please wait a few minutes.",
  call_failed: "The call could not be started. Please try again later.",
  network: "No connection. Check your network and try again.",
};

type Props = { onStartAvatar: () => void };
type CallState = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** Two demos: a sales avatar for a website, and a one-time outbound sales call that needs a personal code. */
export const TrySheet = forwardRef<HTMLDialogElement, Props>(function TrySheet({ onStartAvatar }, ref) {
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<CallState>({ kind: "idle" });

  const close = () => (ref as React.RefObject<HTMLDialogElement>).current?.close();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, phone, consent }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setState(res.ok ? { kind: "done" } : { kind: "error", message: MESSAGES[data.error ?? ""] ?? MESSAGES.call_failed });
    } catch {
      setState({ kind: "error", message: MESSAGES.network });
    }
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="try-title">
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="try-title">Try our other agents</h2>
          <button type="button" className="btn btn-round btn-ghost" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        <section className="demo">
          <h3>Sales avatar for a website</h3>
          <p>Jeroen explains the whirlpools and spas he sells, like a sales advisor on a webshop.</p>
          <span className="tag">Works</span>
          <button type="button" className="btn btn-primary" onClick={() => { close(); onStartAvatar(); }}>Test sales avatar</button>
        </section>

        <section className="demo">
          <h3>Outbound sales agent</h3>
          <p>Jay calls you once, with a sales pitch for solar panels and home batteries. You need a personal code from Volker.</p>
          <span className="tag">Pilot</span>
          {!showForm && state.kind !== "done" && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Test outbound sales agent</button>
          )}
          {showForm && state.kind !== "done" && (
            <form className="callform" onSubmit={submit}>
              <div className="field">
                <label htmlFor="call-code">Personal code</label>
                <input id="call-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX" required />
              </div>
              <div className="field">
                <label htmlFor="call-phone">Your mobile number (Dutch)</label>
                <input id="call-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" required />
              </div>
              <label className="check" htmlFor="call-consent">
                <input id="call-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I agree to be called once on this number by an AI sales agent, for a demo. No real offer is made.</span>
              </label>
              {state.kind === "error" && <p className="notice" role="alert">{state.message}</p>}
              <button type="submit" className="btn btn-primary" disabled={state.kind === "sending" || !consent}>{state.kind === "sending" ? "Starting the call..." : "Call me"}</button>
            </form>
          )}
          {state.kind === "done" && <p className="notice" role="status">Done. Jay will call you within a minute. Pick up!</p>}
        </section>

        <p className="fine">Your number is used for this one call and kept only as a one-way hash for 30 days, so it is not called twice. The call runs on our voice partner, ElevenLabs.</p>
      </div>
    </dialog>
  );
});
