"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyStreamEvent, displayBrand, latestCaption, normalizeMessages, tailCaption, type LiveCaption, type TranscriptLine } from "@/lib/pitch/transcript";
import { HARD_STOP_SECONDS } from "@/lib/pitch/timer";
import { conversationToBuildBrief, MAX_BUILD_BRIEF_LENGTH, trustedBuildParentOrigin } from "@/lib/pitch/build-embed";
import { ContactCard } from "./ContactCard";
import { StatusSheet } from "./StatusSheet";
import { TrySheet } from "./TrySheet";
import { CloseIcon, InfoIcon, KeyboardIcon, MicIcon, MicOffIcon } from "./icons";

type Phase = "intro" | "connecting" | "live" | "ended" | "error";
type AnamClient = import("@anam-ai/js-sdk").AnamClient;
type PersonaKey = "twin" | "jeroen";

const BADGE: Record<PersonaKey, string> = { twin: "AI twin of Volker", jeroen: "Jeroen · EarthSpas sales avatar" };

const VIDEO_ID = "twin-video";

const MESSAGES: Record<string, string> = {
  not_configured: "The twin is not switched on yet. Please try again later.",
  invite_required: "Enter your invitation code to start.",
  too_many_sessions: "You have started a few sessions already. Please wait a little and try again.",
  daily_limit: "The twin has reached today's limit. Please try again tomorrow.",
  unknown_persona: "That demo is not available.",
  twin_unavailable: "The twin could not be reached. Please try again in a moment.",
  network: "No connection. Check your network and try again.",
};

