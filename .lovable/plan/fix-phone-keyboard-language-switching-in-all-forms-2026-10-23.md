# Fix phone keyboard language switching in all forms

Goal: long-pressing the spacebar (Gboard "Change keyboard") must never close the keyboard, refresh the field, or lose what was typed — on public forms and in the Admin Panel.

Note: this project has no "CrudPanel" or "admin.tsx". The matching screens are the Admin Dashboard, Site Editor, Form Settings, Admins & Staff, and the edit/sync pop-ups.

## What will change

1. **Text boxes that rewrite text while typing (Site Editor)**
   - WhatsApp number box strips characters on every key press. Change: keep the raw text while typing, clean it only on Save.
   - "One per line" lists (journey steps, phone numbers, card bullet points) trim and drop empty lines on every key press, which makes the box re-draw and jump. Change: keep the raw text while typing, split/trim on Save.

2. **Stable fields everywhere**
   - Re-check that every field helper (FormField, SelectField, VillageCombobox, Field, TextField, etc.) is defined outside other components and uses stable keys, so the typing box is never rebuilt. The current scan shows the form helpers are already defined correctly; any found inside another component will be moved out.

3. **Pop-ups must not steal focus back**
   - In the shared pop-up, side-menu and dropdown pieces, stop them closing or grabbing focus when the phone briefly hands focus to the keyboard picker (ignore "focus moved outside" events; close only on a real tap outside or the Close button).
   - Applies to: Edit Application, Add to System, Invite/Edit Admin, Site Editor section editor, Hero Photo, Crop, and the mobile admin menu.

4. **No key blocking**
   - Confirm no text box blocks the spacebar or other keys and no typing handler interrupts Bengali/IME composition. Trimming stays only at submit (already the case in the login and status-check forms).

5. **Check**
   - Simulate on a phone-size screen: type, trigger a blur while a pop-up is open, and confirm the field keeps focus, text and open state. A real Android keyboard can't be tested here — final check is on your phone after publishing.

## Technical details
- Files: `src/pages/SiteEditor.tsx` (local draft strings for list/WhatsApp fields, normalize in save handlers), `src/components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx` (default `onFocusOutside={e => e.preventDefault()}`, keep `onPointerDownOutside` behavior), audit of `NewAdmissionForm.tsx`, `AdmissionTestForm.tsx`, `AdminDashboard.tsx`, `FormSettings.tsx`, `AdminStaffManagement.tsx`, `HeroPhotoDialog.tsx`.
- No changes to data, security rules, sync, approval or submission logic.
