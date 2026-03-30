# Pitgoal Bug Audit Report
Generated: 2026-03-30

---

## Critical (fix immediately)

- [ ] **app/app/page.tsx:336-341** — Grace period auto-skip effect has massive dependency array including `save` callback. Every state change re-runs the effect which iterates all tasks and may call `save()`, risking cascading re-renders and potential data corruption during rapid state updates. **Fix:** Extract grace-period check into a standalone interval or debounce, reduce dependency array.

- [ ] **components/PWARegister.tsx:12** — `setInterval(() => { reg.update(); }, 60 * 60 * 1000)` inside useEffect has no cleanup. The interval ID is never cleared on unmount, causing a memory leak and potential duplicate SW update calls. **Fix:** Store interval ID and return `() => clearInterval(id)` in the useEffect cleanup.

- [ ] **app/app/page.tsx:306-328** — Energy drain useEffect creates a 1-second interval referencing `activeTask` state but only has `[isSleeping, activeTask]` in deps. The `lastEnergyTick.current` ref is mutated inside the interval, which is correct, but energy state is updated via `setEnergy(prev => ...)` every second for every mounted component — including when the app is backgrounded. After returning from background, `deltaMinutes` will be huge causing a massive single-tick drain. **Fix:** Check `document.visibilityState` or cap `deltaMinutes`.

## High (fix before next deploy)

- [ ] **components/PitTab.tsx (entire file)** — Hardcoded colors throughout: `#0d1219`, `#1e2530`, `#141a24`, `#3a4048`, `#4a5568`, `#7a8490`, `#e0e0e0`, `#F87171`, `#34D399`, `#60A5FA`, `#A78BFA`, `#FFD000`, `#2a3040`. This component completely ignores the CSS variable system and will look wrong in light theme. **Fix:** Replace with `var(--card)`, `var(--border)`, `var(--t1)`..`var(--t6)`, `var(--danger)`, `var(--rest)`, `var(--accent)` etc.

- [ ] **components/FriendsTab.tsx:169,174,224,241,298,395** — Hardcoded `background: "var(--bg, #0a0a0a)"` fallback is fine, but `storyViewing` and `myStoryOpen` views use `position: "absolute"` with `inset: 0` relative to the content panel, not the viewport. On desktop with SideNav, these overlays won't cover the full app — they'll only cover the content panel. **Fix:** Use `position: "fixed"` or scope correctly.

- [ ] **components/BottomNav.tsx:27,260,267** — Hardcoded `#0a0a0a` for active icon stroke and label color. In light theme, black-on-white may be fine, but this doesn't use CSS variables. Also `"#666"` for inactive label color. **Fix:** Use `var(--fill-title)` or `var(--t1)` for active, `var(--t4)` for inactive.

- [ ] **components/BottomNav.tsx:223** — Highlight pill uses hardcoded `background: "#FFD000"` instead of `var(--accent)`. **Fix:** Use `var(--accent)`.

- [ ] **components/BottomNav.tsx:212** — `maxWidth: "calc(100vw - 56px)"` — on desktop, `100vw` includes the SideNav, so the pill could be wider than the content area. **Fix:** This is only rendered on mobile (via `nav-fixed` CSS class being hidden on desktop), so low risk but still technically wrong on edge cases.

- [ ] **components/CreateTaskSheet.tsx:243** — `maxWidth: 430` on the sheet container. On desktop, this is fine (creates centered mobile-like sheet), but the sheet uses `position: fixed` with `left: 0, right: 0` — it will appear at the viewport edge, not centered in the content panel. **Fix:** On desktop, calculate position relative to content area or use a portal.

- [ ] **components/DayTimeline.tsx:667-671** — View picker dropdown uses `zIndex: 100` which matches BottomNav's `zIndex: 100`. On desktop this is fine (BottomNav is hidden), but the dropdown backdrop uses `position: "fixed", inset: 0, zIndex: 99` which can interfere with other fixed elements. **Fix:** Use consistent z-index layering.

- [ ] **components/DayTimeline.tsx:484-501** — Date popup uses `position: "fixed"` with `inset: 0` and `zIndex: 200` — on desktop this covers the entire viewport including SideNav. **Fix:** Scope to content area or accept full-viewport modal behavior.

