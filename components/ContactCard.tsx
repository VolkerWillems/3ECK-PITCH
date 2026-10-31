"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/pitch/status";
import { CopyIcon } from "./icons";

/** The address is always visible as text: mail links do not work in every browser or app. */
export function ContactCard() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the address stays selectable on screen
    }
  }

  return (
    <div className="contact">
      <code>{CONTACT_EMAIL}</code>
      <button type="button" className="btn" onClick={copy}>
        <CopyIcon />
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
