# Fix "Failed to fetch" on Admin login

## What's happening

The red "Failed to fetch" message is not a wrong password. It means the sign-in
request never reached the backend at all — the page is still trying to talk to an
old backend address that no longer exists.

Checks just made:
- The hosted backend (database + login service) is up and answering normally.
- The app's current backend settings point at the correct, live backend.
- An old backend address is still left behind in one generated configuration file,
  which is why the running preview is still using the stale address.

So the settings on disk are right, but the preview is running with the outdated
value loaded in memory.

## Fix

1. Refresh the running preview so it picks up the current backend address
   (restart the local dev process and reload the page).
2. Clean up the leftover stale backend reference in the generated configuration
   so it can't be picked up again later or at publish time.
3. Confirm the admin login works end-to-end by driving the login page in a browser
   and checking the sign-in request now reaches the backend (expecting either a
   successful sign-in or a proper "invalid email or password" message instead of
   "Failed to fetch").
4. If sign-in then reports invalid credentials, confirm whether the admin account
   `alordishaislamicschool@gmail.com` exists, and if not, register it once via the
   hidden `/admin-setup` page.

## Technical notes

- `.env` and `src/integrations/supabase/client.ts` already resolve to project ref
  `aljrljhrotibrwwqpyoy`; `supabase/config.toml` still references the old ref
  `olqvnhufcionpbekhvvw`.
- Verified `POST /auth/v1/token?grant_type=password` against the current ref
  responds (HTTP 400 for bogus credentials), so network egress and the auth
  service are healthy.
- No application code changes to `AdminLoginPage.tsx` are expected.
