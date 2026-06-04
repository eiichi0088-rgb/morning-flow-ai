# MORNING FLOW AI Versioning Rules

1. UI version label and ZIP version must match.
2. ZIP name must be `morning-flow-ai-vX.Y.zip`.
3. Always run `npm.cmd run build` before release.
4. ZIP must not include `node_modules`, `.npm-cache`, or `.env`.
5. ZIP should include `dist` after build.
6. v3.6.0 is based on v3.5.3 plus Shopping List Supabase sync.


## Version 3.6.0 Shopping List Supabase Sync - 2026-06-04

- Screen display: v3.6.0
- ZIP: morning-flow-ai-v3.6.0.zip
- Next planned version: Version 3.6.1
- Shopping List syncs through Supabase `shopping_items`.
- Shopping reads/writes are scoped by logged-in `user_id` and sent with the authenticated access token.
- LocalStorage backup remains in place.
- Shopping List refreshes from Supabase every 15 seconds.
- Recommended RLS: authenticated users can select/insert/update/delete only rows where `user_id = auth.uid()`.

## Version 3.5.3 Follow Up Auth Token RLS Fix - 2026-06-04

- Screen display: v3.5.3
- ZIP: morning-flow-ai-v3.5.3.zip
- Next planned version: Version 3.5.4
- Follow Up Supabase REST requests now send the logged-in user's access token in the Authorization header.
- Fetch, insert, update, and delete run as the authenticated user instead of the anon role.
- Follow Up Save Debug shows Auth Mode.

## Version 3.5.2 Version Display Sync - 2026-06-04

- Screen display: v3.5.2
- ZIP: morning-flow-ai-v3.5.2.zip
- Next planned version: Version 3.5.3
- Visible MORNING FLOW AI version display is synced from `package.json`.

## Version 3.5.1 Follow Up Save Fix Debug - 2026-06-04

- Screen display: v3.5.1
- ZIP: morning-flow-ai-v3.5.1.zip
- Next planned version: Version 3.5.2
- AI Inbox Follow Up save failures now show current user id, payload `user_id`, response status, response body, error, and payload preview.
- Follow Up Supabase Debug includes INSERT user id and payload details.

## Version 3.5.0 User Data Isolation - 2026-06-04

- Screen display: v3.5.0
- ZIP: morning-flow-ai-v3.5.0.zip
- Next planned version: Version 3.5.1
- Follow Up Manager scopes Supabase reads and writes by `follow_ups.user_id`.
- Insert payload stores the logged-in Supabase Auth user id as `user_id`.
- Fetch, update, complete, reopen, and delete requests include the current user's `user_id`.
- Supabase SQL prerequisite: add `user_id uuid references auth.users(id)` and index it.
- Recommended RLS: authenticated users can select/insert/update/delete only rows where `user_id = auth.uid()`.

## Version 3.4.0 User Authentication Foundation - 2026-06-04

- Screen display: v3.4.0
- ZIP: morning-flow-ai-v3.4.0.zip
- Next planned version: Version 3.4.1
- Added Supabase Auth email/password login and signup screen.
- App body is shown only after login.
- Added logged-in user display and logout button.
- Data separation and RLS-wide changes are intentionally not included.

## Version 3.3.0 AI Inbox Auto Classification - 2026-06-04

- Screen display: v3.3.0
- ZIP: morning-flow-ai-v3.3.0.zip
- Next planned version: Version 3.3.1
- AI Inbox items now store and display classification confidence.
- `AIで整理する` routes high-confidence Inbox items into the matching workflow input.
- Manual category changes remain available.

## Version 3.2.0 AI Inbox Foundation - 2026-06-04

- Screen display: v3.2.0
- ZIP: morning-flow-ai-v3.2.0.zip
- Next planned version: Version 3.2.1
- Added AI Inbox page for voice-first capture.
- Voice input is saved to AI Inbox before being organized into specific workflows.
- AI Inbox supports category candidates, unprocessed/organized state, and `AIで整理する`.

## Version 3.1.0 Follow Up Sync Stability - 2026-06-04

