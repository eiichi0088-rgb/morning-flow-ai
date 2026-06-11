# MORNING FLOW AI Versioning Rules

1. UI version label and ZIP version must match.
2. ZIP name must be `morning-flow-ai-vX.Y.zip`.
3. Always run `npm.cmd run build` before release.
4. ZIP must not include `node_modules`, `.npm-cache`, or `.env`.
5. ZIP should include `dist` after build.
6. v5.3.2 is based on v5.3.1 plus Developer Debug Visibility Fix.

## Version 6.4.0 True Conversation First - 2026-06-11

- Screen display: v6.4.0
- ZIP: morning-flow-ai-v6.4.0.zip
- Next planned version: Version 6.4.1
- `/api/assistant` returns `understanding`, `save_candidates`, and `clarification` while keeping legacy arrays for compatibility.
- `save_candidates` is now the primary source for Review Draft generation in the home conversation flow.
- The Conversation Understanding Card displays true AI understanding, save candidate counts, and clarification questions.
- Legacy recovery, lostEntity, excludedReasons, Review Draft confirmation, Supabase persistence, User Isolation Fix, Google Calendar registration, shopping save, and Follow Up save behavior are unchanged.

## Version 6.3.0 Conversation First Foundation - 2026-06-11

- Screen display: v6.3.0
- ZIP: morning-flow-ai-v6.3.0.zip
- Next planned version: Version 6.3.1
- Conversation First Phase 1 adds a Conversation Understanding Card before Review Draft.
- The card presents `assistant_reply` as the AI understanding summary and lists understood items separately from structured save candidates.
- Save candidate counts for schedules, shopping, Follow Up, and Google Calendar candidates are visible before Review Draft.
- Review Draft save behavior, Supabase persistence, Google Calendar handling, User Isolation Fix, OpenAI prompt design, and classification logic are unchanged.

## Version 6.2.3 AI Organizing UX Upgrade - 2026-06-11

- Screen display: v6.2.3
- ZIP: morning-flow-ai-v6.2.3.zip
- Next planned version: Version 6.2.4
- AI prompts, classification rules, structured output design, save logic, and User Isolation Fix are unchanged.
- The Morning AI organize flow now shows a clearer loading card as soon as processing starts.
- The loading card explicitly says the app is checking schedule, shopping, Follow Up, and calendar candidates.
- The AI organize button shows an animated loading label and remains disabled while processing.

## Version 6.2.2 Usability Upgrade - 2026-06-11

- Screen display: v6.2.2
- ZIP: morning-flow-ai-v6.2.2.zip
- Next planned version: Version 6.2.3
- LLM prompts, classification rules, and structured output design are unchanged.
- Morning Voice now shows a visible AI processing card while Review Draft is being created.
- Processing controls are temporarily disabled to reduce duplicate submissions.
- Shopping checklist display is split into unpurchased and purchased sections.
- Shopping checkbox state continues to use `completed` locally and `checked` in Supabase, scoped by the active user id.

## Version 6.2.1 User Isolation Fix - 2026-06-11

- Screen display: v6.2.1
- ZIP: morning-flow-ai-v6.2.1.zip
- Next planned version: Version 6.2.2
- LLM First behavior, prompts, and classification rules are unchanged.
- Logout clears volatile local personal data before another user can use the same browser.
- Auth user changes reset React state before Supabase data is loaded for the new user.
- Logged-in sessions do not restore stale localStorage drafts or shopping lists as new user data.
- Supabase shopping display is filtered by the active user's id on both the request and response sides.
- Developer Debug includes user isolation diagnostics for current user, fetched shopping count, local shopping keys, cleared keys, and auth reset status.

## Version 6.2.0 LLM First Accuracy Upgrade - 2026-06-10

- Screen display: v6.2.0
- ZIP: morning-flow-ai-v6.2.0.zip
- Next planned version: Version 6.2.1
- OpenAI structured output remains the source of truth for Review Draft generation.
- App-side post-processing is limited to minimal normalization and duplicate removal.
- GPT-provided shopping quantities and schedule date/time text are preserved.
- Review Draft content and saved shopping content now use the same LLM-first normalized items.
- No new keyword-heavy classification rules were added.

