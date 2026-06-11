# CHANGELOG

## Version 6.4.1 - 2026-06-11

- Changed the assistant default model from `gpt-5-mini` to `gpt-4o-mini` to avoid Vercel 30-second timeouts on compound utterances.
- Added a 25-second AbortController timeout around the OpenAI Responses API request.
- Returns a friendly timeout message before Vercel forcefully terminates the function.
- Restores the original morning conversation text on AI connection failure.
- Blocks voice finalization while AI processing is already in progress to reduce duplicate sends.
- Marks AI connection failure messages with an error chat style.
- Keeps True Conversation First schema, `understanding`, `save_candidates`, `clarification`, classification instructions, Review Draft save flow, Supabase, User Isolation Fix, and Google Calendar behavior unchanged.

## Version 6.4.0 - 2026-06-11

- Added True Conversation First response fields to `/api/assistant`: `understanding`, `save_candidates`, and `clarification`.
- Updated the assistant schema and prompt so understood utterance parts are kept in `understanding.understood_items` and save-ready items are classified into `save_candidates`.
- Added frontend `normalizeConversationFirstResult` and `applyConversationFirstResult`.
- The home conversation flow now prioritizes `save_candidates` for Review Draft generation, falling back to legacy arrays only when needed.
- Conversation Understanding Card now uses `understanding.summary`, `understanding.understood_items`, save candidate counts, and clarification questions.
- Keeps legacy arrays, old recovery/debug code, Review Draft confirmation, Supabase persistence, User Isolation Fix, Google Calendar registration, shopping save, and Follow Up save behavior unchanged.

## Version 6.3.0 - 2026-06-11

- Added a Conversation Understanding Card before Review Draft in the home Conversation First flow.
- Shows the AI understanding summary from `assistant_reply` separately from structured save candidates.
- Adds frontend `ConversationUnderstanding` display data with understood items, suggested save targets, and a confidence note.
- Shows saved candidate counts for schedules, shopping, Follow Up, and Google Calendar candidates so users can notice when understood content is not part of Review Draft.
- Keeps Review Draft save behavior, Supabase persistence, Google Calendar handling, User Isolation Fix, OpenAI prompt design, and classification logic unchanged.

## Version 6.2.3 - 2026-06-11

- Strengthened the AI organizing loading state shown immediately after the Morning AI organize action starts.
- Added a clear processing card that says the app is checking today's schedule, shopping, Follow Up, and calendar candidates.
- Added animated dots to the AI organizing card and button label.
- Marks the organize button as busy and keeps it disabled while processing to prevent duplicate sends.
- Keeps the error path retry-safe by clearing loading state and showing the existing retry message.
- Kept AI classification logic, OpenAI prompts, save logic, and user isolation behavior unchanged.

## Version 6.2.2 - 2026-06-11

- Added a clear AI processing state while Morning Voice is being organized into Review Draft.
- Disables voice/organize controls during AI processing to prevent duplicate submissions.
- Shows a retry-safe error message when organization fails.
- Improved the shopping checklist by separating unpurchased and purchased items.
- Keeps shopping checkbox state saved through the existing `completed` / Supabase `checked` mapping.
- Preserves user isolation behavior from v6.2.1 and keeps shopping rows scoped to the active user.
- Kept LLM prompts, classification rules, and structured output architecture unchanged.

## Version 6.2.1 - 2026-06-11

- Fixed user isolation around logout, auth switching, localStorage, React state, and Supabase shopping sync.
- Clears volatile local personal data on logout, including shopping, transcript draft, Follow Up, AI Inbox, and snapshot keys.
- Resets temporary app state before loading data for a newly authenticated user.
- Prevents authenticated users from loading stale localStorage drafts or shopping lists as the source of truth after login.
- Adds a second client-side ownership check so Supabase shopping rows are displayed only when `user_id` matches the current user.
- Blocks stale shopping uploads if the active auth user changes before a save finishes.
- Adds Developer Debug fields for current user, shopping fetch count, local shopping storage keys, cleared keys, and auth reset status.
- Kept the LLM-first assistant prompt and classification behavior unchanged.

## Version 6.2.0 - 2026-06-10

- Strengthened the LLM-first architecture by keeping OpenAI structured output as the source of truth.
- Added minimal post-LLM deduplication for schedules, shopping items, Follow Up items, Google Calendar candidates, and priority suggestions.
- Preserved GPT-provided shopping quantities instead of reprocessing shopping text during Review Draft save.
- Preserved GPT-provided date/time text through the Review Draft path.
- Aligned Review Draft shopping items and saved shopping items so the confirmed content matches what the user reviewed.
- Avoided adding keyword classification rules or frontend re-extraction logic.

