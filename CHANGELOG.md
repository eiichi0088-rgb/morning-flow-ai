# CHANGELOG

## Version 3.0 - 2026-05-31

- Version 2.x 系を終了し、MORNING FLOW AI v3.0 として開発を開始
- 画面表示、package version、リリースZIP名を v3.0 に統一
- v3専用の個人プロファイル保存へ移行し、v2.x共有localStorageと起動ごとの旧セッションキーを読み込まないように変更
- transcript drafts、snapshots、買い物リスト、連絡忘れを `morning-flow-ai:v3:owner:{ownerId}:...` の名前空間に分離
- 将来のGoogleユーザー単位/DB保存へ移行しやすいよう、保存キーをセッション単位ではなく owner 単位の設計に変更
- Googleカレンダーは自動再接続せず、毎回 `select_account consent` でアカウント選択を要求
- Googleカレンダー登録前に選択予定の確認ダイアログを表示し、誤登録リスクを低減
- 登録失敗時にGoogleアカウントと権限を確認できるエラーメッセージへ改善
- 買い物リストで音声入力/テキスト入力、AIカテゴリ分け、数量・単位保持、チェック、編集、削除、共有文作成を整理
- 電話折り返し、LINE返信、メール返信、SNS/DM返信を未完了リストとして保存する連絡忘れチェックを追加
- 朝のAI整理に買い物候補と連絡忘れを含めて、今日やること・目的・優先順位・推奨タイムスケジュールへ反映
- `morning-flow-ai-v3.0.zip` として保存

## Version 2.6 - 2026-05-30

- Emergency privacy/security patch. New feature development was stopped for this release.
- Removed personal sample schedule and replaced it with a neutral day-off sample.
- Added private per-app-start session storage keys for transcript drafts, snapshots, and shopping lists.
- Removed legacy shared localStorage keys on startup so another user's old data is not loaded.
- Disabled Google Calendar auto reconnect. Google authentication now starts only from the Google login button.
- Google login now requests account selection with `select_account consent`.
- Added a second calendar registration path: open selected events in Google Calendar's new event screen.
- Updated screen display to `v2.6` and saved as `morning-flow-ai-v2.6.zip`.
