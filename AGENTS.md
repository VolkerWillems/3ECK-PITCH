# 3ECK-PITCH instructions

- Purpose: the investor-facing, mobile-first page that hosts the Anam AI twin. Keep it small.
- Design: follow 3ECK-VISUALS (`DESIGN.md`). `styles/theme.css` and `styles/brand.css` are copies: change them in 3ECK-VISUALS and re-sync. No new palette, no green "success" states.
- Secrets: `ANAM_API_KEY` and `ANAM_PERSONA_ID` are server-side only, set in the hosting dashboard, never in Git or chat.
- Truthfulness: `lib/pitch/status.ts` and the persona prompt must not claim more than the owner confirmed. No customers, revenue, ownership or round terms unless supplied by the owner.
- Always disclose that the twin is an AI. The badge and intro text must stay.
- No push, deploy, domain or DNS change without the owner's explicit approval.
- Verify with `npm test`, `npm run typecheck`, `npm run build`, and a mobile screenshot (390px) before calling a change done.
