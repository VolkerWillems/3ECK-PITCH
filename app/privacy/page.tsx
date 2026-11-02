import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/pitch/status";

export const metadata: Metadata = { title: "Privacy · 3ECK Pitch" };

export default function PrivacyPage() {
  return (
    <main className="doc">
      <h1>Privacy</h1>
      <p>3ECK Technology runs this demo. You talk to an AI, not to a person.</p>
      <h2>What is processed</h2>
      <p>
        Your microphone audio and anything you type are sent live to our avatar provider, Anam, so the AI twin can hear and answer
        you. This page itself sets no tracking cookies and asks for no personal data, so please do not share confidential information.
      </p>
      <h2>Sharing a project brief</h2>
      <p>
        In the optional build-intake pilot, you may review and edit a description of your project after the conversation.
        Only if you select "Share brief with 3ECK site" is that text passed to the trusted 3ECK-WEBSITE page.
        The receiving page keeps the brief in your browser until you choose to copy it or open an email draft.
        A draft is not sent automatically. No payment or build order is created by this action.
      </p>
      <h2>The demo call</h2>
      <p>
        If you use a personal code to be called by our outbound sales agent, your mobile number is sent to our voice partner,
        ElevenLabs, to place that one call. We keep only a one-way hash of the number for 30 days, so the same number is not
        called twice. You must tick a box to agree before a call is placed.
      </p>
      <h2>Questions and deletion</h2>
      <p>
        Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will tell you what we hold and remove it on request.
      </p>
      <p>
        <Link href="/">Back to the challenge</Link>
      </p>
    </main>
  );
}
