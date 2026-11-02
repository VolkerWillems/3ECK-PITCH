# 3ECK-PITCH

Mobile-first investor experience: sixty seconds with Volker's AI twin, shown in 3ECK's own interface. The avatar runs on Anam; this app owns the screen, the timer, the "what is real today" status and the contact step.

## How it works

1. The visitor taps **Start**. The browser asks `POST /api/session` for a short-lived Anam session token.
2. The server exchanges `ANAM_API_KEY` for that token (the key never reaches the browser), after an optional invitation code and rate limits.
3. The browser streams the persona into the page with `@anam-ai/js-sdk`, shows live captions (no countdown is shown), and ends the session 240 seconds after the twin appears at the latest.

Fallbacks: microphone blocked or unwanted leads to typing (`sendUserMessage`); every error state has a clear message; the contact address is always visible as text.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the two values, never commit them
npm run dev
```

| Variable | Purpose |
|---|---|
| `ANAM_API_KEY` | Server only. Create it in Anam Lab. |
| `ANAM_PERSONA_ID` | The persona with the investor prompt and knowledge. |
| `ANAM_PERSONA_ID_JEROEN` | Optional. The Jeroen sales avatar for the "Test sales avatar" button. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_CALL_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID` | Optional, all three. The one-time outbound call (Jay). Also needs the Upstash Redis store (Vercel, Storage, Marketplace), which adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. |
| `PITCH_INVITE_CODE` | Optional. When set, visitors must enter it. |
| `PITCH_MAX_SESSIONS_PER_IP`, `PITCH_MAX_SESSIONS_PER_DAY` | Optional limits (defaults 3 per 10 minutes per visitor, 100 per day). |

Put the values in Vercel (Project, Settings, Environment Variables) as Sensitive. Never paste them in chat or Git.

The limits are in memory per server instance, so they deter casual abuse but are not a hard spending cap. Set a credit limit in Anam as the real cap.

## Design

Colours, type, radius and shadows come from the 3ECK-VISUALS contract (`styles/theme.css`, `styles/brand.css`, fonts in `public/fonts`): dark first, copper accent, Quantico headings (regular, uppercase), Barlow Semi Condensed body, 44px controls, no green states. Re-sync the two CSS files from 3ECK-VISUALS when that source changes; do not edit them here.

## Truthfulness

`lib/pitch/status.ts` is what investors read under "What is real today". Every line must be true and dated. Add a line only after the owner confirmed it.

## Checks

```bash
npm test && npm run typecheck && npm run build
```

## Open

- Verify Anam's retention of audio and transcripts, then state it on `/privacy`.
- A poster image or looping still for the intro (the top half is empty by design until one exists).
- Deploy to Vercel and connect a domain (owner decision).
- Optional PWA install and a shared durable rate limit.

## One-time call codes

"Test outbound sales agent" lets a visitor enter a personal code and a Dutch mobile number and be called once by Jay. Each code works once, each number can be called once, and both are claimed before the call is placed and released if it fails to start. Only SHA-256 hashes of the codes are in the repository (`lib/server/call-code-hashes.json`); the plain codes are never committed.

```bash
node scripts/make-codes.mjs 50 /path/outside/the/repo/codes.txt   # more codes: hashes are appended, plain codes go to that file
```

Calls to non-Dutch numbers are refused until the phone line can place them.

## Corporate website AI project advisor (candidate, 2026-11-02)

The original investor page (`/`) and `/?embed=1` retain their behavior.
`/?embed=advisor` is an opt-in, website-facing discovery experience using
the existing PITCH avatar, voice and LLM. The server reads the existing
persona metadata via the Anam Personas API using `ANAM_API_KEY`, then
mints a **separate ephemeral persona** with the 3ECK project-advisor prompt.
It does not edit the existing persona or disclose provider credentials.

Only the trusted 3ECK website origin (and scoped Vercel previews/local
development) may send a versioned `3eck:advisor-example` message. This
prefills a question for the visitor to review and send; it does not start
a paid session or send messages automatically. Session rates and the
existing hard-stop remain in effect.

The advisor helps scope an idea; it cannot create a binding quote,
accept payment, create orders or run 3ECK builders. The customer must
contact 3ECK separately to request a real proposal. Provider API
permissions and live microphone behavior still need testing.
