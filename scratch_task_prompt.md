<USER_REQUEST>
# Resonate: restyle to the reference screenshots (Antigravity prompt)

Attach the three reference screenshots to this message before sending:
- **Image 1**: desktop layout reference (grouped sidebar, wide search bar, big hero banner, track table, right-hand now-playing + queue panel).
- **Image 2**: liquid-glass Now Playing reference (cover-flow with frosted caption plate, long glass transport pill).
- **Image 3**: colour palette reference.

The screenshots are **style references only**. Do not copy their brand name, logos, artist photos, copy, or the "buy / price / premium" UI. Resonate is free, ad-free, Creative Commons music, so none of that applies.

Project: Resonate (Vite + React 19 + TypeScript + Tailwind v4 + Zustand + Dexie + react-router-dom v7). Tokens live in `src/index.css` (`bg-panel`, `bg-panel-hi`, `bg-elevated`, `bg-base`, `text-ink`, `text-ink-dim`, `text-accent`, `.glass`, `.glass-strong`), accent logic in `src/theme/color.ts` and `src/theme/themeStore.ts`.

## Before you start (I will do this myself, since your sandbox has no network)

I will run in the IntelliJ terminal: `npm i @fontsource-variable/archivo @fontsource-variable/figtree`. After that you may import these two packages. They are the only dependencies you may add. If the imports fail to resolve, stop and tell me instead of working around it.

## Ground rules (every task)

1. Work through the tasks in order. After each task run `npm run build`, fix errors, then give me a 3-5 line summary and **continue to the next task without waiting**, unless a build error needs my input.
2. Do not break existing behaviour: playback, queue, favorites, playlists, local files, the Jamendo legal model (downloads only when `downloadAllowed !== false`, licence stays visible per track), and the responsive work already done (bottom tab bar, mobile mini-player, queue bottom sheet, `dvh` heights). Every redesign must also work at 360px and 768px.
3. Both modes must work: dark (default) and light. Contrast must meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI icons). Check every text/background pair you introduce.
4. Keep `prefers-reduced-motion`, and add `prefers-reduced-transparency` fallbacks (solid surfaces, no blur).
5. No new colours outside the palette below except neutral tints derived from it.

## Design direction

**Palette** (from Image 3, read as `#ecffb6`, `#d6fb00`, `#00545f`):
- Pale lime `#ecffb6`: text highlights, light-mode base.
- Electric lime `#d6fb00`: the one accent. Active states, play button, key CTAs, progress fill. Use sparingly so it stays special.
- Deep teal `#00545f`: brand surface, hero gradients, light-mode accent.

Derived values (adjust only if a contrast check fails):
- Dark: base `#021a1e`, panel `#06262b`, panel-hi `#0b3339`, elevated `#0e3a41`, text `#eef7d4`, text-dim about `#9fbf9b`, hairline `rgba(236,255,182,0.10)`, accent `#d6fb00`, accent-hover `#e4ff4d`, **on-accent `#00323a`** (dark teal text on lime).
- Light: base about `#f5ffd9` (the pale lime pushed toward white), panel white at 60-70%, text `#0a3a41`, text-dim `#4a6a66`, **accent `#00545f`**, accent-hover `#006b78`, **on-accent `#ecffb6`**. Lime on a pale background fails contrast, so light mode flips the roles: teal is the accent.
- The theme picker keeps its presets, but the **default preset becomes this lime/teal palette** and the default `accentId` changes from `auto` to it. "Auto" (accent from album art) stays as an option; in Auto mode only the accent changes, surfaces stay on the palette. Update `DARK_META` / `LIGHT_META` theme-color values to the new bases.

**Type**: bundle locally and apply:
- Display (page titles, hero titles, Now Playing title, big numerals): `Archivo Variable` at `font-stretch: 125%`, weight 700-800, tight tracking. This gives the wide, extended look of the "Palette" poster in Image 3.
- UI and body: `Figtree Variable`. Replace the current `"Segoe UI"` stack but keep it as a fallback.
- Micro-labels like the reference's `MAIN`, `LIBRARY`, `CURATED ALBUM`, `POPULAR`: 11-12px, uppercase, tracking about 0.08em, text-dim colour. Tabular numerals for all times and counts.

**What "less AI-generated" means here. Follow these literally:**
- No purple/blue/pink gradients, no neon glow shadows, no gradient text, no sparkle icons, no emoji in the UI.
- Do not wrap everything in rounded translucent cards. Content areas (lists, tables, sidebars) are **matte** teal surfaces separated by hairlines. Glass is reserved for things that float: the player bar, Now Playing transport and caption plate, menus, the queue sheet, hero chips and the context menu.
- Use a small radius scale only: 8 / 14 / 24 / pill. No random radii.
- Asymmetric, editorial layouts: big cover art or a large display headline carries each page, with left-aligned text. No centred-everything hero.
- One subtle film-grain overlay (an inline SVG `feTurbulence` noise as a data-URI background, about 5-7% opacity, `mix-blend-mode: soft-light`, `pointer-events: none`), applied to hero banners and the Now Playing backdrop, as in Image 3's grainy gradients. Not on the whole page.
- Copy is short, concrete and human ("22 tracks · 1 hr 24 min", "Free, Creative Commons", "Jump back in"). No filler like "Discover your sound" or "Elevate your listening".
- Shadows are soft and tinted with the dark teal, never pure black blobs.

