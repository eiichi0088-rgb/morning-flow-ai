# MORNING FLOW AI Versioning Rules

1. UI version label and ZIP version must match.
2. ZIP name must be `morning-flow-ai-vX.Y.zip`.
3. Always run `npm.cmd run build` before release.
4. ZIP must not include `node_modules`, `.npm-cache`, or `.env`.
5. ZIP should include `dist` after build.
6. v2.13.10 is based on v2.13.9 normal UI. Do not mix v3.0 or v3.1 UI.



## Version 2.13.10 Apple Calendar Persistent Storage Fix - 2026-06-03

- Screen display: v2.13.10
- ZIP: morning-flow-ai-v2.13.10.zip
- Next planned version: Version 2.13.11
- Apple Calendar import ID storage no longer uses server memory.
- Import IDs are stored in Vercel KV via `KV_REST_API_URL` and `KV_REST_API_TOKEN` with a 10 minute TTL.
- `/api/apple-calendar.ics?id=...` retrieves ICS content from KV so Vercel Function instance changes do not cause 404.
- Apple Calendar Debug remains visible and now shows the storage backend.
- Existing ICS generation, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.9 Apple Calendar Payload URL Investigation - 2026-06-03

- Screen display: v2.13.9
- ZIP: morning-flow-ai-v2.13.9.zip
- Next planned version: Version 2.14.0
- Apple Calendar Debug now shows ICS length, payload URL length, short URL length, and import ID.
- Primary iPhone Safari/PWA import creates a short-lived server import ID via POST, then opens `/api/apple-calendar.ics?id=...`.
- Long Base64 payload URL remains only as a diagnostic fallback when short ID creation fails.
- Existing ICS generation, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.8 Apple Calendar Native ICS Import Fix - 2026-06-03

- Screen display: v2.13.8
- ZIP: morning-flow-ai-v2.13.8.zip
- Next planned version: Version 2.13.9
- Apple Calendar import no longer uses POST as the primary iOS path.
- iPhone Safari and home screen PWA open `/api/apple-calendar.ics?payload=...` with `Content-Type: text/calendar; charset=utf-8` and inline `.ics` disposition.
- Data URL helper remains available for investigation, but the GET `.ics` URL is the first path.
- Apple Calendar Debug remains visible for API URL, status, headers, fallback, and appVersion.
- Existing ICS generation, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.7 Apple Calendar Direct Import Fix - 2026-06-02

- Screen display: v2.13.7
- ZIP: morning-flow-ai-v2.13.7.zip
- Next planned version: Version 2.13.8
- iPhone Safari and home screen PWA Apple Calendar action posts the generated ICS to `/api/apple-calendar` and opens the inline `text/calendar` response.
- Web Share API is no longer used for Apple Calendar import because Calendar is not a reliable share target for ICS files.
- Follow-up investigation found iOS still rejects client-generated data/blob/download paths for this flow.
- Existing ICS content, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.6 Version Display Sync Fix - 2026-06-02

- Screen display: v2.13.6
- ZIP: morning-flow-ai-v2.13.6.zip
- Next planned version: Version 2.13.7
- App UI version labels now use the shared appVersion constant.
- package.json and package-lock.json are synced to 2.13.6.
- Apple Calendar ICS Fix, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.5 Apple Calendar ICS Fix - 2026-06-02

- Screen display: v2.13.5
- ZIP: morning-flow-ai-v2.13.5.zip
- Next planned version: Version 2.13.6
- Apple Calendar action is renamed to Apple????????.
- iPhone, Safari, and PWA environments open the generated .ics file instead of using download-only behavior.
- PC environments can still download the .ics file as morning-flow-event.ics.
- ICS output keeps CRLF line endings, METHOD:PUBLISH, PRODID:-//MORNING FLOW AI//JP, and Asia/Tokyo event times.
- Existing Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.4 Shopping List Stabilization - 2026-06-02

- Screen display: v2.13.4
- ZIP: morning-flow-ai-v2.13.4.zip
- Next planned version: Version 2.13.5
- Meal Database UI and the meal-to-shopping entry button are hidden from the shopping list screen.
- Meal Database code and src/services/recipeDatabase.ts remain in the codebase as an experimental feature for v4.0 or later.
- Automatic meal-plan routing is disabled so the shopping list remains stable for voice/manual item entry.
- Existing shopping list, FOLLOW UP MANAGER, Google Calendar, Apple Calendar export, Analytics Lite, feedback, Developer Mode, snapshots, and session behavior are preserved.
## Version 2.13.3 Meal Database Connection Fix - 2026-06-02