## Version 6.1.0 Auto Review Draft - 2026-06-10

- Screen display: v6.1.0
- ZIP: morning-flow-ai-v6.1.0.zip
- Next planned version: Version 6.1.1
- Review Draft is generated automatically when OpenAI structured JSON contains actionable items.
- Users no longer need to say "全部追加して" before reviewing the draft.
- Save approval phrases such as "お願いします", "保存して", "これでOK", "登録して", and "進めて" confirm the pending Review Draft.
- Empty Review Cards are avoided by opening review only when JSON produced draft items.
- Developer Debug includes Draft Auto Generated, Draft Item Count, Pending Save, and Last Parsed JSON details.

## Version 6.0.0 Pure LLM Secretary Core - 2026-06-10

- Screen display: v6.0.0
- ZIP: morning-flow-ai-v6.0.0.zip
- Next planned version: Version 6.0.1
- Normal assistant flow now uses OpenAI structured JSON as the source of truth.
- Tool Calling, regex recovery, entity filters, clause segmentation, action repair, add-all repair, and lost entity debug are no longer used in the normal path.
- Frontend applies JSON directly to Review Draft display/save structures.
- Developer Debug focuses on JSON Parse Success, Last LLM JSON, structured item counts, needs_clarification, clarifying_question, and parse error.
- Voice stability and current AI secretary UI are preserved.

## Version 5.3.3 Parallel Tool Calling Fix - 2026-06-10

- Screen display: v5.3.3
- ZIP: morning-flow-ai-v5.3.3.zip
- Next planned version: Version 5.3.4
- The assistant prompt now explicitly requires parallel tool calls for compound utterances containing schedules, shopping items, Follow Up, and future timed events.
- Tool descriptions were strengthened so each function has a clearer extraction boundary.
- Client recovery now reconstructs bank, shopping, Follow Up, and Google Calendar candidates when Raw Tool Calls Count is 0.
- Natural approval phrases such as "全部追加して", "お願い", "それで", "保存して", and "これでOK" are treated as add-all intent.
- Semantic dedupe prevents duplicate candidates when LLM tool calls and recovery detect the same entity.

## Version 5.3.2 Semantic Entity Filter Fix - 2026-06-10

- Screen display: v5.3.2
- ZIP: morning-flow-ai-v5.3.2.zip
- Next planned version: Version 5.3.3
- Google Calendar candidates are no longer rejected when title and explicit time are present but date is empty.
- Follow Up candidates now accept a non-empty title fallback when person_name/action are missing.
- Developer Debug shows Follow Up Reject Reason and Calendar Reject Reason.
- The add_follow_up tool schema descriptions now explicitly mark person_name and action as required with examples.


## Version 5.3.2 Developer Debug Visibility Fix - 2026-06-10

- Screen display: v5.3.2
- ZIP: morning-flow-ai-v5.3.2.zip
- Next planned version: Version 5.3.3
- The top-right Sparkles button on the home screen opens Developer Debug when Developer Mode is enabled.
- Settings includes a passcode-gated Developer Mode toggle for real-device access.
- Developer Debug is hidden from normal users because the clickable debug button and dialog render only in Developer Mode.
- The debug dialog shows Assistant Mode, Assistant Lines Count, Raw Tool Calls Count, Actions Count, Extracted Count, Schedule Count, Shopping Count, Follow Up Count, Calendar Count, Lost Entity Count, Last Assistant Response, Last Actions, and Fallback Error.
- A close button is available in the dialog header and at the bottom of the panel.
- Existing inline Assistant Debug and Voice Recognition Debug panels remain available in Developer Mode.
- v5.3.1 Full Entity Coverage, v5.3.0 semantic boundaries, and v5.1.1 voice stability remain preserved.

## Version 5.3.1 Full Entity Coverage Fix - 2026-06-10