---

## Task 1: Design tokens, fonts, grain, liquid-glass primitives

- Rewrite the token blocks in `src/index.css` (dark + light) with the palette above, keeping the same token names so existing utilities keep working. Update `src/theme/color.ts` (add the new default preset, make `on-accent` follow the rules above) and `src/theme/themeStore.ts` (default accent, meta colours).
- Import the two fonts, define `--font-display` and `--font-ui` in `@theme`, and apply them. Add utility classes `.font-display` and `.label-micro`.
- Add a `.grain` utility (the noise overlay described above).
- Rebuild `.glass` / `.glass-strong` as true liquid glass (see the full spec in Task 6) but ship a good non-SVG version now: translucent tint, `backdrop-filter: blur(22px) saturate(1.6)`, a 1px specular rim made with an inset box-shadow (bright top-left, dim bottom-right), and a soft teal-tinted outer shadow.
- Add a `.surface` utility for matte panels (solid `--x-panel`, hairline border, no blur).
- Replace the scrollbar colours with palette tints.

## Task 2: App shell and sidebar (Image 1, left and top)

- Desktop (`md+`): the app sits as a floating frame with a small outer margin and a large radius, on a deep-teal background that has a very soft lime glow in one corner and the grain overlay. Sidebar, main area and right panel are matte `.surface` blocks with consistent gaps.
- Sidebar: logo + wordmark at the top, a collapse button, then **grouped sections** with micro-labels. `MAIN`: Home, Search. `LIBRARY`: Playlists, Favorites, Albums (only if a page exists, otherwise skip), Local files. The active item is a filled pill using a lime tint with dark text, and the others are text-dim with a hover tint. Bottom: a small card (not a premium upsell) reading "Free and Creative Commons. Every track credits its artist." with a "Browse Jamendo" link, plus a Settings or "Change API key" entry. Remove the old top-right floating hamburger on desktop; keep the mobile menu behaviour.
- Top bar inside the main area: a wide pill search field ("What do you want to listen to?") with a search icon, wired to the existing search (typing navigates to `/search?q=` with a debounce, Enter submits, `/` focuses it), and on the right a theme toggle and the menu button.
- Right panel (`xl+` only, 20-22rem): a **Now Playing + queue** panel as in Image 1: large cover, micro-label with the context ("PLAYING FROM …"), title, artist, a small heart, then the "Up next" list below it with compact rows (cover, title, artist, duration). It replaces the old queue aside on `xl+`; below `xl` the existing queue bottom sheet remains.
- Restyle `BottomTabBar` and the mobile mini-player to the new tokens (glass, lime active dot).

## Task 3: Track list as a real table (Image 1, "Popular")

Redesign `TrackRow` and wherever track lists render (Album, Artist, Playlist, Search, Library, Local):
- Desktop columns: `#` (turns into a play icon on hover; an equaliser bars icon for the current track), **Name** (cover thumbnail, title, artist beneath), **Album**, **Licence** (short code such as `CC BY-NC`, small outlined badge), **Time**, then heart and "⋯" actions. Header row with micro-label styling and sort arrows on Name / Album / Time that actually sort the list client-side.
- The current track row gets a lime tint and an accent title. Hover row uses `bg-panel-hi`. Row height about 56px.
- Below `md`: collapse to compact rows (cover, title/artist, time, "⋯"), no header, and always show the heart and "⋯" (hover-only controls do not work on touch). Tap targets at least 40px.
- Keep every existing action (play, favorite, add to playlist, download when allowed).

## Task 4: Hero banners and page layouts (Image 1, hero and discography)

- Build a reusable `HeroBanner` component: wide rounded banner, background is the cover art blown up, blurred and masked on the right, over a **lime-to-teal gradient with grain**. Left side: a small glass chip (for example "Featured today" or "Album"), a huge display-font title, a quiet metadata line, and an action cluster (Play as the lime pill button, then Shuffle, Save/Favorite, Radio, More as glass icon buttons). Choose the text colour per side for contrast: dark teal on the lime end, pale lime on the teal end. On mobile the banner is shorter and the cover moves into the right-top corner.
- Use it on **Home** (featured track or a trending album from data already fetched), **Artist**, **Album**, and **Playlist** pages.
- Artist page: below the hero, a "Popular" section (the table from Task 3) and a "Discography" section with filter chips (Popular releases / Albums / Singles & EPs, only the ones the data supports) and a horizontal row of square covers. "See all" opens the full list.
- Home page: after the hero, "Jump back in" and the existing sections as horizontal rows of cover cards. Cards have a square cover with a 14px radius, the title in the UI font, the subtitle in text-dim, and an accent play button on hover and keyboard focus. No card chrome around them.
- Search and Library: same page header style (display-font title, micro-label counts), matte lists, chip filters styled as in the discography row.

