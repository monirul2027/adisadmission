# Deeper fix: phone keyboard "Change keyboard" popup closing

Goal: long-pressing the spacebar in any typing box (public forms, admin pop-ups, Site Editor) keeps the keyboard and its language picker open, and nothing on the page reacts when the phone briefly hands focus to the picker.

## What the check found

- Pop-ups (dialog and side menu) still move focus on their own when they open and close.
- The app's data loader is set to refresh when the window regains focus (the default). The keyboard picker triggers that.
- Admin Dashboard re-checks the account on every window focus and every return to the tab.
- Home page re-runs its sign-in check on every sign-in event, including silent token refreshes that happen when the window comes back into focus.
- Only one typing box changes text while you type: the "Registered mobile" box in "Check application status" strips non-digits on every key press. The admission form, test form and Site Editor already store exactly what you type.
- No page-wide key or touch listeners touch text boxes. The only one is the built-in sidebar shortcut (Ctrl/Cmd+B), and it ignores normal typing.

## Changes

1. **Pop-ups never grab focus on their own** (`dialog.tsx`, `sheet.tsx`)
   - Default `onOpenAutoFocus` and `onCloseAutoFocus` to `preventDefault()`, alongside the existing `onFocusOutside` guard. Any handler a screen passes in still runs.
   - Pop-ups keep `modal` on, so the dark backdrop, scroll lock and "tap outside to close" still work. Turning `modal` off would remove the backdrop and let the page scroll behind pop-ups. Radix's focus trap already ignores the focus loss caused by the system keyboard picker, so blocking auto-focus is enough to stop it pulling focus back.

2. **No refresh when the window regains focus** (`App.tsx`)
   - `new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, refetchOnReconnect: false } } })`.

3. **Sign-in listeners stay quiet after the first load**
   - `LandingPage.tsx`: react only to `SIGNED_IN`, `SIGNED_OUT` and `USER_UPDATED`. Ignore `TOKEN_REFRESHED` and `INITIAL_SESSION` so the "Change Hero Photo" permission check doesn't re-run on focus.
   - `AdminDashboard.tsx` and `StudentDashboard.tsx` listeners already only redirect on sign-out and never switch to a loading state. They stay as they are.
   - `AdminDashboard.tsx` suspended-account check: remove the `window` focus listener. Keep the `visibilitychange` check (real tab switches) and the 30-second timer, and skip the check while a typing box is focused (`document.activeElement` is an input, textarea or editable element). The check never shows a loading state, and still signs out suspended admins.

4. **Raw text while typing**
   - `QuickStatusTracker.tsx` mobile box: store `e.target.value` exactly as typed (keep `inputMode="numeric"` and `maxLength={10}`). Digits are cleaned only when Check is pressed, which the submit step already does.
   - Re-check `NewAdmissionForm.tsx`, `AdmissionTestForm.tsx`, `SiteEditor.tsx`, `FormSettings.tsx`, `AdminStaffManagement.tsx`, `HeroPhotoDialog.tsx` and the dashboard edit form. No other change is planned unless a new case turns up. The village auto-fill writes only to the other address boxes, never the one you're typing in.

5. **Check**
   - Phone-size browser test: focus a field inside the Edit Application pop-up and on the public forms, fire window blur and focus, and confirm the field keeps focus and text, the pop-up stays open, and nothing reloads. Run the typecheck.
   - A real Gboard can't be tested here. The final check is on your phone after you publish.

## Not changed
Data, security rules, approval, sync, submission logic and form layout.