- Screen display: v5.3.1
- ZIP: morning-flow-ai-v5.3.1.zip
- Next planned version: Version 5.3.2
- LLM instructions now require Full Entity Coverage and explicit count checks before and after assistant reply generation.
- Full coverage actions are merged into the action pipeline so schedule, shopping, Follow Up, and calendar candidates found in the utterance are not dropped.
- Entity coverage reporting compares expected extracted entities with final actions and warns when Lost Entity Count is nonzero.
- Future exact-time events are counted as calendar candidates instead of duplicated as normal schedule items.
- Developer Mode shows Extracted Count, Schedule Count, Shopping Count, Follow Up Count, Calendar Count, and Lost Entity Count.
- v5.3.0 semantic boundaries, v5.2.2 LLM Response & Tool Recovery, no A/B selection, and v5.1.1 voice stability remain preserved.

## Version 5.3.0 Semantic Entity Extraction - 2026-06-10

- Screen display: v5.3.0
- ZIP: morning-flow-ai-v5.3.0.zip
- Next planned version: Version 5.3.1
- LLM instructions now define MORNING FLOW AI as a Semantic Entity Extraction Engine for schedule, shopping, Follow Up, Google Calendar candidates, priority suggestions, and assistant replies.
- Shopping items such as 牛乳2本 and 卵1パック are kept out of Follow Up and mapped to shopping actions.
- Follow Up recovery extracts only person-contact actions such as 田中さんへLINE instead of storing the whole utterance.
- Ambiguous times such as 明日の午前中 are kept as schedule items and are not converted to 09:00.
- Utterance-level dates are carried into exact-time events, so "明日の...18時から会合" becomes a Google Calendar candidate.
- Google Calendar candidates require a future/dated item with an explicit clock time, so vague bank visits are not calendar candidates.
- Developer Mode shows Extracted Schedule Items, Extracted Shopping Items, Extracted Follow Up Items, and Extracted Calendar Candidates.
- v5.2.2 LLM Response & Tool Recovery, no A/B selection, and v5.1.1 voice stability remain preserved.

## Version 5.2.2 LLM Response & Tool Recovery - 2026-06-10

- Screen display: v5.2.2
- ZIP: morning-flow-ai-v5.2.2.zip
- Next planned version: Version 5.2.3
- Assistant response extraction now recursively reads `output_text`, message content, and nested output text parts from OpenAI Responses API results.
- Tool call extraction now recursively collects function/tool calls from response structures and normalizes them to `type` / `payload` actions.
- API debug logs show Assistant Lines Count, Raw Tool Calls Count, Actions Count, output types, and response text length.
- Client debug logs show assistant line count, action count, raw tool call count, API action count, repaired action count, and text recovery action count.
- Developer Mode shows Assistant Mode, Raw Tool Calls Count, Actions Count, Assistant Lines Count, Last Assistant Response, Last Actions, and Fallback Error.
- Text recovery actions prevent empty Review Drafts when the LLM returns no text and no tool calls for actionable speech.
- Text recovery restores implicit non-numeric schedule items such as "明日の午前中に銀行へ行く".
- v5.2.1 normalized action handling, v5.2.0 natural conversation policy, no A/B selection, and v5.1.1 voice stability remain preserved.

## Version 5.2.1 Tool Calling Repair - 2026-06-10

- Screen display: v5.2.1
- ZIP: morning-flow-ai-v5.2.1.zip
- Next planned version: Version 5.2.2
- `/api/assistant` returns normalized `actions` using `type` and `payload`, with debug metadata for raw tool calls and action counts.
- Client action handling accepts both normalized actions and legacy `name` / `arguments` actions.
- Tool calls for schedule, shopping, Follow Up, Google Calendar candidates, priority updates, and review cards are applied into the Review Draft.
- Context repair actions let "全部追加して" and "保存して" operate on candidates already held in the conversation draft when the API returns no tool calls.
- The LLM prompt now requires actionable candidates to be tool-called immediately, including "what order should I do this in" turns.
- "保存して", "これでOK", and "今日をスタート" open Review Card from the existing draft instead of an empty draft.
- Developer Mode shows Tool Calls, Raw Tool Calls Count, Actions Count, Last Actions, Last User Intent, Last Assistant Action, and Fallback Error.
- v5.2.0 natural conversation rules, no A/B selection, LLM First Architecture, and v5.1.1 voice stability remain preserved.