## Task 5: Player bar and Now Playing (Image 2)

- **Player bar (desktop)**: a long glass pill. Left cluster: previous, play/pause, next as large rounded glass buttons (play/pause is the lime filled one). Centre: a dark inset chip with the cover, title and artist, a thin progress line along the bottom of the chip (replacing the separate seek row; make it still draggable with a generous hit area), and a "⋯" button. Right cluster: lyrics placeholder (only if lyrics exist, otherwise omit), queue, volume. Keep shuffle, repeat, favorite and download reachable (inside "⋯" or the right cluster) without crowding.
- **Now Playing overlay**: keep the existing cover-flow logic but restyle to Image 2: covers are rounded-24 with a soft shadow; the **centre card has a frosted glass caption plate attached under the cover** containing the title (display font) and artist; side cards recede with scale and brightness and show a hint of glass edge. The backdrop is the current cover, heavily blurred, warm and saturated, with the grain overlay and a darkening vignette. The transport is the same long glass pill as the player bar. Remove the duplicate title/cover inside the pill on every width.
- Keep Task-1 mobile behaviour: narrow-screen card widths from one variable, no horizontal overflow, `dvh`, safe-area padding, queue button opening the queue sheet. **Also fix the stacking bug**: the queue sheet must render above Now Playing (sheet `z-[55]`, backdrop `z-[54]`), and while Now Playing is open the bottom-sheet variant is used at all widths.
- Add swipe left/right on the cover area for next/previous and swipe down to close.

## Task 6: Real liquid-glass effect and micro-interactions

- Add one hidden SVG `<filter id="liquid-glass">` using `feTurbulence` + `feDisplacementMap` (small scale, about 6-10) rendered once in `index.html` or `App.tsx`. Create a `.glass-liquid` class that adds `backdrop-filter: url(#liquid-glass) blur(18px) saturate(1.7)` **only inside `@supports (backdrop-filter: url(#x))`**. This is Chromium-only, so every other browser must fall back to the plain blur version from Task 1 with no visible difference in layout.
- Specular highlight that follows the pointer: a small `usePointerGlow` hook sets `--mx` / `--my` on the element, and a `radial-gradient` of pale lime at low opacity is layered in `::before`. Use it only on the player pill, the Now Playing caption plate and the primary hero buttons. Disable it on touch and under reduced motion.
- Pressed state: glass buttons scale to 0.96 with a quick spring-like ease and the rim brightens. Hover: rim brightens, never a big glow.
- Performance guard: at most **three** blurred layers visible at once on a normal page (player, one overlay, one menu). If the Now Playing overlay is open, drop blur on the player bar behind it. Add `@media (prefers-reduced-transparency: reduce)` plus `(prefers-reduced-motion: reduce)` fallbacks to solid `--x-elevated` surfaces.

## Task 7: QA and cleanup

- `npm run build` passes.
- Screenshot-style review at 360px, 768px, 1280px and 1600px in dark and light: no horizontal scroll, no clipped controls, the bottom tab bar only below `md`, the right panel only on `xl+`.
- Contrast audit of every text/background pair; list any adjusted values.
- Search the code for leftover old colours (`#1db954`, `#1ed760`, `#0b0b10`, `#f2f2f7`, `#1c1c22`) and any hard-coded Tailwind greys or purples, and replace them with tokens.
- Remove unused CSS and components made redundant by this restyle.
- Final report: files created, files changed, anything you skipped or could not verify, and any contrast values you had to change.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-09T00:27:43+05:30.

The user's current state is as follows:
Active Document: d:\resonate\index.html (LANGUAGE_UNSPECIFIED)
Cursor is on line: 32
Other open documents:
- d:\resonate\README.md (LANGUAGE_UNSPECIFIED)
- d:\resonate\src\pages\Home.tsx (LANGUAGE_UNSPECIFIED)
- d:\resonate\src\components\States.tsx (LANGUAGE_UNSPECIFIED)
- d:\resonate\src\pages\UserPlaylist.tsx (LANGUAGE_UNSPECIFIED)
- d:\resonate\src\stores\playerStore.ts (LANGUAGE_UNSPECIFIED)

The user has uploaded 3 image(s):
- C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164234539_afdb40d5.jpg
- C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164251150_b71acd23.jpg
- C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164263007_759c650d.jpg
You can embed these images in an artifact if you need the USER to review them.
</ADDITIONAL_METADATA>

[file "C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164234539_afdb40d5.jpg" was omitted because its type "image/jpeg" is unsupported by the model; read it from that path if needed]

[file "C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164251150_b71acd23.jpg" was omitted because its type "image/png" is unsupported by the model; read it from that path if needed]

[file "C:/Users/91960/.gemini/antigravity/brain/fc161d3b-0e9a-432d-9849-3d900c96838b/.user_uploaded/media_1794164263007_759c650d.jpg" was omitted because its type "image/png" is unsupported by the model; read it from that path if needed]