export function PitchExperience({ mode = "pitch" }: { mode?: "pitch" | "build" }) {
  const isBuild = mode === "build";
  const [phase, setPhase] = useState<Phase>("intro");
  const [persona, setPersona] = useState<PersonaKey>("twin");
  const [error, setError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [live, setLive] = useState<LiveCaption | null>(null);
  const [muted, setMuted] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [briefDraft, setBriefDraft] = useState("");
  const [briefSent, setBriefSent] = useState(false);

  const clientRef = useRef<AnamClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const endingRef = useRef(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const trySheetRef = useRef<HTMLDialogElement>(null);

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

  // No countdown is shown. The clock only ends the session for good, a fixed time after the twin appears.
  const startClock = useCallback(() => {
    stopTimer();
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (Date.now() - startedAtRef.current >= HARD_STOP_SECONDS * 1000) void finish();
    }, 1000);
  }, [finish, stopTimer]);

  useEffect(() => () => {
    stopTimer();
    void clientRef.current?.stopStreaming().catch(() => undefined);
  }, [stopTimer]);

  useEffect(() => {
    if (isBuild && phase === "ended") {
      setBriefDraft((current) => current || conversationToBuildBrief(lines));
    }
  }, [isBuild, phase, lines]);

  async function start(key: PersonaKey = "twin") {
    endingRef.current = false;
    setPersona(key);
    setError(null);
    setLines([]);
    setLive(null);
    setMuted(false);
    setMicDenied(false);
    setTyping(false);
    setBriefDraft("");
    setBriefSent(false);
    setPhase("connecting");

    try {
      let res: Response;
      try {
        res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: code, persona: key }) });
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

      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (history: unknown) => {
        setLines(normalizeMessages(history));
        setLive(null);
      });
      // words arrive while the twin is still speaking: show them as they come
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: { id: string; content: string; role: unknown }) =>
        setLive((current) => applyStreamEvent(current, event)),
      );
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

  /** Start another demo avatar, ending the conversation that is running. */
  async function switchTo(key: PersonaKey) {
    if (clientRef.current) await finish();
    await start(key);
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

  function shareBuildBrief() {
    const text = briefDraft.trim();
    const trustedParent = trustedBuildParentOrigin(document.referrer);
    if (!trustedParent || window.parent === window) {
      setError("Open this conversation from the 3ECK website to share a brief.");
      return;
    }
    if (text.length < 10) {
      setError("Describe the problem in at least ten characters before sending.");
      return;
    }
    window.parent.postMessage({ type: "3eck:build-brief", version: 1, text }, trustedParent);
    setBriefSent(true);
    setError(null);
  }

  const caption = displayBrand(live ? tailCaption(live.text) : latestCaption(lines));
  const lastUser = [...lines].reverse().find((l) => l.role === "user")?.text;

  return (
    <main className="pitch">
      <div className="stage" data-phase={phase}>
        <div className="frame-glow" aria-hidden="true" />
        <div className="frame">
          <video id={VIDEO_ID} className="video" playsInline autoPlay aria-label={persona === "twin" ? "Volker's AI twin" : "Jeroen, sales avatar for EarthSpas"} />
        </div>

        <header className="topbar">
          <span className="badge">{BADGE[persona]}</span>
        </header>

        {phase === "intro" && (
          <section className="intro" aria-labelledby="intro-title">
            <div className="hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/volker-start.webp" alt="" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo" src="/brand/3eck-logo.png" alt="3ECK Technology" />
            <h1 id="intro-title" className="tagline">{isBuild ? "Tell our AI what you want to build" : "60 seconds with Volker\u0027s AI twin"}</h1>
            {needsCode && (
              <div className="field">
                <label htmlFor="code">Invitation code</label>
                <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
              </div>
            )}
            {error && <p className="notice" role="alert">{error}</p>}
            <button type="button" className="btn btn-primary" onClick={() => void start("twin")}>{isBuild ? "Discuss my project" : "Invest now"}</button>
            <div className="links">
              <button type="button" onClick={() => sheetRef.current?.showModal()}>What is real today</button>
              <button type="button" onClick={() => trySheetRef.current?.showModal()}>Try our agents</button>
              <a href="/privacy">Privacy</a>
            </div>
            <p className="fine">You will talk to an AI, not to Volker himself. Needs your microphone. Your voice is processed live by our avatar partner, Anam. Please do not share confidential information.</p>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="live-logo" src="/brand/3eck-logo.png" alt="3ECK Technology" />
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
          <section className={isBuild ? "panel panel-build" : "panel"} aria-labelledby="end-title">
            <h2 id="end-title">{isBuild ? "Your project brief" : persona === "twin" ? "That was the twin." : "That was Jeroen."}</h2>
            {isBuild ? (
              <div className="build-intake">
                <p className="fine">Review what you shared. Only the text below is passed back to 3ECK-WEBSITE, and only when you choose to share it.</p>
                <label htmlFor="build-brief">Your project description</label>
                <textarea
                  id="build-brief"
                  value={briefDraft}
                  onChange={(event) => { setBriefDraft(event.target.value); setBriefSent(false); }}
                  rows={5}
                  maxLength={MAX_BUILD_BRIEF_LENGTH}
                  placeholder="What should the tool, app, or agent do?"
                />
                <button type="button" className="btn btn-primary" onClick={shareBuildBrief} disabled={briefDraft.trim().length < 10}>
                  Share brief with 3ECK site
                </button>
                {briefSent && <p className="fine" role="status">Brief shared. Review it on the 3ECK website before requesting a quote.</p>}
                {error && <p className="notice" role="alert">{error}</p>}
              </div>
            ) : (
              <>
                <p className="lead">{persona === "twin" ? "If it made you curious, the real Volker would love to talk." : "A sales avatar like this can sit on your website. The real Volker would love to talk."}</p>
                <ContactCard />
              </>
            )}
            <div className="stack">
              <button type="button" className="btn btn-primary" onClick={() => void start(persona)}>{isBuild ? "Talk again" : persona === "twin" ? "Challenge it again" : "Test it again"}</button>
              {!isBuild && <button type="button" className="btn btn-ghost" onClick={() => trySheetRef.current?.showModal()}>Try our other agents</button>}
              <button type="button" className="btn btn-ghost" onClick={() => sheetRef.current?.showModal()}><InfoIcon />What is real today</button>
            </div>
          </section>
        )}

        {phase === "error" && (
          <section className="panel" aria-labelledby="err-title">
            <h2 id="err-title">Not available right now</h2>
            <p className="notice" role="alert">{error}</p>
            <div className="stack">
              <button type="button" className="btn btn-primary" onClick={() => void start(persona)}>Try again</button>
              <ContactCard />
            </div>
          </section>
        )}

        <StatusSheet ref={sheetRef} onTry={() => trySheetRef.current?.showModal()} />
        <TrySheet ref={trySheetRef} onStartAvatar={() => void switchTo("jeroen")} />
      </div>
    </main>
  );
}