## Version 6.1.0 - 2026-06-10

- Auto-generates the Review Draft as soon as OpenAI structured JSON returns schedule, shopping, Follow Up, or Google Calendar candidates.
- Removes the need for a separate "全部追加して" step in the normal v6 flow.
- Treats "お願いします", "保存して", "これでOK", "登録して", and "進めて" as save approval when a Review Draft is pending.
- Prevents empty Review Cards by opening review only when the parsed JSON produced draft items.
- Keeps OpenAI JSON as the source of truth without frontend reclassification or re-extraction.
- Developer Debug now shows Draft Auto Generated, Draft Item Count, Pending Save, and Last Parsed JSON details.

## Version 6.0.0 - 2026-06-10

- Reworked the normal assistant path into Pure LLM Secretary Core.
- `/api/assistant` now asks OpenAI for strict structured JSON instead of using function tool calls as the primary app action path.
- The frontend now applies OpenAI JSON directly to the Review Draft for schedules, shopping items, Follow Up items, Google Calendar candidates, and priority suggestions.
- Normal conversation flow no longer depends on regex recovery, entity rejection filters, clause segmentation, action repair, raw tool call counts, or lost entity counting.
- Save commands display the current Review Draft instead of asking the frontend to re-extract entities.
- Developer Debug now emphasizes JSON Parse Success, Last LLM JSON, structured item counts, needs_clarification, clarifying_question, and parse error.
- Preserved v5.1.1 voice stability and the existing AI secretary UI.

## Version 5.3.3 - 2026-06-10

- Strengthened the OpenAI assistant system prompt so compound utterances must trigger multiple parallel tool calls instead of choosing one entity.
- Clarified tool descriptions for schedule, shopping, Follow Up, and Google Calendar candidates.
- Added compound-sentence recovery for bank visits, shopping items, Follow Up actions, and future timed calendar candidates when Raw Tool Calls Count is 0.
- Improved assistant action deduplication so LLM tool calls and recovery actions do not duplicate the same candidate.
- Added support for natural approval phrases such as "全部追加して", "お願い", "それで", "保存して", and "これでOK" as add-all intent.
- Preserved v5.3.2 Semantic Entity Filter Fix and Developer Debug visibility.


## Version 5.3.2 - 2026-06-10

- Made the top-right Sparkles button open Developer Debug when Developer Mode is enabled.
- Fixed the Semantic Entity filter so Google Calendar candidates are kept when they have a title and explicit time even if the date field is empty.
- Fixed the Follow Up filter so a non-empty title can be used as a fallback when person_name/action are missing from the tool payload.
- Added Follow Up Reject Reason and Calendar Reject Reason to Developer Debug.
- Clarified the add_follow_up tool schema descriptions for required person_name and action fields.
- Added a Settings screen Developer Mode passcode toggle so the debug button can be enabled on real devices.
- Added a screenshot-friendly Developer Debug dialog with a close button.
- The dialog shows Assistant Mode, Assistant Lines Count, Raw Tool Calls Count, Actions Count, Extracted Count, Schedule Count, Shopping Count, Follow Up Count, Calendar Count, Lost Entity Count, Last Assistant Response, Last Actions, and Fallback Error.
- Kept Developer Debug hidden from normal users by rendering the clickable debug button and dialog only when Developer Mode is on.
- Preserved the existing inline Assistant Debug and Voice Recognition Debug panels for Developer Mode.

## Version 5.3.1 - 2026-06-10

- Added Full Entity Coverage rules to the LLM instructions so extracted candidates must not be dropped before reply or tool calling.
- Full coverage actions are now merged with API, context repair, and text recovery actions to keep all detected entities through the pipeline.
- Added entity coverage reporting and `Lost Entity Count`; the client logs a warning if expected entities are missing after action repair.
- Future exact-time events are counted as calendar candidates rather than duplicated as ordinary schedule items.
- Developer Debug now shows Extracted Count, Schedule Count, Shopping Count, Follow Up Count, Calendar Count, and Lost Entity Count.
- Preserved v5.3.0 semantic classification boundaries, v5.2.2 response/tool recovery, and v5.1.1 voice stability.

## Version 5.3.0 - 2026-06-10

