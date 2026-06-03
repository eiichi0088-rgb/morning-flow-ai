# CHANGELOG


## Version 2.14.3 - 2026-06-03

- Changed the morning plan shopping list section to render from the same cleaned shopping item source used by the shopping list page.
- Removed raw transcript-style shopping text from the morning plan shopping list display.
- Added display-level duplicate cleanup so only product name and quantity are shown.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and Follow Up Manager behavior are unchanged.

## Version 2.14.2 - 2026-06-03

- Cleaned up transcript noise in shopping list results after voice input.
- Shopping list save/display now removes long transcript-like items that contain multiple product names or multiple quantities.
- Intro phrases such as `今日買うもの`, `買うもの`, and `もの` are stripped from item names.
- Split purchase items such as `カイワレ 1つ`, `トマト 1個`, `きゅうり 1本`, and `合い挽き肉 500グラム` remain visible.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and Follow Up Manager behavior are unchanged.

## Version 2.14.1 - 2026-06-03

- Isolated shopping list items from morning todos and schedule generation.
- Shopping list output is limited to purchase items, while morning todos and schedule keep only explicit shopping actions such as `買い物へ行く`.
- Added guards against AI-generated shopping support chores such as `買い物リストを確認する`, `食材を冷蔵保存する`, `食材を冷凍保存する`, and `買った食材を整理する`.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and Follow Up Manager behavior are unchanged.

## Version 2.14.0 - 2026-06-03

- Started the Future AI UI design refresh while keeping existing MORNING FLOW AI features intact.
- Updated the home background, title area, microphone, primary buttons, calendar buttons, cards, and Follow Up Manager surfaces with dark navy, black, cyan glow, and glass-style styling.
- Added the home copy `Your Day. Optimized.` and `Speak. Organize. Move.`.
- Kept Apple Calendar, Google Calendar, Upstash Redis storage, shopping list, Follow Up Manager behavior, and Analytics behavior unchanged.

## Version 2.13.12 - 2026-06-03

- Changed Apple Calendar ICS event times from `TZID=Asia/Tokyo` to UTC `Z` timestamps for stricter iOS import compatibility.
- Added UTC `CREATED` and `LAST-MODIFIED` fields and kept CRLF line endings.
- Apple Calendar Debug now shows `icsTimeMode: utc-z`, `hasVTIMEZONE`, Content-Disposition mode, and a tappable ICS link.
- Added inline/attachment Content-Disposition A/B control for Apple Calendar import investigation.
- Upstash Redis storage, Google Calendar, shopping list, Follow Up Manager, and Analytics behavior are unchanged.

## Version 2.13.11 - 2026-06-03