## Version 5.2.0 Autonomous Conversation Flow - 2026-06-10

- Screen display: v5.2.0
- ZIP: morning-flow-ai-v5.2.0.zip
- Next planned version: Version 5.2.1
- A/B/C and option-number prompting are prohibited in the LLM assistant instructions.
- Natural voice approvals such as "全部追加して", "買い物だけ追加して", "カレンダーに入れて", "LINEも登録して", and "保存して" are routed through LLM tool calling.
- Assistant output is sanitized before display so forbidden option-number wording is not shown.
- API failure fallback no longer runs the old rule organizer; it shows a concise connection failure message and keeps the input in the conversation draft.
- Developer Mode shows Assistant Mode, Tool Calls, Last User Intent, Last Assistant Action, and Fallback Error.
- Review Card includes a natural AI summary across schedule, shopping, Follow Up, and Google Calendar candidates.
- v5.1.1 SpeechRecognition stability and v5.1.0 LLM First Architecture remain preserved.

## Version 5.1.1 Voice Stability Fix - 2026-06-10

- Screen display: v5.1.1
- ZIP: morning-flow-ai-v5.1.1.zip
- Next planned version: Version 5.1.2
- SpeechRecognition instance and internal listening controls are managed with refs instead of React state.
- Unexpected SpeechRecognition `onend` auto-restarts when the user has not manually stopped.
- Final and interim transcript buffers are retained during transient recognition endings.
- LLM processing starts after explicit stop/flush, not while interim speech is still being captured.
- Developer Mode shows Voice Recognition Debug with status, last event, restart count, timestamp, and error.
- LLM First Architecture, Tool Calling, Review Card, Supabase sync, Shopping, Follow Up, and Calendar foundations remain preserved.

## Version 5.1.0 LLM First Architecture - 2026-06-09

- Screen display: v5.1.0
- ZIP: morning-flow-ai-v5.1.0.zip
- Next planned version: Version 5.1.1
- Home conversation standard path is OpenAI Responses API first.
- Rule engine is retained as fallback-only behavior when the LLM assistant endpoint is unavailable.
- Developer Mode shows Assistant Mode, OpenAI Model, Tool Calls, timestamp, and fallback error.
- Review Card prefers LLM-generated summary text when the assistant provides it through show_review_card.
- Tool Calling remains the app action boundary for schedule, shopping, Follow Up, Google Calendar candidate, priority update, and review card actions.

## Version 5.0.0 LLM Native Assistant Core - 2026-06-09

- Screen display: v5.0.0
- ZIP: morning-flow-ai-v5.0.0.zip
- Next planned version: Version 5.0.1
- Home conversation now routes first through a server-side OpenAI Responses API assistant endpoint.
- Tool calling actions are supported for add_schedule, add_shopping_item, add_follow_up, add_google_calendar_candidate, update_priority, and show_review_card.
- The browser receives only assistant output and tool actions; `OPENAI_API_KEY` remains server-side.
- Existing v4 rule engines remain as a safety fallback when the LLM endpoint is unavailable.
- LLM tool actions write into the existing Morning Review Draft, so Review Card, Shopping, Follow Up, Google Calendar, Supabase sync, and save flow foundations remain preserved.

## Version 4.4.0 Proactive Assistant Engine - 2026-06-09

