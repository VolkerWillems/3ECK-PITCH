"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { latestCaption, normalizeMessages, type TranscriptLine } from "@/lib/pitch/transcript";
import { HARD_STOP_SECONDS } from "@/lib/pitch/timer";
import { Clock } from "./Clock";
import { ContactCard } from "./ContactCard";
import { StatusSheet } from "./StatusSheet";
import { CloseIcon, InfoIcon, KeyboardIcon, MicIcon, MicOffIcon } from "./icons";

type Phase = "intro" | "connecting" | "live" | "ended" | "error";
type AnamClient = import("@anam-ai/js-sdk").AnamClient;

const VIDEO_ID = "twin-video";

const MESSAGES: Record<string, string> = {
  not_configured: "The twin is not switched on yet. Please try again later.",
  invite_required: "Enter your invitation code to start.",
  too_many_sessions: "You have started a few sessions already. Please wait a little and try again.",
  daily_limit: "The twin has reached today's limit. Please try again tomorrow.",
  twin_unavailable: "The twin could not be reached. Please try again in a moment.",
  network: "No connection. Check your network and try again.",
};

export function PitchExperience() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  const clientRef = useRef<AnamClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const endingRef = useRef(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finish = useCallback(
    async (next: Phase = "ended") => {
      if (endingRef.current) return;
      endingRef.current = true;
      stopTimer();
      const client = clientRef.current;
      clientRef.current = null;
      try {
        await client?.stopStreaming();
      } catch {
        // the session may already be closed by the server
      }
      setPhase(next);
    },
    [stopTimer],
  );

  const startClock = useCallback(() => {
    stopTimer();
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= HARD_STOP_SECONDS * 1000) void finish();
    }, 250);
  }, [finish, stopTimer]);

  useEffect(() => () => {
    stopTimer();
    void clientRef.current?.stopStreaming().catch(() => undefined);
  }, [stopTimer]);

  async function start() {
    endingRef.current = false;
    setError(null);
    setLines([]);
    setMuted(false);
    setMicDenied(false);
    setTyping(false);
    setPhase("connecting");

    try {
      let res: Response;
      try {
        res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: code }) });
      } catch {
        throw new Error("network");
      }
      const data = (await res.json().catch(() => ({}))) as { sessionToken?: string; error?: string };
      if (!res.ok || !data.sessionToken) {
        if (data.error === "invite_required") setNeedsCode(true);
        throw new Error(data.error ?? "twin_unavailable");
      }

      const { createClient, AnamEvent } = await import("@anam-ai/js-sdk");
      const client = createClient(data.sessionToken);
      clientRef.current = client;

      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (history: unknown) => setLines(normalizeMessages(history)));
      client.addListener(AnamEvent.MIC_PERMISSION_DENIED, () => {
        setMicDenied(true);
        setTyping(true);
      });
      client.addListener(AnamEvent.VIDEO_PLAY_STARTED, () => {
        setPhase("live");
        startClock();
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, () => void finish());

      await client.streamToVideoElement(VIDEO_ID);
    } catch (e) {
      const key = e instanceof Error ? e.message : "twin_unavailable";
      const detail = needsCode && key === "invite_required" ? MESSAGES.invite_required : (MESSAGES[key] ?? MESSAGES.twin_unavailable);
      stopTimer();
      try {
        await clientRef.current?.stopStreaming();
      } catch {
        // nothing to clean up
      }
      clientRef.current = null;
      setError(detail);
      setPhase(key === "invite_required" ? "intro" : "error");
    }
  }

  function toggleMute() {
    const client = clientRef.current;
    if (!client) return;
    const state = muted ? client.unmuteInputAudio() : client.muteInputAudio();
    setMuted(Boolean(state?.isMuted ?? !muted));
  }

  function sendDraft(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !clientRef.current) return;
    try {
      clientRef.current.sendUserMessage(text);
      setDraft("");
    } catch {
      setError("Your message could not be sent. Try again.");
    }
  }

  const caption = latestCaption(lines);
  const lastUser = [...lines].reverse().find((l) => l.role === "user")?.text;
  const showStage = phase === "live";

  return (
    <main className="pitch">
      <div className="stage" data-phase={phase}>
        <video id={VIDEO_ID} className="video" playsInline autoPlay aria-label="Volker's AI twin" />
        <div className="scrim" />

        <header className="topbar">
          <span className="badge">AI twin of Volker</span>
          {showStage && <Clock elapsedMs={elapsedMs} />}
        </header>

        {phase === "intro" && (
          <section className="panel" aria-labelledby="intro-title">
            <h1 id="intro-title">60 seconds.</h1>
            <p className="lead">Challenge Volker&apos;s AI twin. Ask something hard, or bring a real business problem.</p>
            <p className="fine">You will be talking to an AI, not to Volker himself.</p>
            {needsCode && (
              <div className="field">
                <label htmlFor="code">Invitation code</label>
                <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
              </div>
            )}
            {error && <p className="notice" role="alert">{error}</p>}
            <div className="stack">
              <button type="button" className="btn btn-primary" onClick={start}>Start the challenge</button>
              <button type="button" className="btn btn-ghost" onClick={() => sheetRef.current?.showModal()}><InfoIcon />What is real today</button>
            </div>
            <p className="fine">Needs your microphone. Your voice is processed live by our avatar partner, Anam. Please do not share confidential information. <a href="/privacy">Privacy</a></p>
          </section>
        )}

        {phase === "connecting" && (
          <section className="panel" aria-live="polite">
            <span className="pulse" aria-hidden="true" />
            <h2>Waking up the twin</h2>
            <p className="fine">Allow the microphone when your browser asks.</p>
          </section>
        )}

        {phase === "live" && (
          <section className="live" aria-label="Conversation">
            {micDenied && <p className="notice" role="alert">Microphone is blocked. You can type your questions instead.</p>}
            <p className="caption" aria-live="polite">{caption}</p>
            {lastUser && <p className="caption you">You: {lastUser}</p>}
            {typing && (
              <form className="typebox" onSubmit={sendDraft}>
                <input aria-label="Type your question" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question" enterKeyHint="send" />
                <button type="submit" className="btn" disabled={!draft.trim()}>Send</button>
              </form>
            )}
            <div className="controls">
              <button type="button" className="btn btn-round" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute microphone" : "Mute microphone"} disabled={micDenied}>
                {muted || micDenied ? <MicOffIcon /> : <MicIcon />}
              </button>
              <button type="button" className="btn btn-round btn-end" onClick={() => void finish()} aria-label="End conversation"><CloseIcon /></button>
              <button type="button" className="btn btn-round" onClick={() => setTyping((v) => !v)} aria-pressed={typing} aria-label="Type instead"><KeyboardIcon /></button>
              <button type="button" className="btn btn-round" onClick={() => sheetRef.current?.showModal()} aria-label="What is real today"><InfoIcon /></button>
            </div>
          </section>
        )}

        {phase === "ended" && (
          <section className="panel" aria-labelledby="end-title">
            <h2 id="end-title">That was the twin.</h2>
            <p className="lead">If it made you curious, the real Volker would love to talk.</p>
            <ContactCard />
            <div className="stack">
              <button type="button" className="btn btn-primary" onClick={start}>Challenge it again</button>
              <button type="button" className="btn btn-ghost" onClick={() => sheetRef.current?.showModal()}><InfoIcon />What is real today</button>
            </div>
          </section>
        )}

        {phase === "error" && (
          <section className="panel" aria-labelledby="err-title">
            <h2 id="err-title">Not available right now</h2>
            <p className="notice" role="alert">{error}</p>
            <div className="stack">
              <button type="button" className="btn btn-primary" onClick={start}>Try again</button>
              <ContactCard />
            </div>
          </section>
        )}

        <StatusSheet ref={sheetRef} />
      </div>
    </main>
  );
}