- Reframed the LLM system instructions around Semantic Entity Extraction for schedule, shopping, Follow Up, Google Calendar candidates, priority suggestions, and assistant replies.
- Strengthened semantic rules so grocery items stay in shopping, person-contact actions stay in Follow Up, and long utterances are not stored as Follow Up.
- Improved recovery shopping extraction for clauses such as "帰りに牛乳2本と卵1パックを買って".
- Improved recovery Follow Up extraction so "田中さんへLINE" is isolated from the rest of the utterance.
- Prevented vague time expressions such as "明日の午前中" from becoming 09:00 Google Calendar candidates.
- Semantic recovery carries the utterance-level date, so "明日の...18時から会合" becomes a dated Google Calendar candidate.
- Google Calendar candidates now require an explicit parsed clock time, keeping vague schedule items out of calendar export candidates.
- Developer Debug now shows extracted schedule items, shopping items, Follow Up items, and calendar candidates.
- Preserved v5.2.2 LLM response and tool recovery plus v5.1.1 voice stability.

## Version 5.2.2 - 2026-06-10

- Recovered assistant response extraction for OpenAI Responses API by recursively reading `output_text`, message content, and nested output text parts.
- Recovered tool call extraction by recursively collecting function/tool calls from the response structure instead of only top-level `response.output` items.
- Added API-side debug logging for assistant line count, raw tool call count, action count, output types, and response text length.
- Added client-side console debug for assistant line count, action count, raw tool call count, API actions, repaired actions, and text recovery actions.
- Added Developer Debug fields for Assistant Lines Count and Last Assistant Response.
- Added text recovery actions when the LLM returns no assistant text and no tool calls, so actionable speech can still populate Review Draft instead of showing an empty review.
- Text recovery now restores implicit schedule items such as "明日の午前中に銀行へ行く" even without a numeric time.
- Preserved v5.2.1 normalized action handling, v5.2.0 natural conversation rules, and v5.1.1 voice stability.

## Version 5.2.1 - 2026-06-10

- Repaired the LLM tool-calling bridge between `/api/assistant` and the home conversation Review Draft.
- `/api/assistant` now returns normalized `actions` with `type` and `payload`, while preserving legacy `name` and `arguments` for compatibility.
- Added API debug output for Assistant Mode, model, Tool Calls, Raw Tool Calls Count, and Actions Count.
- Client action handling now accepts both new `type/payload` actions and legacy `name/arguments` actions.
- All assistant actions are applied to the Review Draft: schedule, shopping item, Follow Up, Google Calendar candidate, priority update, and review card.
- Added context repair actions so natural replies like "全部追加して" or "保存して" can act on candidates already held in the conversation draft when the API returns no tool calls.
- Strengthened prompt instructions so actionable candidates are tool-called immediately, even when the user is asking for a recommended order.
- Developer Mode Assistant Debug now shows Raw Tool Calls Count, Actions Count, and Last Actions.
- Preserved v5.2.0 natural conversation rules and v5.1.1 voice stability.

## Version 5.2.0 - 2026-06-10

- Removed A/B/C and option-number style prompting from the LLM assistant instructions.
- Added voice-first natural approval handling guidance for "全部追加して", "買い物だけ追加して", "カレンダーに入れて", "LINEも登録して", and save confirmations.
- Added display sanitization so forbidden option-number wording is not shown even if the model returns it.
- Changed API failure behavior to show a short connection-failure message and keep the input in the conversation draft without running the old rule organizer.
- Expanded Developer Mode Assistant Debug with Last User Intent, Last Assistant Action, and Fallback Error.
- Improved Review Card summaries with a natural Japanese day-flow sentence across schedule, shopping, Follow Up, and Google Calendar candidates.
- Preserved v5.1.1 SpeechRecognition ref stability and v5.1.0 LLM First Architecture.

## Version 5.1.1 - 2026-06-10

- Stabilized iPhone voice input by moving SpeechRecognition control from React state to refs.
- Added internal listening refs, manual stop tracking, transcript buffering, interim buffering, and auto-restart after unexpected `onend`.
- LLM processing now runs after explicit stop/flush, not during interim speech recognition.
- Preserved transcript buffer across transient `onend` and `onerror` events.
- Added Developer Mode Voice Recognition Debug for status, last event, restart count, timestamp, and recognition errors.
- Added user-facing auto-restart status text while the microphone is recovering.

## Version 5.1.0 - 2026-06-09

- Strengthened LLM First Architecture so the OpenAI Responses API path is the standard home conversation flow.
- Kept the v4 rule engine as fallback-only behavior when the LLM endpoint is unavailable.
- Added Developer Mode Assistant Debug showing Assistant Mode, OpenAI Model, Tool Calls, timestamp, and fallback error.
- LLM-generated review summaries now appear before the fixed count summary when available.
- Tool Calling remains the app reflection layer for schedule, shopping, Follow Up, Google Calendar candidate, priority update, and review card actions.