- Screen display: v4.4.0
- ZIP: morning-flow-ai-v4.4.0.zip
- Next planned version: Version 4.4.1
- AI secretary now offers contextual suggestions after bank, shopping, Follow Up, due-date, and Google Calendar confirmations.
- Generic repeated "next best action" prompts are reduced during ordinary conversation turns.
- Morning Planning Mode includes recommendation reasons, not only ranked items.
- Smart Priority considers schedule timing and Follow Up due timing.
- Review Card includes "今日のおすすめ順" with reasons before save.
- UI changes are minimal; AI Review Flow, Memory & Context Engine, Schedule Parser, Deduplication Engine, Supabase sync, Shopping, Follow Up, and Google Calendar foundations remain preserved.

## Version 4.3.0 Memory & Context Engine - 2026-06-09

- Screen display: v4.3.0
- ZIP: morning-flow-ai-v4.3.0.zip
- Next planned version: Version 4.3.1
- Conversation Context Memory keeps the AI secretary's latest unanswered question and unresolved candidate.
- Pending intent states cover bank visits, shopping details, contact method selection, future event time, and Follow Up due timing.
- Short answers such as "10時", "LINE", "牛乳2本", "18時", and "今日中" are merged into the previous conversation context.
- Future event context can turn "明後日会合" followed by "18時" into a Google Calendar-ready candidate.
- UI changes are intentionally minimal; AI Review Flow, Schedule Parser, Deduplication Engine, Supabase sync, Shopping, Follow Up, and Google Calendar foundations remain preserved.

## Version 4.2.0 Conversation Intelligence - 2026-06-09

- Screen display: v4.2.0
- ZIP: morning-flow-ai-v4.2.0.zip
- Next planned version: Version 4.2.1
- AI secretary asks clarifying questions for unclear contact method, bank timing, shopping contents, and meeting timing.
- Future schedule language such as tomorrow, day after tomorrow, next week, weekdays, and month/day is treated as Google Calendar candidate context.
- Morning Assistant Mode can answer priority questions with a recommended top-three order from current draft candidates.
- Follow Up confirmations can request due timing when the deadline is unclear.
- Review Card includes AI summary counts and an AI comment before formal save.
- Home keeps conversation, microphone, AI response, and save confirmation as the main experience; yesterday reflection is no longer shown on the home-first flow.

## Version 4.1.0 True Conversation Engine - 2026-06-08

- Screen display: v4.1.0
- ZIP: morning-flow-ai-v4.1.0.zip
- Next planned version: Version 4.1.1
- Home voice turns are processed immediately as conversation turns without requiring the AI整理 button.
- The conversation keeps AI/user chat history and updates draft schedule, shopping, Follow Up, and Google Calendar candidates after each utterance.
- Follow Up confirmation supports a conversational "追加して" / "登録して" response.
- "保存して" opens the existing save-before-confirm Review Card with the accumulated conversation draft.
- AI Inbox, STEP guidance, Today Focus, and category cards are no longer the main home experience.
- Review Card, Schedule Parser, Deduplication Engine, Shopping Post Processor, Supabase sync, and Google Calendar export remain preserved.

## Version 4.0.0 AI Conversation Core - 2026-06-08

- Screen display: v4.0.0
- ZIP: morning-flow-ai-v4.0.0.zip
- Next planned version: Version 4.0.1
- Home screen is simplified around "今日のことを話してください", a large central microphone, and an AI secretary chat panel.
- Home voice input remains in the morning conversation flow instead of routing unclear input to AI Inbox.
- AI can present review summaries, missing-information prompts, Follow Up candidate prompts, and Google Calendar candidate counts before formal save.
- Category-specific buttons and AI Inbox are no longer primary home actions, while existing data structures and pages remain available behind the scenes.
- Google Calendar candidates are visible in the save-before-confirm review card.
- Schedule Parser, Deduplication Engine, Shopping Post Processor, Supabase sync, User Data Isolation Fix, and existing calendar export foundations remain preserved.

## Version 3.8.5 Shopping Intelligence Upgrade - 2026-06-07

