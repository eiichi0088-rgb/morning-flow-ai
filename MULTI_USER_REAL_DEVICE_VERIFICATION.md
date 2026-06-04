# MORNING FLOW AI v3.6.5 Multi-User Real Device Verification

Use this checklist before release when Supabase Auth and user data isolation are enabled.

1. Log in as User A on PC.
2. Add one Morning Flow transcript, one Shopping List item, and one Follow Up item.
3. Confirm Shopping and Follow Up are saved with User A only.
4. Log out.
5. Log in or sign up as User B on the same device.
6. Confirm User A's transcript, AI Inbox, Shopping List, and Follow Up items are not visible.
7. Add User B's Shopping List and Follow Up items.
8. Log out.
9. Log back in as User A.
10. Confirm User B's items are not visible and User A's Supabase-synced Shopping and Follow Up items are not mixed in.
11. On iPhone Safari or PWA, sign up with a new email address.
12. Open the Supabase confirmation email on the same iPhone.
13. Confirm the app returns from the email link and restores the logged-in session.
14. Confirm Morning Flow voice input only appears in Morning Flow.
15. Confirm Shopping voice input only appears in Shopping.
16. Confirm Follow Up voice input only appears in Follow Up.
17. Repeat the same checks on PC and iPhone to verify Supabase sync.

Expected result:

- User A data is not visible to User B.
- User B data is not visible to User A.
- Logout clears page inputs, temporary voice text, and unsaved review state.
- Supabase-synced Shopping and Follow Up data are scoped by logged-in `user_id`.
- Email confirmation returns to the app and restores the authenticated session.
