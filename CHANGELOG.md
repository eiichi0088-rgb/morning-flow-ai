# CHANGELOG


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