## Version 5.0.0 - 2026-06-09

- Added LLM Native Assistant Core using a server-side OpenAI Responses API endpoint.
- Added tool calling support for schedule, shopping item, Follow Up, Google Calendar candidate, priority update, and review card actions.
- Home conversation now tries the LLM assistant first and only falls back to the existing rule engine if the API is unavailable.
- Added `/api/assistant` so `OPENAI_API_KEY` stays server-side and is never exposed to the Vite client.
- LLM tool results are applied to the existing Morning Review Draft structure, preserving Review Card, Shopping, Follow Up, Google Calendar, Supabase sync, and existing save flow foundations.
- Added Vercel function configuration for the assistant endpoint.

## Version 4.4.0 - 2026-06-09

- Added Proactive Assistant Engine so the AI secretary offers contextual suggestions after important confirmations.
- Bank visit, shopping, Follow Up, due-date, and Google Calendar confirmation turns now receive targeted advice instead of generic repeated priority prompts.
- Morning Planning Mode now explains why each recommended item is prioritized.
- Smart Priority now considers schedule timing and Follow Up due timing when ranking today's top recommendations.
- Review Card now includes "今日のおすすめ順" with reasons before formal save.
- Reduced repeated "next best action" prompts during ordinary conversation turns.

## Version 4.3.0 - 2026-06-09

- Added Memory & Context Engine for multi-turn AI secretary conversations.
- Added pending intent memory for bank visits, shopping details, contact method selection, future event time, and Follow Up due timing.
- Short replies such as "10時", "LINE", "牛乳2本", "18時", and "今日中" now connect back to the AI's previous question.
- Context-aware replies now confirm the full interpreted action, such as "10:00に銀行へ行く予定" or "田中さんへLINEする予定".
- Future event follow-up answers are added as Google Calendar-ready candidates.
- Kept UI changes minimal and preserved AI Review Flow, Schedule Parser, Deduplication Engine, Supabase sync, Shopping, Follow Up, and Google Calendar foundations.

## Version 4.2.0 - 2026-06-09

- Added Conversation Intelligence so the AI secretary asks follow-up questions for unclear contact, bank, shopping, and meeting inputs.
- Future-dated conversation turns are surfaced as Google Calendar candidates with a registration prompt.
- Added Morning Assistant priority suggestions for prompts such as "what should I do first?"
- Follow Up confirmation now asks about due timing when a deadline is unclear.
- Review Card now includes an AI summary and comment with schedule, shopping, Follow Up, and Google Calendar candidate counts.
- Removed the yesterday reflection card from the home-first conversation experience and replaced the old AI-organize status text.

## Version 4.1.0 - 2026-06-08

- Added True Conversation Engine for home voice turns.
- Each confirmed home utterance now creates a user chat message, updates draft candidates, and returns an AI secretary reply without requiring the AI整理 button.
- Conversation turns can add schedule candidates, shopping candidates, pending Follow Up confirmations, and Google Calendar-ready future schedule candidates.
- "追加して" / "登録して" confirms the pending Follow Up candidate, and "保存して" opens the save-before-confirm review card.
- Home no longer routes voice turns to AI Inbox and no longer shows Today Focus/category dashboard as the main experience.
- Existing Review Card, Schedule Parser, Deduplication Engine, Shopping Post Processor, Supabase sync, and Google Calendar export remain available behind the conversation flow.

## Version 4.0.0 - 2026-06-08

- Reframed the home screen around AI Conversation Core with a simplified greeting, large central microphone, and chat-style AI secretary panel.
- Home voice input now stays in the morning conversation instead of being routed away to AI Inbox.
- AI Review draft results now surface as conversation summaries with follow-up questions, Follow Up candidates, shopping candidates, and Google Calendar candidate counts before save.
- AI Inbox and category-specific buttons are no longer primary home actions; existing underlying pages and storage are preserved.
- Google Calendar candidates are shown in the save-before-confirm review card.
- Existing Schedule Parser, Deduplication Engine, Shopping Post Processor, Supabase sync, User Data Isolation Fix, and calendar export foundations remain in place.

## Version 3.8.5 - 2026-06-07

- Added a Shopping Post Processor so shopping results are cleaned before review, save, local load, and Supabase sync.
- Strengthened one-product-per-item cleanup for Japanese shopping input with delimiters, quantities, duplicate removal, and noise filtering.
- Prevented shopping-only item lists from filling all Today Top Priority slots.
- Kept AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, User Data Isolation Fix, Supabase Auth, Home Digital Motion Background, and PWA settings unchanged.