- Screen display: v2.13.3
- ZIP: morning-flow-ai-v2.13.3.zip
- Next planned version: Version 2.13.4
- Known recipe matches always show ingredient candidates and clear the unknown recipe message.
- Unknown recipe message is shown only when candidate count is 0.
- Developer mode shows meal extraction and recipe matching debug details.
- Analytics adds meal_database_match and meal_to_shopping_add.
- Existing shopping list, FOLLOW UP MANAGER, Google Calendar, Apple Calendar export, Analytics Lite, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.2 Meal Database 200 - 2026-06-02

- Screen display: v2.13.2
- ZIP: morning-flow-ai-v2.13.2.zip
- Next planned version: Version 2.13.3
- Internal recipe database with 200 popular dishes is added.
- Meal candidate generation searches the internal database and never adds unknown dish names directly to the shopping list.
- Unknown recipes send meal_unknown_recipe analytics.
- Successful database candidate generation sends meal_database analytics.
- Web search and AI補完 for unknown recipes are reserved for later versions.
- Existing shopping list, FOLLOW UP MANAGER, Google Calendar, Apple Calendar export, Analytics Lite, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.1 Meal Plan Detection Fix - 2026-06-02

- Screen display: v2.13.1
- ZIP: morning-flow-ai-v2.13.1.zip
- Next planned version: Version 2.13.2
- Meal-plan context is detected before normal shopping item classification.
- Lasagna and tarako spaghetti are expanded into ingredient candidates instead of being added as dish names.
- Explicit shopping purchase text remains normal shopping list input.
- Existing shopping list, Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, feedback, Developer Mode, Analytics Lite, snapshots, and session behavior are preserved.

## Version 2.13 Meal to Shopping List - 2026-06-02

- Screen display: v2.13
- ZIP: morning-flow-ai-v2.13.zip
- Next planned version: Version 2.13.1
- Meal to Shopping List is added inside the existing shopping list screen only.
- No new home button is added.
- Meal mode supports voice/text input, ingredient candidates, serving size, candidate edit/delete, confirmed add to shopping list, existing category grouping, and meal_to_shopping analytics.
- Web search, recipe sites, prices, inventory, nutrition, and calorie calculation are reserved for later versions.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, feedback, Developer Mode, Analytics Lite, snapshots, and session behavior are preserved.

## Version 2.12.6 Developer Mode - 2026-06-02

- Screen display: v2.12.6
- ZIP: morning-flow-ai-v2.12.6.zip
- Next planned version: Version 2.12.7
- Usage status details and Analytics debug tools are hidden from general users.
- Developer Mode uses passcode unlock and mfai_developer_mode localStorage persistence.
- Developer Mode release clears mfai_developer_mode.
- Analytics Lite continues to collect only anonymous event data.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, feedback, snapshots, and session behavior are preserved.

## Version 2.12.5 Analytics Lite POST Debug Patch - 2026-06-02

- Screen display: v2.12.5
- ZIP: morning-flow-ai-v2.12.5.zip
- Next planned version: Version 2.12.6
- Analytics Test now uses hidden-form POST to make Apps Script doPost checks easier in Network tab.
- Fetch POST Test is kept as a comparison for no-cors fetch behavior.
- Force Row Test supports Apps Script writeTest=1 diagnostics when the script is updated.
- Analytics payload remains anonymous and content-free.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, feedback, snapshots, and session behavior are preserved.

## Version 2.12.4 Analytics Lite Debug Patch - 2026-06-02

- Screen display: v2.12.4
- ZIP: morning-flow-ai-v2.12.4.zip
- Next planned version: Version 2.12.5
- Analytics Test button is added to the usage status screen.
- Analytics Lite send result, endpoint configured state, recent send log, and console logs are added for troubleshooting.
- Analytics payload remains anonymous and content-free.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, feedback, snapshots, and session behavior are preserved.

## Version 2.12.3 Analytics Lite - 2026-06-02

- Screen display: v2.12.3
- ZIP: morning-flow-ai-v2.12.3.zip
- Next planned version: Version 2.12.4
- Analytics Lite is added using anonymous userId and optional Google Apps Script endpoint.
- Endpoint env var: VITE_ANALYTICS_ENDPOINT.
- No names, emails, phone numbers, schedule content, shopping content, notes, or feedback text are sent as analytics data.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, feedback, snapshots, and session behavior are preserved.

## Version 2.12.2 FEEDBACK BOX - 2026-06-02

- Screen display: v2.12.2
- ZIP: morning-flow-ai-v2.12.2.zip
- Next planned version: Version 2.12.3
- FEEDBACK BOX is added with microphone input, manual text input, summary, editable body, and mailto sending.
- Feedback mail recipient: eiichi0088@gmail.com.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, snapshots, and session behavior are preserved.