- [ ] **components/PopupBar.tsx:281-295** — Full popup uses `left: "50%"` and `transform: "translate(-50%, 0)"` — on desktop this centers relative to the viewport, not the content panel. The popup will appear shifted left, partially behind the SideNav. **Fix:** Use content-panel-relative positioning on desktop.

- [ ] **components/PopupBar.tsx:282-287** — `bottom: "calc(84px + env(safe-area-inset-bottom, 0px))"` — this assumes BottomNav exists. On desktop, BottomNav is hidden, so the popup floats 84px above the bottom for no reason. **Fix:** Pass `isDesktop` and adjust bottom offset.

- [ ] **components/ProfileTab.tsx (many lines)** — Uses `fontFamily: "monospace"` (bare) instead of the `MONO` constant throughout. While functionally similar, this is inconsistent with other components. **Fix:** Import and use `MONO` from constants.

- [ ] **components/FriendsTab.tsx:189** — `fontFamily: "monospace"` hardcoded instead of MONO constant. **Fix:** Use `MONO`.

- [ ] **app/page.tsx:9-14** — Landing page has hardcoded `background: "#000000"`, `color: "#fff"`, and `fontFamily: "'Sora', -apple-system, sans-serif"`. Won't respect theme or font constants. **Fix:** Use CSS variables.

- [ ] **app/app/page.tsx:816,827** — Hardcoded `#1e2530` and `#FFD000` in page.tsx (likely in a chart or component). **Fix:** Use CSS variables.

- [ ] **Zero accessibility on interactive elements** — 97 `onClick` handlers on divs across all component files, zero `role="button"`, zero `tabIndex`, zero `aria-label` found anywhere in the entire codebase. Keyboard users cannot interact with the app at all. **Fix:** Add `role="button"` and `tabIndex={0}` to all clickable divs, `aria-label` to icon-only buttons.

## Medium (fix when convenient)

- [ ] **components/CreateTaskSheet.tsx:4-6** — Redeclares `DISPLAY`, `MONO`, `BODY` locally instead of importing from `lib/constants.ts`. If font tokens change, this file will be out of sync. **Fix:** `import { DISPLAY, MONO, BODY } from "../lib/constants"`.

- [ ] **components/PopupBar.tsx:39-41** — Same issue: `DISPLAY`, `MONO`, `BODY` redeclared locally. **Fix:** Import from constants.

- [ ] **components/FriendStack.tsx:4-5** — `MONO` and `DISPLAY` redeclared locally. **Fix:** Import.

- [ ] **components/FriendsTab.tsx:169** — `energyColor` function uses hardcoded `"#2ECDA7"` and `"var(--danger, #ef4444)"` — the danger fallback `#ef4444` doesn't match the global `--danger: #E24B4A`. **Fix:** Use `var(--danger)` consistently.

- [ ] **components/FriendsTab.tsx:102-115** — Story progress `setInterval` runs every 100ms. The `setStoryProgress` inside uses a closure but correctly uses the callback form `p => ...`. However, the `clearInterval(interval)` inside the `setStoryProgress` callback won't work reliably because `interval` may not be assigned yet when the callback fires synchronously. **Fix:** Use a ref for the interval ID.

- [ ] **app/app/page.tsx:1010,1019,1050,1059** — Long-press timers for pill editing use `setTimeout` but only `longPressTimer.current` is cleaned up — the local `timer` variable (line 1010, 1050) for touch feedback isn't cleaned up if the component unmounts mid-touch. **Fix:** Store all timer refs and clean up.

- [ ] **app/app/page.tsx:600** — `suggestTimer.current = setTimeout(async () => { ... })` — suggestion timer isn't cleared on unmount. Only cleared on next input change. **Fix:** Add cleanup in a useEffect return.

- [ ] **app/app/page.tsx:780** — useEffect at line 780 (dateStripScrollRef auto-scroll) — need to verify it has proper deps. Missing dependencies can cause stale reads.

- [ ] **components/PopupBar.tsx:93-95** — `useEffect` depends on `[isMainTab]` but reads `collapse` without including it in deps. This means the effect uses a stale `collapse` value. **Fix:** Add `collapse` to deps or use a ref.