## Version 3.8.4 - 2026-06-07

- Added user-id guards before applying Supabase Follow Up and Shopping sync results.
- Discards stale Supabase results when a previous user's request returns after logout or another user login.
- Clears local workspace state before applying a different authenticated user session.
- Strengthened the home digital motion background again with visible fiber beams, particle dots, and moving grid/circuit texture while keeping v3.8.4 isolation fixes intact.
- Kept AI organize logic, AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List classification, Supabase Auth, and PWA icon settings unchanged.

## Version 3.8.3a - 2026-06-07

- Strengthened the home digital motion background with more visible neon fiber lines, particle dots, and moving cyber grid texture.
- Added brighter cyan, green, blue, violet, and morning-orange energy accents while keeping cards and buttons readable.
- Increased the motion visibility using faster CSS background-position and glow animations.
- Kept AI organize logic, AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List, Supabase, and PWA icon settings unchanged.

## Version 3.8.3 - 2026-06-07

- Added a subtle CSS-only digital motion background to the home panel.
- Used slow cyan, green, and morning-orange light streams behind the existing hero image and dashboard.
- Added reduced-motion handling so the motion layer becomes static when motion reduction is enabled.
- Kept AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List, Supabase, and PWA icon settings unchanged.

## Version 3.8.2 - 2026-06-07

- Added AI Review Card Editing before formal save.
- Review sections now support independent edit, save, and cancel actions.
- Edited review draft data is used by "保存して今日をスタート".
- Kept AI organize logic, Schedule Parser, Deduplication Engine, Calendar Export, Supabase, and Shopping List logic unchanged.

## Version 3.8.1a Official PNG Asset Replacement - 2026-06-07

- Replaced the temporary SVG home hero with `morning-flow-hero.png`.
- Unified favicon, apple-touch-icon, manifest icon, and PWA icon references to `morning-flow-icon.png`.
- Added `manifest.webmanifest` for PWA icon configuration.
- Kept AI Review Flow, Schedule Parser, Deduplication Engine, Supabase, Google Calendar, and shopping classification unchanged.

## Version 3.8.1 - 2026-06-06

- Added the Home Screen Branding hero visual above Morning Dashboard.
- Removed the large home headline and kept the top area focused on the branded AI secretary impression.
- Added a reusable app icon asset for future manifest/home-screen icon updates.
- Kept AI Review Flow, scheduling, shopping classification, Calendar, and Supabase logic unchanged.


## Version 3.8.0 - 2026-06-06

- Added AI Review Flow so AI整理 results are shown in a confirmation card before formal save.
- Moved Morning plan, Shopping, Follow Up candidates, Supabase shopping sync, and snapshot save to the confirmation step.
- Added "保存して今日をスタート" and "戻って修正" actions while keeping existing Parser, Deduplication, and classification logic unchanged.

## Version 3.7.5d - 2026-06-06

- Fixed AI整理 source text so it matches the visible Editable Transcript.
- `organizeMorning()` now uses `transcript + interimTranscript` as the shared source for AI, shopping classification, parser cleanup, and snapshots.
- AI整理 start now commits the visible source text back into `transcript` and clears `interimTranscript`.

## Version 3.7.5c - 2026-06-06

- Added Schedule Cleanup Safety Fix so parser-derived short schedule items are never removed by long-title cleanup.
- Added safe parser schedule dedupe that keeps `22:00 閉店` and `22:30 ジムへ行く` as protected parser results.
- Added schedule cleanup debug logging for parser, preferred, and cleaned schedule arrays.

## Version 3.7.5b - 2026-06-06

- Strengthened final Schedule cleanup so parser-like short schedules suppress all old long schedule candidates.
- Lowered long schedule detection to 20 characters and removed transcript-style connected schedule titles.
- Schedule rows now display time from `sourceTime` directly to prevent `22:00` from appearing as `02:00`.

## Version 3.7.5a - 2026-06-06

- Added Schedule Source Cleanup so reliable parser schedules suppress old long AI/Full Capture schedule candidates.
- Added `cleanScheduleItems()` to remove long schedule titles, multi-time mixed titles, and transcript-like schedule blocks.
- Applied schedule cleanup to Today Schedule, Future Schedule, and calendar event source generation.

## Version 3.7.5 - 2026-06-06

- Added Schedule Parser to split Japanese transcript time/action pairs before Full Capture and AI schedule fallback.
- Supported continuous inputs such as `8時に起床9時半に店へ行く18時に開店22時に閉店`.
- Added Japanese time handling for morning/afternoon/night expressions and `その後` 30-minute schedule completion.