## Version 2.12.1 FOLLOW UP Voice Routing Patch - 2026-06-02

- Screen display: v2.12.1
- ZIP: morning-flow-ai-v2.12.1.zip
- Next planned version: Version 2.12.2
- Voice input with follow-up intent is routed into FOLLOW UP MANAGER.
- Follow-up data remains under morning-flow-ai:session:{sessionId}:follow-ups.
- Google Calendar, Apple Calendar export, normal tasks, shopping, snapshots, and session behavior are preserved.

## Version 2.12.0 FOLLOW UP MANAGER - 2026-06-02

- Screen display: v2.12.0
- ZIP: morning-flow-ai-v2.12.0.zip
- Next planned version: Version 2.12.1
- FOLLOW UP MANAGER is added as separate data from schedules and shopping.
- Follow-up storage key: morning-flow-ai:session:{sessionId}:follow-ups.
- Google Calendar, Apple Calendar export, date parsing, session ID, snapshots, shopping list, and microphone behavior are preserved.

## Version 2.11.6 Simple Result UI Patch - 2026-06-02

- Screen display: v2.11.6
- ZIP: morning-flow-ai-v2.11.6.zip
- Next planned version: Version 2.11.7
- Today Capture, 4-category classification, and large AI priority displays are removed.
- Editable Transcript, microphone, AI organization, Google Calendar, Apple Calendar export, shopping, future events, snapshots, and session behavior are preserved.

## Version 2.11.5 Update Instruction Removal Patch - 2026-06-02

- Screen display: v2.11.5
- ZIP: morning-flow-ai-v2.11.5.zip
- Next planned version: Version 2.11.6
- UPDATE INSTRUCTION section and update-mode UI are removed.
- Microphone, Editable Transcript, AI organization, Google Calendar, Apple Calendar export, shopping, future events, snapshots, and session behavior are preserved.

## Version 2.11.4 Google Calendar Confirmation URL Patch - 2026-06-02

- Screen display: v2.11.4
- ZIP: morning-flow-ai-v2.11.4.zip
- Next planned version: Version 2.11.5
- UI, CSS, layout, Google Calendar API registration, shopping, snapshots, and session behavior are preserved.
- Google Calendar confirmation screen URLs use YYYYMMDDTHHMMSS and ctz=Asia/Tokyo.
- Google Calendar confirmation screen buttons are removed; the API batch registration button remains the only Google registration path.

## Version 2.11.3 Google Calendar Partial Success Patch - 2026-06-02

- Screen display: v2.11.3
- ZIP: morning-flow-ai-v2.11.3.zip
- Next planned version: Version 2.11.4
- UI, CSS, layout, microphone, shopping, snapshots, and session behavior are preserved.
- Google Calendar registration shows success count, failure count, and API failure reasons.
- Event registration waits 750ms between requests to reduce 429 Too Many Requests risk.

## Version 2.11.2 Google Calendar Multi-Event Patch - 2026-06-02

- Screen display: v2.11.2
- ZIP: morning-flow-ai-v2.11.2.zip
- Next planned version: Version 2.11.3
- UI, CSS, layout, microphone, shopping, snapshots, and session behavior are preserved.
- Google Calendar selected event count and created event count must match.
## Version 2.11.1 Google Calendar Time Patch - 2026-06-02

- Screen display: v2.11.1
- ZIP: morning-flow-ai-v2.11.1.zip
- Next planned version: Version 2.11.2
- UI, CSS, layout, microphone, shopping, snapshots, and session behavior are preserved.
- Google Calendar start/end dateTime uses the same wall-clock time shown in MORNING FLOW AI and `Asia/Tokyo`.

## Version 2.11 Simple Morning View Patch - 2026-06-01

- Screen display: v2.11
- ZIP: morning-flow-ai-v2.11.zip
- Next planned version: Version 2.12
- Version 2.10 Google Calendar, date parsing, session ID, snapshots, shopping list, and microphone behavior are preserved.
- Initial AI result view separates today's items from future calendar events.
- Future dated events remain eligible for Google Calendar registration on their parsed dates.
- One microphone input is classified into today's schedule items and shopping list items.

## Version 2.10 Storage Stability Patch - 2026-06-01

- Screen display: v2.10
- ZIP: morning-flow-ai-v2.10.zip
- Next planned version: Version 2.11
- Version 2.9 UI, microphone button, layout, button placement, and CSS are preserved.
- Session ID is saved to localStorage so refresh keeps the same private session.
- snapshots storage key is `session:{sessionId}:snapshots`.

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


