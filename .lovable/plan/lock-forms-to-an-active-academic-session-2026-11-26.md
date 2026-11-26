# Lock forms to an Active Academic Session

## What you will get
- Form Settings page: new card "Active Academic Session" with a dropdown (2025-2030). Saved with the existing Save button.
- New Admission Form and Admission Test Form: the session dropdown is replaced by a locked display, e.g. "2027 - set by school" with a lock icon. Applicants only choose class.
- Every application and test form is saved under the session the admin set.

## Two improvements over the uploaded instructions
1. **Real lock, not just a hidden dropdown.** Hiding the dropdown alone can be bypassed by a technical user sending a different session directly. A small new database check will overwrite the session with the admin's chosen one for every non-admin submission, before the ID number is assigned. Existing ID triggers, functions and policies stay untouched.
2. **No silent "2027" fallback.** If the setting cannot load, the form shows "Could not load settings, try again" and blocks submit (same as the field-visibility setting does today), instead of quietly saving under a wrong year.

## Steps
1. Database: add the `active_session` row (value 2027) to settings; add one new BEFORE INSERT trigger on applications and admission_tests that sets the session from that row for non-admins. Named so it runs before the ID-number trigger.
2. Form Settings: load and save `active_session`; refresh the cached value after saving.
3. New Admission Form: read the setting together with the existing visibility settings; replace the session dropdown with the locked display; submit with that value.
4. Admission Test Form: same locked display and submission.
5. Tests: add tests that the forms show the locked session with no dropdown, submit that session, and block when the setting fails to load. Run all existing tests.

## Not touched
ID-number triggers and functions, student code, EduNest sync, permissions/policies, field visibility, date of birth input, camera and crop, existing records.

## Technical details
- New function `public.enforce_active_session()` (SECURITY DEFINER, search_path set); trigger name `trg_a_enforce_active_session` (sorts before `trg_assign_*`). Skips when caller is service_role, auth.uid() is null, or `private.has_role(uid,'admin')`. Raises an error if the setting is missing, so nothing saves under an unknown session.
- Query key `["form-settings","active-session"]`, `refetchOnWindowFocus:false`; reads only, no focus refetch (IME safety).