## Version 3.7.4 - 2026-06-06

- Added a Deduplication Engine for Morning Todo, Schedule, Top Priority, and Future Schedule display.
- Strengthened task normalization for time prefixes, date prefixes, punctuation, spacing, and common Japanese action variants.
- Schedule cleanup now prefers Full Capture timing, removes same-action duplicates, and drops likely wrong 08:00 candidates.

## Version 3.7.3 - 2026-06-06

- Improved Smart Planning cleanup so transcript-derived schedule items keep their own individual times.
- Added canonical Todo dedupe to avoid pairs like "起床" and "起床する".
- Cleaned top priority and Future Schedule display to reduce duplicates and long text blocks.
- Improved tomorrow/future transcript handling so later times inherit the spoken date context and priority cards favor actionable items.

## Version 3.7.2 - 2026-06-06

- Added Full Capture AI Planning so morning voice input keeps extractable actions instead of dropping lower-priority items.
- Merged transcript-derived actions into display/save-compatible `plan.todos` and time-based items into `plan.schedule` without changing storage schemas.
- Improved Future Schedule display with grouped date sections and schedule-style rows.

## Version 3.7.1 - 2026-06-05

- Added Phase 2 Morning Priority UX with a three-step guide on the home screen.
- Added display-only "今日の最重要3件" extracted from existing Today, Shopping, Follow Up, and AI Inbox state.
- Adjusted Morning Dashboard priority so the most important morning information appears first.

## Version 3.7.0 - 2026-06-04

- Added Morning Dashboard to the home screen with Today, Shopping, Follow Up, and AI Inbox summary cards.
- Dashboard cards show counts, compact item previews, completion state, and navigation buttons.
- Added total action count, achievement rate, and first-task summary without changing existing storage or Supabase schemas.

## Version 3.6.7 - 2026-06-04

- Added user-selectable onboarding guide preferences: `always_show`, `first_time_only`, and `disabled`.
- Added a Settings page with "使い方ガイドを見る" and onboarding display controls.
- Onboarding settings are saved per logged-in user id and support reusable guide ids for future guides.

## Version 3.6.6 - 2026-06-04

- Added Auth debug logging for signup, login errors, confirmation resend, password reset, and session restore.
- Improved Japanese guidance for unconfirmed email, wrong password, incomplete signup, and expired confirmation links.
- Added confirmation email resend and password reset actions to the auth screen.
- Signup now includes the current app URL as the email confirmation redirect target.

## Version 3.6.5 - 2026-06-04

- Added multi-user real-device safeguards for Auth redirect session restore and local state isolation.
- Local drafts, AI Inbox, Shopping backup, Follow Up backup, and review snapshots now use the logged-in user id as the private session key.
- Logout clears page inputs, temporary voice text, review state, and local UI state before another user can log in.
- Supabase Follow Up and Shopping reads/writes remain scoped by `user_id` and authenticated access tokens.

## Version 3.6.4 - 2026-06-04

- Isolated page-specific voice input so Morning Flow speech no longer fills the Shopping List input.
- Cleared interim speech text when switching pages to avoid cross-page draft bleed.
- Kept each page's existing edit, organize, localStorage, and Supabase save flows intact.

## Version 3.6.3 - 2026-06-04

- Added context-aware voice routing so Shopping, Follow Up, and Morning Flow can capture speech directly on their pages.
- AI Inbox remains available for general, unclear, idea, and mixed-category voice notes.
- Dedicated page captures now avoid unnecessary AI Inbox detours while keeping existing organize and Supabase sync flows.

## Version 3.6.2 - 2026-06-04

- Added Supabase Auth session refresh before Follow Up and Shopping Supabase requests.
- Shopping Save Debug and Follow Up Save Debug now show token status, including `token expired / token refreshed`.
- Follow Up complete, reopen, edit, and delete now use the latest access token.

## Version 3.6.1 - 2026-06-04

- Added Shopping Save Debug for Supabase shopping item save failures.
- Debug shows current user id, payload `user_id`, Auth Mode, response status, response body, error, and INSERT payload.
- Shopping upsert responses are logged for save verification.

## Version 3.6.0 - 2026-06-04

- Added Supabase sync for Shopping List using `shopping_items`.
- Shopping items are saved, fetched, checked, edited, and deleted by logged-in `user_id`.
- LocalStorage shopping backup remains in place.
- Shopping List refreshes from Supabase every 15 seconds when configured and logged in.

## Version 3.5.3 - 2026-06-04

- Fixed Follow Up Supabase REST requests to send the logged-in user's access token in the Authorization header.
- Follow Up fetch, insert, update, and delete now run as the authenticated user instead of the anon role.
- Added Auth Mode to Follow Up Save Debug.

