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