- Screen display: v3.8.5
- ZIP: morning-flow-ai-v3.8.5.zip
- Next planned version: Version 3.8.6
- Added a Shopping Post Processor to clean shopping items before review, save, local load, and Supabase sync.
- Shopping input is normalized toward one product per item with delimiter splitting, quantity cleanup, duplicate consolidation, and empty/noise item removal.
- Today Top Priority no longer fills all three priority slots with shopping products when shopping is the only category.
- AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, User Data Isolation Fix, Supabase Auth, Home Digital Motion Background, PWA settings, and calendar export remain unchanged.

## Version 3.8.4 User Data Isolation Fix - 2026-06-07

- Screen display: v3.8.4
- ZIP: morning-flow-ai-v3.8.4.zip
- Next planned version: Version 3.8.5
- Added current-user guards before applying Supabase Follow Up and Shopping sync results.
- Stale async results from a previous user are discarded if the active user changed before the request completed.
- Login, signup-session, and email-confirmation restore now clear local workspace state before applying a different authenticated user.
- Home Digital Motion was strengthened further with visible fiber beams, particle dots, and moving grid/circuit texture without downgrading the v3.8.4 user isolation fix.
- AI organize logic, AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List classification, Supabase Auth, and PWA icon settings remain unchanged.

## Version 3.8.3a Digital Motion Strong Visual Update - 2026-06-07

- Screen display: v3.8.3a
- ZIP: morning-flow-ai-v3.8.3a.zip
- Next planned version: Version 3.8.4
- Strengthened the home motion layer with more visible neon fiber lines, particle dots, moving grid texture, and colorful cyber light accents.
- The home visual now uses cyan, green, blue, violet, and morning-orange motion to create a stronger AI dashboard impression.
- `prefers-reduced-motion` remains supported so animation is disabled and softened for reduced-motion users.
- AI organize logic, AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List, Supabase, and PWA icon settings remain unchanged.

## Version 3.8.3 Home Digital Motion Background - 2026-06-07

- Screen display: v3.8.3
- ZIP: morning-flow-ai-v3.8.3.zip
- Next planned version: Version 3.8.4
- Added a CSS-only digital motion layer to the home panel.
- The background uses slow cyan, green, and morning-orange light streams behind the existing hero image and dashboard.
- `prefers-reduced-motion` is respected so the home motion becomes static for users who reduce animation.
- AI Review Flow, Review Card Editing, Schedule Parser, Deduplication Engine, Calendar Export, Shopping List, Supabase, and PWA icon settings remain unchanged.

## Version 3.8.2 AI Review Card Editing - 2026-06-07

- Screen display: v3.8.2
- ZIP: morning-flow-ai-v3.8.2.zip
- Next planned version: Version 3.8.3
- Added edit, save, and cancel controls to AI Review sections before formal save.
- Edited review draft data is used when the user presses "保存して今日をスタート".
- AI organize logic, Schedule Parser, Deduplication Engine, Calendar Export, Supabase, and Shopping List logic remain unchanged.

## Version 3.8.1a Official PNG Asset Replacement - 2026-06-07

- Screen display: v3.8.1a
- ZIP: morning-flow-ai-v3.8.1a.zip
- Next planned version: Version 3.8.2
- Home hero image now uses `morning-flow-hero.png`.
- favicon, apple-touch-icon, manifest icon, and PWA icon now use `morning-flow-icon.png`.
- Temporary SVG brand assets were removed.
- AI Review Flow, Schedule Parser, Deduplication Engine, Supabase, Google Calendar, and shopping classification remain unchanged.

## Version 3.8.1 Home Screen Branding Update - 2026-06-06

- Screen display: v3.8.1
- ZIP: morning-flow-ai-v3.8.1.zip
- Next planned version: Version 3.8.2
- Added a branded hero visual below the login/version bar and above Morning Dashboard.
- Removed the large home headline from the first screen.
- Added a reusable app icon asset for future manifest/home-screen icon work.
- AI Review Flow, Schedule Parser, Deduplication Engine, shopping classification, Calendar, and Supabase logic remain unchanged.

## Version 3.8.0 AI Review Flow - 2026-06-06