## Version 3.5.2 - 2026-06-04

- Updated the visible MORNING FLOW AI version display to `v3.5.2`.

## Version 3.5.1 - 2026-06-04

- Added Follow Up save debug details for AI Inbox save failures.
- Debug now shows current user id, payload `user_id`, response status, response body, error, and INSERT payload preview.
- AI Inbox can show Follow Up save debug directly when Supabase insert fails.

## Version 3.5.0 - 2026-06-04

- Added Follow Up user data isolation using `follow_ups.user_id`.
- Follow Up insert payload now stores the logged-in Supabase Auth user id.
- Follow Up fetch, update, complete, reopen, and delete requests are scoped by `user_id`.
- Added Supabase SQL/RLS guidance in version notes.

## Version 3.4.0 - 2026-06-04

- Added Supabase Auth foundation with email/password login and signup screen.
- The app body is shown only after a user is logged in.
- Added logged-in user display and logout button.
- Existing data separation and RLS behavior are unchanged in this phase.

## Version 3.3.0 - 2026-06-04

- Added automatic AI Inbox classification confidence.
- AI Inbox now shows category and confidence percentage for each item.
- High-confidence Inbox items are routed into the matching workflow input when `AIで整理する` is pressed.
- Manual category changes remain available and are treated as high confidence.

## Version 3.2.0 - 2026-06-04

- Added the AI Inbox foundation page.
- Voice input is now saved to AI Inbox first instead of being sent directly to Morning Flow, Shopping, Follow Up, or Feedback inputs.
- AI Inbox items show category candidates, unprocessed/organized state, and an `AIで整理する` action.

## Version 3.1.0 - 2026-06-04

- Added Follow Up Sync Stability UI with last sync time, manual sync, and syncing status.
- Changed Follow Up sync failure text to a clearer user-facing message.
- Collapsed Supabase Debug by default so it can be opened only when needed.

## Version 3.0.3 - 2026-06-04

- Fixed Follow Up person name extraction so names like `柴田君`, `高橋さん`, and `小田原さん` are kept intact.
- Added Follow Up Debug fields for `Original Person` and `Extracted Person`.
- Added a review-screen person check before saving Follow Up candidates.

## Version 3.0.2 - 2026-06-04

- Fixed Supabase Follow Up INSERT payload for `follow_ups.id text primary key`.
- INSERT payload now includes `id`, `title`, `person_name`, `action_type`, `memo`, `status`, `created_at`, `updated_at`, and `completed_at`.
- Uses the existing generated Follow Up item id for Supabase records.

## Version 3.0.1 - 2026-06-04

- Made Follow Up Supabase Debug fields always visible on the production screen.
- `Last Operation`, `Response`, `Rows`, `Body`, and `Error` now show fallback values instead of disappearing when empty.
- Added a `Supabase Debug` label inside the Follow Up sync status card.

## Version 3.0.0 - 2026-06-04

- Started Supabase Sync Phase 1 for Follow Up Manager only.
- Added a Supabase Follow Up REST client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Follow Up Manager can load, add, complete, reopen, and delete follow-ups through the `follow_ups` table when Supabase is configured.
- Existing localStorage Follow Up backup remains in place for fallback and offline safety.
- Added visible Follow Up sync status and error display.

## Version 2.17.0 - 2026-06-04

- Improved Follow Up Manager completion history.
- Completed tasks remain stored and move to `完了履歴` with completion timestamp.
- Completed history now sorts by latest completion time first.
- Completed tasks can be returned to `未対応` while preserving the original follow-up item.

## Version 2.16.0 - 2026-06-04

- Added a Follow Up Review screen between AI organization and saving.
- Follow Up candidates can now be checked, edited, deleted, or cancelled before they are saved.
- Review cards support editing contact, content, kind, status, due date, and optional time.
- Follow Up transcript remains visible so users can compare the original text with review candidates.

## Version 2.15.7 - 2026-06-04

- Fixed Follow Up Manager person-boundary splitting when multiple people appear in one line.
- Prevented task words such as `返信`, `連絡`, `電話`, `折り返し`, `LINE`, and `見積もり` from being attached to the next person's name.
- Improved duplicate removal for the same person and same content.
- Added Follow Up Debug fields for original text, split text, detected people, generated count, duplicate exclusion count, and exclusion reasons.

## Version 2.15.6 - 2026-06-04