- Screen display: v3.1.0
- ZIP: morning-flow-ai-v3.1.0.zip
- Next planned version: Version 3.1.1
- Follow Up Manager shows the latest Supabase sync time.
- Follow Up Manager has a manual `今すぐ同期` button and `同期中...` status.
- Supabase Debug is collapsed by default and can be opened when needed.

## Version 3.0.3 Follow Up Person Name Extraction Fix - 2026-06-04

- Screen display: v3.0.3
- ZIP: morning-flow-ai-v3.0.3.zip
- Next planned version: Version 3.0.4
- Follow Up person extraction keeps suffix names such as `柴田君`, `高橋さん`, and `小田原さん` intact.
- Follow Up Debug now shows `Original Person` and `Extracted Person`.
- Follow Up review candidates show a person-name check before saving.

## Version 3.0.2 Supabase Follow Up Insert ID Fix - 2026-06-04

- Screen display: v3.0.2
- ZIP: morning-flow-ai-v3.0.2.zip
- Next planned version: Version 3.0.3
- Follow Up Supabase INSERT payload now includes required `id`.
- INSERT payload includes `title`, `person_name`, `action_type`, `memo`, `status`, `created_at`, `updated_at`, and `completed_at`.
- Uses the existing generated Follow Up item id for Supabase records.

## Version 3.0.1 Supabase Debug Visibility Fix - 2026-06-04

- Screen display: v3.0.1
- ZIP: morning-flow-ai-v3.0.1.zip
- Next planned version: Version 3.0.2
- Follow Up Supabase Debug now always shows `Last Operation`, `Response`, `Rows`, `Body`, and `Error`.
- Empty Debug values display `not checked`, `not received`, or `none` instead of hiding the row.
- Follow Up sync behavior is unchanged.

## Version 3.0.0 Supabase Sync Phase 1 - 2026-06-04

- Screen display: v3.0.0
- ZIP: morning-flow-ai-v3.0.0.zip
- Next planned version: Version 3.0.1
- Supabase sync starts with Follow Up Manager only.
- Added Supabase environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Follow Up Manager supports Supabase load, add, complete, reopen, and delete for the `follow_ups` table.
- localStorage backup remains in place.
- Shopping list, morning schedule, Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.17.0 Follow Up Completion History - 2026-06-04

- Screen display: v2.17.0
- ZIP: morning-flow-ai-v2.17.0.zip
- Next planned version: Version 2.17.1
- Completed Follow Up tasks remain stored and move to `完了履歴`.
- Completion timestamp is shown on completed history cards.
- Completed history sorts by latest completion time first.
- Completed tasks can be restored to `未対応`.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, morning schedule logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.16.0 Follow Up Review Screen - 2026-06-04

- Screen display: v2.16.0
- ZIP: morning-flow-ai-v2.16.0.zip
- Next planned version: Version 2.16.1
- Follow Up Manager now creates review candidates instead of saving immediately after `フォローを整理する`.
- Users can edit contact, content, kind, status, due date, and optional time before saving.
- Users can delete individual review candidates or cancel the review without changing saved Follow Up items.
- Transcript stays visible for comparison with generated review candidates.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, morning schedule logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.15.7 Follow Up Person Split Dedupe Fix - 2026-06-04

- Screen display: v2.15.7
- ZIP: morning-flow-ai-v2.15.7.zip
- Next planned version: Version 2.15.8
- Follow Up Manager splits consecutive people in the same line, such as `高橋さんにLINEの返信高見さんに見積もりのお願い`.
- Person names are cleaned when task words are attached before the name.
- Duplicate tasks with the same person and same content are merged into one item.
- Follow Up Debug shows original text, split text, detected people, generated count, duplicate exclusion count, and exclusion reasons.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, morning schedule logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.15.6 Version Display Sync Fix - 2026-06-04

- Screen display: v2.15.6
- ZIP: morning-flow-ai-v2.15.6.zip
- Next planned version: Version 2.15.7
- Visible MORNING FLOW AI version labels are generated from `package.json` at build time.
- `src/main.tsx` reads the build-time `__APP_VERSION__` value instead of a manually edited literal.
- Follow Up Accuracy behavior, Future AI UI, Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, morning schedule logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.15.5 Follow Up Accuracy Upgrade - 2026-06-03

