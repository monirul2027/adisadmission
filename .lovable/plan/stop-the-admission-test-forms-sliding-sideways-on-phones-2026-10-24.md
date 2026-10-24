# Stop the Admission & Test forms sliding sideways on phones

## What changes
Both forms stay fixed to the full phone width. No sideways sliding, and no white strip on the right.

## Fixes (both forms: NewAdmissionForm and AdmissionTestForm)
1. **Outer page box**: keep `w-full max-w-full overflow-x-hidden`, and add `relative` plus `overflow-x-clip` (clip stops sideways scrolling without breaking dropdowns).
2. **Header**: the "Back" button is positioned absolutely but its header has no `relative` parent, so it is placed against the whole page. Add `relative overflow-hidden` to the header. Let the long school name and address wrap (`break-words`, `px-4` on mobile so the text doesn't touch the edges).
3. **Form and cards**: the form is `w-full max-w-3xl min-w-0`. Every card and grid child gets `min-w-0`, so a long input value or a select trigger can't stretch its column. All grids are `grid-cols-1` on mobile (already true), with `min-w-0` on the items.
4. **File pickers**: the hidden `sr-only` file inputs sit inside a label with no `relative`. Add `relative` so the hidden input can't escape the viewport. The file-name chip keeps `truncate` and gets `max-w-full`.
5. **Photo box (New Admission)**: the fixed `w-28` thumbnail row gets `flex-wrap` so it never overflows on 320px screens.
6. **Select dropdowns**: the trigger gets `w-full min-w-0`. The popup width is capped to the screen (the existing global rule stays).
7. **Crop pop-up**: `w-[calc(100vw-1rem)]` stays (it fits within the screen). The crop frame keeps `maxWidth: 100%`.
8. No negative margins exist. Mobile horizontal padding stays at 0 for the edge-to-edge form you asked for earlier. Inside the cards, padding stays at `px-4`.

## Verification
Check both forms with Playwright at 320, 360 and 390px wide. Confirm `document.documentElement.scrollWidth === innerWidth` before and after opening a dropdown and focusing an input, and take screenshots.

## Not changed
Form logic, validation, uploads, submission and design colours.