- [ ] **app/app/page.tsx (entire file)** — This 129KB / 2000+ line file is the entire app. Every state change causes React to re-evaluate the render function, which includes massive inline style objects being recreated on every render. The 1-second tick interval means ALL inline styles are recreated every second. **Fix:** Extract sub-components, memoize heavy sections with `React.memo`, move static styles to CSS.

- [ ] **components/ProfileTab.tsx:140-152** — Each `useEffect` for persisting to localStorage fires independently, causing 10+ localStorage writes on initial mount (one per state initializer triggering its save effect). **Fix:** Batch into a single debounced save effect.

- [ ] **components/DayTimeline.tsx:125-133** — Keyboard shortcut handler useEffect has empty dependency array `[]` but references `goToday` which is defined as `const goToday = () => setViewDate(new Date())`. Since `goToday` is a new function on every render but the effect captures the initial one, this is fine because it uses `setViewDate` directly. No bug, but the `setShowViewPicker(false)` inside may reference stale state if React batching changes.

- [ ] **app/app/notifications.ts** and **app/notifications.ts** — Identical files (both 280 lines). Duplicate code. **Fix:** Remove one and update imports.

## Low (nice to have)

- [ ] **components/BottomNav.tsx:37-38** — `<img>` for pit-nav icon uses `alt="Pit"` (good), but `filter: invert(1)` for inactive state may not work well in light theme. **Fix:** Provide separate light/dark icon or use CSS variable-based SVG.

- [ ] **components/SideNav.tsx:105** — `<img src="/Trademark-white.png" alt="Pitgoal">` — only a white trademark image. In light theme this will be invisible. **Fix:** Swap to dark version based on theme.

- [ ] **components/MissionTab.tsx** — Uses Tailwind-like class names (`flex`, `gap-1.5`, `mb-5`, `font-display`, `text-lg`, etc.) and CSS variable names (`var(--bg-card)`, `var(--border-light)`, `var(--text-primary)`) that don't exist in `globals.css`. This component appears to be from a different design system or framework. **Fix:** Verify these classes/variables resolve, or migrate to the inline-style + CSS-variable pattern used by the rest of the app.

- [ ] **components/PlaceholderTab.tsx** — Same as MissionTab: uses Tailwind classes and non-existent CSS variables. **Fix:** Align with codebase conventions.

- [ ] **components/CreateTaskSheet.tsx:15-19** — `DEFAULT_TAGS` has hardcoded colors: `#fb923c`, `#e8627a`, `#a78bfa`, `#2ecda7`, `#00d4ff`. These are intentional brand colors for tags, but they don't use CSS variables so they won't adapt to theme. **Fix:** Consider adding tag color variables or accept as intentional.

- [ ] **components/PopupBar.tsx:399** — Primary action button uses `color: "#fff"` on accent background. Since `--accent` is yellow (`#FFD000`), white text on yellow has poor contrast. The non-primary buttons also use `color: "var(--t3)"`. **Fix:** Use `var(--fill-title)` (which is `#0a0a0a`) for text on accent background.

- [ ] **components/PopupBar.tsx:559,568,573,579** — Medium-state action buttons use `color: "#fff"` on accent background (same contrast issue). **Fix:** Use `var(--fill-title)`.

- [ ] **components/FriendStack.tsx:88-99** — Collapsed stack height calculation uses magic numbers. If card height changes, the calculation breaks. **Fix:** Minor, but consider making it data-driven.

---

## Stats
- Total files scanned: 27
- Total issues found: 33
- Critical: 3 | High: 14 | Medium: 10 | Low: 8

---

## localStorage Keys