- Screen display: v2.15.5
- ZIP: morning-flow-ai-v2.15.5.zip
- Next planned version: Version 2.15.6
- Follow Up Capture prioritizes person-boundary splitting when multiple people are detected.
- If detected person count is greater than generated item count, the transcript is re-evaluated by person boundary.
- Follow Up Debug shows detected person count, generated item count, split strategy, re-evaluation status, and detected names.
- Transcript remains visible after `フォローを整理する`.
- Future AI UI styling is preserved.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, morning schedule logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.15.4 Voice Input Guide UI - 2026-06-03

- Screen display: v2.15.4
- ZIP: morning-flow-ai-v2.15.4.zip
- Next planned version: Version 2.15.5
- Added collapsible `話し方の例を見る` guide cards to the morning schedule, shopping list, and Follow Up Manager pages.
- Guide examples help first-time users understand what to speak before using AI organization.
- Future AI UI styling is preserved with glass cards, cyan glow accents, and dark background.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, Follow Up logic, shopping list logic, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.15.3 Follow Up Transcript Persistence Fix - 2026-06-03

- Screen display: v2.15.3
- ZIP: morning-flow-ai-v2.15.3.zip
- Next planned version: Version 2.15.4
- Follow Up Capture keeps the Editable Transcript after `フォローを整理する`.
- Users can compare the original transcript with generated follow-up cards and keep editing the transcript.
- Transcript deletion remains limited to explicit user actions such as `全文削除`.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.


## Version 2.15.2 Follow Up Person-Based Split Fix - 2026-06-03

- Screen display: v2.15.2
- ZIP: morning-flow-ai-v2.15.2.zip
- Next planned version: Version 2.15.3
- Follow Up Capture splits cases when the person changes.
- Person detection supports `さん`, `君`, `様`, and `氏`.
- Each generated follow-up keeps its own contact, content, due date, and status.
- Debug logging reports detected person count, generated item count, and detected names.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.15.1 Follow Up Multi-Item Split Fix - 2026-06-03

- Screen display: v2.15.1
- ZIP: morning-flow-ai-v2.15.1.zip
- Next planned version: Version 2.15.2
- Follow Up Capture splits multiple spoken or typed cases into multiple saved cards.
- Split candidates include line breaks, `そして`, `あと`, `それと`, and contact-name changes such as `高見さんに` / `近藤さんに`.
- Estimate/request phrases such as `見積もり` and `もらう` are recognized as follow-up intent.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list behavior, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.15.0 Follow Up Manager Voice Input UI - 2026-06-03

- Screen display: v2.15.0
- ZIP: morning-flow-ai-v2.15.0.zip
- Next planned version: Version 2.15.1
- FOLLOW UP MANAGER now has microphone input, editable transcript review, `全文削除`, inline delete confirmation, and `フォローを整理する`.
- Voice-captured follow-up text is saved as an incomplete follow-up and reflected in home pending/today counts.
- Follow-up status labels support `未対応`, `連絡済み`, `返信待ち`, and `完了`.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, shopping list logic, morning plan logic, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.14.6 Food Event Classification Fix - 2026-06-03

- Screen display: v2.14.6
- ZIP: morning-flow-ai-v2.14.6.zip
- Next planned version: Version 2.14.7
- Food names inside event phrases are not treated as shopping items.
- Time expressions are schedule candidates first, including `16時半`.
- Food event expressions such as `食べる`, `ランチ`, `夕食`, `朝食`, `外食`, and `食事する` stay in todos and schedule.
- Shopping list updates require shopping context such as `買う`, `購入`, `今日買うもの`, or `買い物リスト`.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.14.5 Transcript Position and Clear Button Fix - 2026-06-03

- Screen display: v2.14.5
- ZIP: morning-flow-ai-v2.14.5.zip
- Next planned version: Version 2.14.6
- Editable Transcript is shown directly below the microphone area on the morning plan page.
- AI organize button remains near the transcript editor.
- `全文削除` clears the transcript and temporary speech input after inline confirmation near the button.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, shopping list logic, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.14.4 Shopping List Reset and Selective Share Fix - 2026-06-03

