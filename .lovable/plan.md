# Hero Section + Top Buttons Redesign with Hero Photo Upload

All existing text, Bengali heading, address, "Your admission journey" card, and layout stay exactly as they are. Only styling changes, plus the new photo-change feature.

## 1. Top buttons ("Admission Test" and "New Admission")
- Both buttons: bold deep-black text (16–18px), 14px rounded corners, 1.5px dark border, roomy padding, right arrow icon (thicker stroke).
- Admission Test: soft mint fill.
- New Admission: coral to warm amber gradient.
- Solid offset "3D" shadow down-right with a softer second layer.
- Hover: lifts slightly, shadow grows. Click: presses down, shadow shrinks.
- Same click behaviour as today (sign in, then the right form opens).

## 2. Hero background
- Full-width photo behind the hero (default: the Unsplash classroom/collaboration photo).
- Moody slate-blue tint over the photo, using the exact gradient given, slight contrast boost and lower saturation.
- "Admissions open..." badge and "Check application status" button become frosted glass (light, translucent, blurred) to match.
- Text stays on top and readable.

## 3. Change Hero Photo
- A small glass pill button "Change Hero Photo" (camera icon, faded until hovered) in the hero corner.
- **Shown only to signed-in admins who are allowed to edit the site (Super Admin always).** Public visitors never see it.
- Dialog lets the admin:
  1. Drag and drop or pick a JPG / JPEG / PNG / WEBP from the device (auto-compressed before upload).
  2. Or paste an image link.
  3. Adjust overlay darkness with a slider (default 80%), with live preview.
  4. "Save & Apply" or "Reset to Default".
- Saved photo and darkness are stored online so every visitor sees them; also kept on the admin's own device for an instant display while loading.
- Honest feedback: success message only after the save really works, real error shown otherwise.

## Technical details
- `src/pages/LandingPage.tsx`: restyle nav buttons (arbitrary Tailwind values / inline styles for the exact hex colours and shadows given), add image + overlay layers to the hero `section` (`relative`, image `absolute inset-0 z-0`, overlay `z-10`, content `relative z-20`). Overlay opacity scales the given gradient alphas from the saved value.
- New `src/components/HeroPhotoDialog.tsx`: drop zone, URL input, slider, save/reset; reuses `compressImage` (e.g. max ~400 KB, 1920px).
- Visibility of the trigger: check session + `checkAdminPermission(userId, "can_edit_site")`.
- Storage: create public bucket `hero-backgrounds`; migration with storage.objects policies: public read; insert/update/delete only for admins with site-edit permission (using the existing permission check function from the RBAC migrations).
- Settings: store as a new `hero_background` key in existing `site_settings` (`{ image_url, overlay_opacity }`), relying on its existing admin-only write rules; add default in `src/lib/site-content.ts` so it falls back cleanly.
- localStorage key `adis_hero_background` used as a cached fallback; the database value always wins once loaded.
- No other pages, forms, dashboard, or logic touched.