| Key | File | Purpose |
|-----|------|---------|
| `doit-v8-shift` | app/app/page.tsx, app/notifications.ts | Main app state (tasks, dayLog, energy, etc.) |
| `doit-v8-plan` | app/app/page.tsx | Templates, history, streak |
| `doit-v8-settings` | app/app/page.tsx | Drain rate settings |
| `pitgoal-energy` | app/app/page.tsx | Current energy level |
| `pitgoal-energy-tick` | app/app/page.tsx | Last energy tick timestamp |
| `pitgoal-sleeping` | app/app/page.tsx | Sleep state boolean |
| `pitgoal-sleep-start` | app/app/page.tsx | Sleep start timestamp |
| `pitgoal-last-sleep` | app/app/page.tsx | Last sleep session timestamp |
| `pitgoal-custom-types` | app/app/page.tsx | Custom task type definitions |
| `pitgoal-custom-tags` | app/app/page.tsx | Custom tag definitions |
| `pitgoal-username` | components/ProfileTab.tsx | User display name |
| `pitgoal-avatar-color` | components/ProfileTab.tsx | Avatar accent color |
| `pitgoal-notif` | components/ProfileTab.tsx | Push notification toggle |
| `pitgoal-rest-warning` | components/ProfileTab.tsx | REST NOW warning toggle |
| `pitgoal-overdue-alerts` | components/ProfileTab.tsx | Overdue alerts toggle |
| `pitgoal-rate-idle` | components/ProfileTab.tsx | Custom idle drain rate |
| `pitgoal-rate-task` | components/ProfileTab.tsx | Custom task drain rate |
| `pitgoal-rate-urgent` | components/ProfileTab.tsx | Custom urgent drain rate |
| `pitgoal-rate-rest` | components/ProfileTab.tsx | Custom rest restore rate |
| `pitgoal-rate-sleep` | components/ProfileTab.tsx | Custom sleep restore rate |
| `pitgoal-panel-widths` | components/ResizableLayout.tsx | Desktop panel widths |
| `pitgoal-sync-queue` | lib/sync.ts | Offline sync queue |
| `doit-v1` | components/MissionTab.tsx | Mission progress (legacy key) |

**Note:** ProfileTab has its own rate settings (`pitgoal-rate-*`) that are separate from `doit-v8-settings` used by page.tsx. These two systems don't communicate — ProfileTab saves rates to its own keys, but page.tsx reads from `doit-v8-settings`. The energy rate changes in ProfileTab's settings sliders likely have **no effect** on the actual energy drain.

---

## z-index Map

| Value | Element | File |
|-------|---------|------|
| 0 | Nav highlight pill | components/BottomNav.tsx:226 |
| 1 | Nav tab cell | components/BottomNav.tsx:247 |
| 1-N | FriendStack cards | components/FriendStack.tsx:120 |
| 1-2 | PitTab TopicStack | components/PitTab.tsx:418,422 |
| 2-3 | DayTimeline now-line | components/DayTimeline.tsx:181-182 |
| 10 | ResizableLayout divider | components/ResizableLayout.tsx:136 |
| 10 | FriendsTab story/profile views | components/FriendsTab.tsx:174,224 |
| 85 | PopupBar overlay | components/PopupBar.tsx:268 |
| 90 | PopupBar (full/medium/pill) | components/PopupBar.tsx:286,468,594 |
| 99 | DayTimeline dropdown backdrop | components/DayTimeline.tsx:667 |
| 100 | BottomNav | components/BottomNav.tsx:178 |
| 100 | DayTimeline dropdown menu | components/DayTimeline.tsx:671 |
| 100 | page.tsx month picker overlay | app/app/page.tsx:955 |
| 200 | CreateTaskSheet overlay | components/CreateTaskSheet.tsx:239 |
| 200 | ProfileTab modals | components/ProfileTab.tsx:413+ |
| 200 | DayTimeline date popup backdrop | components/DayTimeline.tsx:484 |
| 200 | page.tsx edit modal, done/skipped sheets | app/app/page.tsx:1437+ |
| 201 | CreateTaskSheet body | components/CreateTaskSheet.tsx:243 |
| 201 | DayTimeline date popup | components/DayTimeline.tsx:493 |
| 201 | page.tsx edit modal body | app/app/page.tsx:1439 |
| 210 | page.tsx sleep/wake overlay | app/app/page.tsx:2001 |
| 300 | CreateTaskSheet add-popup overlay | components/CreateTaskSheet.tsx:413 |
| 301 | CreateTaskSheet add-popup body | components/CreateTaskSheet.tsx:417 |

**Potential conflict:** PopupBar at z-90 appears BEHIND BottomNav at z-100. If PopupBar full-state overlay is at z-85, it won't cover BottomNav. This appears intentional (popup sits above content but below nav). However, the FriendsTab story view at z-10 with `position: absolute` can appear behind PopupBar/BottomNav — likely intended since it's scoped to the content area.