- Screen display: v2.14.4
- ZIP: morning-flow-ai-v2.14.4.zip
- Next planned version: Version 2.14.5
- Shopping page has input cleanup actions: `全文削除` and `新しく作る`.
- Shopping result items have separate share-selection checkboxes.
- Family share sends selected items only, with confirmation before all-item sharing when no item is selected.
- Shopping reset confirmation is shown inline near the reset button.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, feedback, Developer Mode, snapshots, session behavior, and Future AI UI design are preserved.

## Version 2.14.3 Shopping List Source Cleanup - 2026-06-03

- Screen display: v2.14.3
- ZIP: morning-flow-ai-v2.14.3.zip
- Next planned version: Version 2.14.4
- Morning plan shopping list display now uses the same cleaned shopping item source as the shopping list page.
- Raw transcript text is not rendered in the morning plan shopping list section.
- Display-level duplicate cleanup keeps only product name and quantity.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.14.2 Shopping List Transcript Noise Cleanup - 2026-06-03

- Screen display: v2.14.2
- ZIP: morning-flow-ai-v2.14.2.zip
- Next planned version: Version 2.14.3
- Shopping list save/display filters transcript-like long items that contain multiple product names or multiple quantities.
- Intro phrases such as `今日買うもの`, `買うもの`, and `もの` are removed from item names.
- Split product items remain visible with quantities, while combined transcript noise is hidden.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.14.1 Shopping List Isolation Fix - 2026-06-03

- Screen display: v2.14.1
- ZIP: morning-flow-ai-v2.14.1.zip
- Next planned version: Version 2.14.2
- Shopping list storage is limited to purchase items only.
- Morning todos and schedule keep explicit shopping actions only, such as `買い物へ行く` or `スーパーへ行く`.
- AI-generated shopping support chores are filtered out, including `買い物リストを確認する`, `食材を冷蔵保存する`, `食材を冷凍保存する`, and `買った食材を整理する`.
- Apple Calendar, Google Calendar, Upstash Redis storage, Analytics Lite, FOLLOW UP MANAGER behavior, feedback, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.14.0 Future AI UI Design Start - 2026-06-03

- Screen display: v2.14.0
- ZIP: morning-flow-ai-v2.14.0.zip
- Next planned version: Version 2.14.1
- UI refresh is CSS-first and keeps the existing app structure.
- Home background, title area, microphone, primary buttons, calendar buttons, cards, and FOLLOW UP MANAGER surfaces use dark navy, black, cyan glow, and glass-style styling.
- Home copy now includes `Your Day. Optimized.` and `Speak. Organize. Move.`.
- Apple Calendar, Google Calendar, Upstash Redis storage, shopping list, FOLLOW UP MANAGER behavior, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.12 Apple Calendar iOS ICS Format Fix - 2026-06-03

- Screen display: v2.13.12
- ZIP: morning-flow-ai-v2.13.12.zip
- Next planned version: Version 2.13.13
- Apple Calendar ICS no longer emits `DTSTART;TZID=Asia/Tokyo` or `DTEND;TZID=Asia/Tokyo`.
- DTSTART, DTEND, DTSTAMP, CREATED, and LAST-MODIFIED use UTC `Z` timestamps.
- VTIMEZONE remains absent and Debug reports `hasVTIMEZONE: false`.
- Apple Calendar Debug reports `icsTimeMode: utc-z` and Content-Disposition mode.
- Inline/attachment Content-Disposition A/B control and tappable ICS link were added.
- Upstash Redis storage, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

## Version 2.13.11 Upstash Redis Free Storage Fix - 2026-06-03

- Screen display: v2.13.11
- ZIP: morning-flow-ai-v2.13.11.zip
- Next planned version: Version 2.13.12
- Apple Calendar ICS storage now uses direct Upstash Redis REST settings first.
- Required primary environment variables: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Compatibility environment variables remain supported: `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- Import IDs are stored with a 10 minute TTL and retrieved by `/api/apple-calendar.ics?id=...`.
- Apple Calendar Debug reports successful storage as `upstash-redis`.
- Existing ICS generation, Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, snapshots, and session behavior are preserved.

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


