# MORNING FLOW AI Versioning Rules

1. UI version label and ZIP version must match.
2. ZIP name must be `morning-flow-ai-vX.Y.zip`.
3. Always run `npm.cmd run build` before release.
4. ZIP must not include `node_modules`, `.npm-cache`, or `.env`.
5. ZIP should include `dist` after build.
6. v2.9 is based on v2.8 normal UI. Do not mix v3.0 or v3.1 UI.

## Version 2.9 Google Calendar Date Patch - 2026-06-01

- Screen display: v2.9
- ZIP: morning-flow-ai-v2.9.zip
- Next planned version: Version 2.10
- Version 2.8 UI, microphone button, layout, button placement, and CSS are preserved.
- Improved date parsing for Google Calendar registration.
- Registration preview shows date and time before sending events to Google Calendar.

## Version 2.8 Google Calendar Patch - 2026-06-01

- Screen display: v2.8
- ZIP: morning-flow-ai-v2.8.zip
- Next planned version: Version 2.9
- Version 2.7 UI, microphone button, layout, button placement, and CSS are preserved.
- Fixed Google OAuth startup and forced account selection every time.
- Google access tokens are not saved to localStorage.
- Calendar registration success and failure messages are shown from the current operation.

## Version 2.7 Security & Stability Patch - 2026-06-01

- Screen display: v2.7
- ZIP: morning-flow-ai-v2.7.zip
- Next planned version: Version 2.8
- Version 2.6 UI, microphone button, layout, button placement, and CSS are preserved.
- Fixed snapshots storage fallback so snapshots are saved only under the active private session key.
- Fixed `/api/shopping` for Vercel Node API Route handling and more stable OpenAI JSON parsing.

## Version 2.6 Emergency Privacy Patch - 2026-05-30

- Screen display: v2.6
- ZIP: morning-flow-ai-v2.6.zip
- Next planned version: Version 2.7
- Fixed user data mixing risk by isolating local data per private app-start session.
- Disabled Google Calendar automatic reconnect; login is manual and account selection is requested every time.