- Fixed the visible MORNING FLOW AI version label so the top screen shows `v2.15.6`.
- App UI version display is now generated from `package.json` during the Vite build via `__APP_VERSION__`.
- This prevents future manual update drift between package version and on-screen version labels.
- Follow Up Accuracy behavior is unchanged.

## Version 2.15.5 - 2026-06-03

- Upgraded Follow Up Capture accuracy with person-boundary splitting for `さん`, `君`, `様`, and `氏`.
- Re-evaluates Follow Up splitting when detected person count is greater than generated item count.
- Added visible Follow Up Debug for detected person count, generated item count, split strategy, and re-evaluation status.
- Expanded Follow Up intent detection for estimate/request phrases such as `見積`, `依頼`, and `お願い`.
- Transcript remains visible after `フォローを整理する` so users can compare original speech with generated cards.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, shopping list, and morning schedule logic are unchanged.

## Version 2.15.4 - 2026-06-03

- Added collapsible voice input guide cards to the morning schedule, shopping list, and Follow Up Manager pages.
- Each guide shows beginner-friendly spoken examples while keeping the initial UI compact.
- Styled the guide cards with the Future AI glass look, cyan glow accents, and dark background.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, Follow Up logic, and shopping list logic are unchanged.

## Version 2.15.3 - 2026-06-03

- Fixed Follow Up Capture so the Editable Transcript remains visible after `フォローを整理する`.
- Transcript text stays editable after AI organization, allowing users to compare the original spoken text with generated follow-up cards.
- Transcript clearing now remains limited to explicit user actions such as `全文削除`.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and shopping list behavior are unchanged.

## Version 2.15.2 - 2026-06-03

- Fixed Follow Up Capture person-based splitting so changed contacts create separate follow-up cards.
- Person detection now supports `さん`, `君`, `様`, and `氏`.
- Preserved each case's own contact, content, and due date so actions from another person do not mix in.
- Added Follow Up split debug logging for detected person count, generated item count, and detected names.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and shopping list behavior are unchanged.

## Version 2.15.1 - 2026-06-03

- Fixed Follow Up Capture so multiple spoken or typed cases are split into multiple follow-up cards.
- Added shared split-and-save handling for line breaks, `そして`, `あと`, `それと`, and changed contact names such as `高見さんに` / `近藤さんに`.
- Improved follow-up intent detection for estimate/request phrases such as `見積もり` and `もらう`.
- Follow-up content is cleaned so phrases like `高見さんにLINEを返す` display as `LINE返信`.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, and shopping list behavior are unchanged.

## Version 2.15.0 - 2026-06-03

- Added voice input capture UI to FOLLOW UP MANAGER.
- Follow Up Manager now supports microphone input, editable transcript review, `全文削除`, inline delete confirmation, and `フォローを整理する`.
- Voice-captured follow-up text is saved as an incomplete follow-up item and reflected in the home pending/today counts.
- Added follow-up status labeling for `未対応`, `連絡済み`, `返信待ち`, and `完了`.
- Future AI UI styling is preserved, and Apple Calendar, Google Calendar, Upstash Redis, Analytics, shopping list logic, and morning plan logic are unchanged.

## Version 2.14.6 - 2026-06-03

- Fixed food event classification so food names inside scheduled events are not treated as shopping items.
- Time expressions such as `16時半から...` are treated as schedule candidates and `半` is parsed as 30 minutes.
- Food event phrases such as `食べる`, `ランチ`, `夕食`, `朝食`, `外食`, and `食事する` remain in todos and schedule.
- Morning planning no longer adds shopping items unless the transcript has shopping context such as `買う`, `購入`, `今日買うもの`, or `買い物リスト`.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, Follow Up Manager, and Future UI behavior are unchanged.

## Version 2.14.5 - 2026-06-03

- Moved the Editable Transcript card directly below the microphone area on the morning plan page.
- Kept the AI organize button near the transcript editor so users can speak, review, edit, and organize without scrolling.
- Added a `全文削除` action with inline confirmation near the transcript editor.
- Clearing the transcript also clears temporary speech input so previous text does not remain.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, Follow Up Manager, shopping list logic, and Future AI UI design are unchanged.

## Version 2.14.4 - 2026-06-03

- Added shopping input cleanup actions: `全文削除` and `新しく作る`.
- Added separate share-selection checkboxes for shopping result items.
- Family share now sends only selected shopping items, and asks before sharing all items when nothing is selected.
- Changed shopping share text to a simple readable request format.
- Moved the shopping reset confirmation from the top modal to an inline confirmation near the reset button.
- Apple Calendar, Google Calendar, Upstash Redis, Analytics, Follow Up Manager, and Future AI UI behavior are unchanged.

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