- Screen display: v3.8.0
- ZIP: morning-flow-ai-v3.8.0.zip
- Next planned version: Version 3.8.1
- AI整理 now creates a `morningReviewDraft` and shows "AIがこう整理しました" before formal save.
- `setPlan`, Shopping state, Shopping Supabase sync, Follow Up candidates, and snapshots run only after "保存して今日をスタート".
- "戻って修正" clears the draft while keeping Editable Transcript intact.

## Version 3.7.5d Editable Transcript Source Fix - 2026-06-06

- Screen display: v3.7.5d
- ZIP: morning-flow-ai-v3.7.5d.zip
- Next planned version: Version 3.7.6
- AI整理 now uses the same `transcript + interimTranscript` source text shown in Editable Transcript.
- AI整理 start commits the visible source text into `transcript` and clears `interimTranscript`.
- AI, shopping classification, schedule parser cleanup, and snapshots now receive the same source text.

## Version 3.7.5c Schedule Cleanup Safety Fix - 2026-06-06

- Screen display: v3.7.5c
- ZIP: morning-flow-ai-v3.7.5c.zip
- Next planned version: Version 3.7.6
- Parser-derived short schedule items are protected from long-title cleanup.
- Safe parser dedupe keeps all parser rows, including `22:00 閉店` and `22:30 ジムへ行く`.
- Debug logging shows parser, preferred, and cleaned schedule arrays after AI整理.

## Version 3.7.5b Final Schedule Cleanup - 2026-06-06

- Screen display: v3.7.5b
- ZIP: morning-flow-ai-v3.7.5b.zip
- Next planned version: Version 3.7.6
- Parser-like short schedule rows now suppress old long schedule candidates even when parser source metadata is unavailable.
- Long schedule detection now removes 20+ character connected transcript-style titles.
- Today and Future Schedule rows display the original schedule source time to prevent `22:00` from appearing as `02:00`.

## Version 3.7.5a Schedule Source Cleanup - 2026-06-06

- Screen display: v3.7.5a
- ZIP: morning-flow-ai-v3.7.5a.zip
- Next planned version: Version 3.7.6
- Reliable parser schedules now suppress old long AI/Full Capture schedule candidates.
- `cleanScheduleItems()` removes long schedule titles, mixed multi-time titles, and transcript-like schedule blocks.
- Today Schedule, Future Schedule, and calendar event generation use cleaned schedule items.

## Version 3.7.5 Schedule Parser - 2026-06-06

- Screen display: v3.7.5
- ZIP: morning-flow-ai-v3.7.5.zip
- Next planned version: Version 3.7.6
- Schedule Parser extracts Japanese time/action pairs before Full Capture and AI schedule fallback.
- Supports continuous transcript strings, `午前/午後/朝/昼/夜`, half-hour expressions, and `その後` schedule completion.
- Parsed schedule results are passed through Deduplication Engine for Todo, Schedule, and Future Schedule display.

## Version 3.7.4 Deduplication Engine - 2026-06-06

- Screen display: v3.7.4
- ZIP: morning-flow-ai-v3.7.4.zip
- Next planned version: Version 3.7.5
- Morning Todo, Schedule, Top Priority, and Future Schedule now pass through a shared deduplication cleanup.
- Task normalization removes time/date prefixes, punctuation, spacing, and common action variants before comparison.
- Schedule cleanup prefers Full Capture timing and removes likely wrong same-action 08:00 candidates.

## Version 3.7.3 Smart Planning Cleanup - 2026-06-06

- Screen display: v3.7.3
- ZIP: morning-flow-ai-v3.7.3.zip
- Next planned version: Version 3.7.4
- Full Capture schedule items keep their own extracted times and override same-task AI schedule guesses.
- Todos and top priority cards use canonical dedupe to reduce duplicate meaning items and long labels.
- Future Schedule remains grouped by date and sorted in schedule order.
- Future transcript times inherit the spoken date context, and top priority cards favor actionable items over routine start/end markers.

## Version 3.7.2 Full Capture AI Planning - 2026-06-06