- Changed Apple Calendar persistent ICS storage from Vercel KV naming to direct Upstash Redis REST configuration.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are now the primary storage environment variables.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` remain as compatibility fallbacks.
- Apple Calendar Debug reports successful storage as `upstash-redis`.
- Existing ICS generation, Google Calendar, shopping list, Follow Up Manager, and Analytics behavior are unchanged.

## Version 2.13.10 - 2026-06-03

- Replaced Apple Calendar import ID memory storage with Vercel KV REST storage.
- `/api/apple-calendar.ics?id=...` now reads the ICS from persistent KV storage with a 10 minute TTL.
- Apple Calendar Debug now shows the storage backend.
- Existing ICS generation, Google Calendar, shopping list, Follow Up Manager, and Analytics behavior are unchanged.

## Version 2.13.9 - 2026-06-03

- Investigated the long Base64 payload URL used by Apple Calendar import and added visible URL length diagnostics.
- Changed iPhone Safari and home screen PWA import to create a short-lived server import ID before opening `/api/apple-calendar.ics?id=...`.
- Kept the long payload URL only as a diagnostic fallback if short ID creation fails.
- Existing ICS generation, Google Calendar, shopping list, Follow Up Manager, and Analytics behavior are unchanged.

## Version 2.13.8 - 2026-06-03

- Changed Apple Calendar import from POST response handling to a direct GET `.ics` URL for iPhone Safari and home screen PWA.
- Added `/api/apple-calendar.ics?payload=...` so iOS receives a URL and response that both look like an ICS calendar file.
- Kept Apple Calendar Debug visible with API URL, response status, headers, fallback state, and appVersion.
- Existing ICS generation, Google Calendar, shopping list, Follow Up Manager, and Analytics behavior are unchanged.

## Version 2.13.7 - 2026-06-02

- Changed the iPhone Safari and home screen PWA Apple Calendar action from file sharing to direct calendar import.
- Apple mobile now posts the generated ICS to `/api/apple-calendar`, which returns the file as an inline `text/calendar` response for iOS Calendar import.
- Existing ICS content, Google Calendar registration, and shopping list behavior are unchanged.

## Version 2.13.6 - 2026-06-02

- Synced the app display version, package version, and lockfile version to v2.13.6.
- Reused the single appVersion constant for visible MORNING FLOW AI version labels.
- Apple Calendar ICS Fix, Google Calendar registration, and shopping list behavior are unchanged.

## Version 2.13.5 - 2026-06-02

- Renamed the Apple calendar action to Apple????????.
- Changed iPhone, Safari, and PWA Apple calendar handling to open the generated .ics file instead of relying on the download attribute.
- Preserved PC download behavior with the safe filename morning-flow-event.ics.
- Updated the .ics content for Apple Calendar compatibility with PRODID, METHOD:PUBLISH, CRLF line endings, and Asia/Tokyo DTSTART/DTEND values.
- Existing Google Calendar, shopping list, FOLLOW UP MANAGER, feedback, Analytics Lite, Developer Mode, and private storage behavior are unchanged.

## Version 2.13.4 - 2026-06-02

- Temporarily hid the Meal Database UI and the meal-to-shopping entry button from the shopping list screen.
- Kept the Meal Database code and recipe database in place as an experimental feature for a future restart.
- Disabled automatic meal-plan routing so the shopping list stays in the stable voice/manual add flow.
- Preserved normal shopping list functions: voice add, manual add, category grouping, check completion, and delete.
- Existing Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, Analytics Lite, feedback, Developer Mode, snapshots, and session behavior are unchanged.
## Version 2.13.3 - 2026-06-02

- Fixed Meal Database connection flow so known recipes always show ingredient candidates instead of an unknown recipe message.
- Added normalized meal matching for lasagna, tarako spaghetti, tarako pasta, mentaiko pasta, curry rice, curry, vegetable salad, and salad.
- Candidate generation now returns debug details for developer mode: extracted names, normalized names, matched recipe names, candidate count, and unknown state.
- Unknown recipe message is shown only when candidate count is 0.
- Dish names are not directly added to the shopping list during meal-plan flow.
- Added analytics feature_use events for meal_database_match and meal_to_shopping_add.

## Version 2.13.2 - 2026-06-02

- Added internal Meal Database 200 in src/services/recipeDatabase.ts.
- Meal ingredient generation now searches the internal recipe database first.
- Unknown dishes are not added to the shopping list as dish names.
- Unknown dishes show an unregistered recipe message and send meal_unknown_recipe analytics.
- Added meal_database analytics for successful database-based meal candidate generation.
- Web search, recipe site search, price comparison, inventory, nutrition, and calorie calculation remain out of scope for v2.13.2.
- Existing shopping list, FOLLOW UP MANAGER, Google Calendar, Apple Calendar export, Analytics Lite, feedback, Developer Mode, and private storage behavior are preserved.

## Version 2.13.1 - 2026-06-02

- Fixed meal-plan sentences being treated as shopping item names.
- Meal context such as 今日の夜ご飯, 夕飯, 晩ご飯, 今夜, 作る, にします, 食べたい, and 献立 now routes to ingredient candidate confirmation.
- Added lasagna ingredient expansion.
- Added tarako spaghetti ingredient expansion.
- Kept explicit shopping phrases such as 冷凍ラザニアを買う and たらこスパゲティーの素を買う as normal shopping items.
- Meal names are not added directly to the shopping list when meal-plan intent is detected.

## Version 2.13 - 2026-06-02

- Added Meal to Shopping List initial implementation inside the existing shopping list screen.
- Added "献立から作成" mode without adding a new home button.
- Meal mode supports microphone input, text input, serving size selection, ingredient candidate generation, candidate edit/delete, and adding confirmed items to the existing shopping list.
- Meal-generated shopping items use source: "meal_plan" and existing shopping category grouping.
- Added Analytics Lite feature_use event for meal_to_shopping when opening meal mode, generating candidates, and adding confirmed items.
- Web search, recipe site search, prices, inventory, nutrition, and calorie calculation are not included in v2.13.
- Existing shopping list, Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, feedback, Developer Mode, Analytics Lite, and private storage behavior are preserved.

## Version 2.12.6 - 2026-06-02

- Added Developer Mode gate for usage status details.
- General users now see only the anonymous usage statistics privacy notice.
- Developer-only view keeps total users, today users, total opens, feature ranking, anonymous userId, endpoint, send logs, and Analytics test tools.
- Added passcode unlock and localStorage persistence with mfai_developer_mode=true.
- Added Developer Mode release button that clears localStorage developer access.
- Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, feedback, and Analytics Lite event sending are preserved.

## Version 2.12.5 - 2026-06-02

- Changed Analytics Test to submit a real hidden-form POST to Apps Script so doPost can be checked in the browser Network tab.
- Added Fetch POST Test to compare the previous no-cors fetch behavior.
- Added Force Row Test for Apps Script deployments that support writeTest=1 GET diagnostics.
- Added transport names to the visible Analytics Lite send result.
- Existing anonymous Analytics payload remains timestamp, userId, eventType, feature, and version only.

## Version 2.12.4 - 2026-06-02

- Added Analytics Test button on the usage status screen.
- Added visible Analytics Lite send result and recent send log for troubleshooting.
- Added console.info / console.error output for Analytics Lite endpoint, payload, and fetch failures.
- Trimmed VITE_ANALYTICS_ENDPOINT before use and shows whether the production build has an endpoint configured.
- Analytics still sends only timestamp, anonymous userId, eventType, feature, and version; no user content is sent.

## Version 2.12.3 - 2026-06-02

- Added Analytics Lite initial implementation.
- Added anonymous userId generation and localStorage persistence.
- Added background Google Apps Script POST support via VITE_ANALYTICS_ENDPOINT for app_install, app_open, feature_use, and feedback_sent events.
- Added developer-facing usage status screen with privacy notice and summary placeholders.
- Analytics sends only timestamp, anonymous userId, eventType, feature, and version; no user content is sent.

## Version 2.12.2 - 2026-06-02

- Added FEEDBACK BOX initial implementation.
- Added a home screen button for ご意見・改善要望.
- Feedback supports microphone input, manual text input, local AI-style summary, editable send body, and mailto sending to eiichi0088@gmail.com.
- Sending opens the user's mail app with recipient, subject, summary, detail, type, urgency, timestamp, and optional sender name.
- Existing Google Calendar, Apple Calendar export, FOLLOW UP MANAGER, shopping, snapshots, and session separation are preserved.

## Version 2.12.1 - 2026-06-02

- Fixed voice input not being reflected in FOLLOW UP MANAGER.
- Added follow-up intent detection for callback, phone, reply, contact, LINE, email, response, and unread-reply language.
- Voice follow-ups are saved to the existing private follow-up storage key and update the home pending counts.
- Google Calendar, Apple Calendar export, normal task flow, shopping, snapshots, and session separation are preserved.

## Version 2.12.0 - 2026-06-02

- Added FOLLOW UP MANAGER initial implementation for missed replies and callback management.
- Added a home screen button for 未返信・折り返し with pending and due-today counts.
- Added follow-up registration with name, optional company, content, priority, due date, type, AI suggestion, completion history, and due-today notification.
- Follow-up data is stored separately per private session key and does not mix with schedule or shopping data.

## Version 2.11.6 - 2026-06-02

- Removed the Today Capture display card to avoid duplicating Editable Transcript.
- Removed the large AI Coach priority display from the main result screen.
- Removed the detailed 4-category classification, AI priority ranking, and AI advice detail block.
- Editable Transcript, microphone input, today's schedule, shopping list, future events, Google Calendar, and Apple Calendar export are preserved.

## Version 2.11.5 - 2026-06-02

- Removed the UPDATE INSTRUCTION flow from the main screen.
- The morning flow is now microphone input, Editable Transcript, then AI organization.
- Google Calendar, Apple Calendar export, shopping list, future events, session storage, and data storage are preserved.

## Version 2.11.4 - 2026-06-02

- Google Calendar confirmation screen URL time fix.
- The confirmation URL now sends dates as YYYYMMDDTHHMMSS with ctz=Asia/Tokyo so the Google Calendar creation screen matches the MORNING FLOW AI display time.
- Google Calendar API registration logic was not changed.
- Removed Google Calendar confirmation screen buttons and per-event Google open links to keep batch registration simple.

## Version 2.11.3 - 2026-06-02

- Google Calendar multiple-event error handling improvement.
- Partial success is now shown as success and failure counts instead of hiding failed events.
- Google Calendar API failure status and reason are shown for errors such as 401, 403, and 429.
- Added a 750ms wait between event registrations to reduce 429 Too Many Requests risk.
- Console logging now includes success count, failure count, and failure reasons.

## Version 2.11.2 - 2026-06-02

- Google Calendar multiple-event registration fix.
- Selected events are now sent sequentially to Google Calendar API and the created count is checked against the selected count.
- Added console logging for selected event count, each payload, and registration result.
## Version 2.11.1 - 2026-06-02

- Google Calendar registration time mismatch fix.
- Google Calendar payload now sends the same wall-clock start/end time shown in MORNING FLOW AI with `Asia/Tokyo`.
- Added console logging before registration for event title, startDateTime, endDateTime, and timeZone.

## Version 2.11 - 2026-06-01

- Version 2.10の機能を維持したAI整理結果の表示改善。
- 初期表示を「今日の目的」「今日の最優先」「今日のやること最大5つ」「今日のスケジュール最大5つ」「未来の予定」「Googleカレンダーへ追加」に整理。
- 今日の日付と未来の日付を分け、未来予定が今日のやることに混ざらないよう修正。
- 1つのマイク入力から今日の予定と買い物リストを自動分類するよう修正。
- 4カテゴリー分類、詳細な優先順位、AIアドバイスは「詳しく見る」を押した場合だけ表示。

## Version 2.10 - 2026-06-01

- Version 2.9 UIを維持した保存安定化修正。
- セッションIDをlocalStorageに保存し、画面更新後も同じユーザーは同じ保存キーを使うよう修正。
- snapshots保存キーを `session:{sessionId}:snapshots` 形式へ変更。
- 画面更新後も予定と買い物リストを同じセッションから復元できるよう修正。

## Version 2.9 - 2026-06-01

- Version 2.8 UIを維持したGoogle Calendar日付解析修正。
- 「6月3日仕事」「明日病院」「来週月曜日会議」のような日付表現をGoogleカレンダー登録日に反映。
- Googleカレンダー登録前の予定一覧に日付と時刻を表示。

## Version 2.8 - 2026-06-01

- Version 2.7 UIを維持したGoogle Calendar修正。
- Google Calendar OAuthを毎回アカウント選択する方式に固定。
- GoogleアクセストークンをlocalStorageへ保存せず、画面上の一時状態だけで扱うよう整理。
- Google Calendar API登録時の失敗理由を表示できるようエラーハンドリングを改善。
- 時刻解析できない予定でもGoogleカレンダー追加ボタンが使えるよう、登録用の安全な仮時刻を設定。
- `morning-flow-ai-v2.8.zip` として保存。
## Version 2.7 - 2026-06-01

- Version 2.6 UIを維持したSecurity & Stability Patch。
- snapshots保存の固定フォールバックキーを廃止し、起動ごとの専用キー `morning-flow-ai:v2.7:session:{sessionId}:snapshots` に統一。
- 旧固定snapshotキーと他セッションのsnapshotキーを起動時に読み込まないよう修正。
- `/api/shopping` をVercelのNode API Route形式へ修正。
- OpenAI買い物分類レスポンスのJSON解析とエラーハンドリングを安定化。
- `morning-flow-ai-v2.7.zip` として保存。

## Version 2.6 - 2026-05-30

- Emergency privacy/security patch. New feature development was stopped for this release.
- Removed personal sample schedule and replaced it with a neutral day-off sample.
- Added private per-app-start session storage keys for transcript drafts, snapshots, and shopping lists.
- Removed legacy shared localStorage keys on startup so another user's old data is not loaded.
- Disabled Google Calendar auto reconnect. Google authentication now starts only from the Google login button.
- Google login now requests account selection with `select_account consent`.
- Added a second calendar registration path: open selected events in Google Calendar's new event screen.
- Updated screen display to `v2.6` and saved as `morning-flow-ai-v2.6.zip`.



