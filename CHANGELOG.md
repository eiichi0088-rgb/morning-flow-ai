# CHANGELOG

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