- Screen display: v3.7.2
- ZIP: morning-flow-ai-v3.7.2.zip
- Next planned version: Version 3.7.3
- Morning AI整理 keeps extractable actions from the full transcript and merges them into existing `plan.todos`.
- Time-based transcript actions are merged into existing `plan.schedule` without changing Supabase or localStorage schemas.
- Future Schedule is shown as grouped schedule rows instead of long text blocks.

## Version 3.7.1 Morning Priority UX - 2026-06-05

- Screen display: v3.7.1
- ZIP: morning-flow-ai-v3.7.1.zip
- Next planned version: Version 3.7.2
- Home screen shows STEP 1 / STEP 2 / STEP 3 guidance.
- Morning Dashboard shows display-only top 3 priority items from existing user-scoped state.
- No Supabase schema, save flow, or AI classification changes.

## Version 3.7.0 Morning Dashboard - 2026-06-04

- Screen display: v3.7.0
- ZIP: morning-flow-ai-v3.7.0.zip
- Next planned version: Version 3.7.1
- Home screen shows Today, Shopping, Follow Up, and AI Inbox summary cards.
- Dashboard uses already isolated logged-in user state and does not change Supabase or localStorage schemas.

## Version 3.6.7 Onboarding Guide Preference Control - 2026-06-04

- Screen display: v3.6.7
- ZIP: morning-flow-ai-v3.6.7.zip
- Next planned version: Version 3.6.8
- Users can choose whether the guide is shown every time, only the first time, or never.
- Settings page includes "使い方ガイドを見る" and onboarding preference controls.
- Onboarding preference is saved per `user_id` and stores reusable guide ids.

## Version 3.6.6 Auth Signup / Email Confirmation Debug - 2026-06-04

- Screen display: v3.6.6
- ZIP: morning-flow-ai-v3.6.6.zip
- Next planned version: Version 3.6.7
- Auth screen can resend confirmation email and send password reset email.
- Login and signup failures show clearer Japanese guidance.
- Developer console logs signup result, login error, session restore result, and auth state changes.

## Version 3.6.5 Multi-User Real Device Verification - 2026-06-04

- Screen display: v3.6.5
- ZIP: morning-flow-ai-v3.6.5.zip
- Next planned version: Version 3.6.6
- Auth email confirmation redirects can restore the Supabase session from the return URL.
- Local temporary data is scoped by logged-in user id and cleared on logout.
- Follow Up and Shopping Supabase operations continue to use `user_id` plus authenticated access tokens.

## Version 3.6.4 Page-Specific Voice Input Isolation - 2026-06-04

- Screen display: v3.6.4
- ZIP: morning-flow-ai-v3.6.4.zip
- Next planned version: Version 3.6.5
- Morning Flow voice input stays in the editable transcript and is no longer copied to the Shopping List input.
- Page changes clear interim speech text so previous page voice drafts do not appear in another category.

## Version 3.6.3 Context-Aware Direct Routing - 2026-06-04

- Screen display: v3.6.3
- ZIP: morning-flow-ai-v3.6.3.zip
- Next planned version: Version 3.6.4
- Shopping, Follow Up, and Morning Flow page voice input stays in the active page instead of always going through AI Inbox.
- AI Inbox remains the generic capture destination for unclear, idea, and mixed-category input.

## Version 3.6.2 Supabase Auth Token Refresh Fix - 2026-06-04

- Screen display: v3.6.2
- ZIP: morning-flow-ai-v3.6.2.zip
- Next planned version: Version 3.6.3
- Follow Up and Shopping Supabase requests refresh expired Auth sessions before sending data.
- Debug token status shows `token valid` or `token expired / token refreshed`.

## Version 3.6.1 Shopping Save Debug - 2026-06-04

- Screen display: v3.6.1
- ZIP: morning-flow-ai-v3.6.1.zip
- Next planned version: Version 3.6.2
- Shopping Save Debug shows current user id, payload `user_id`, Auth Mode, response status, response body, error, and INSERT payload.
- Shopping upsert responses are logged for save verification.

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


