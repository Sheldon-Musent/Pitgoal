# PITGOAL v13 — Design Spec (Brand DNA)
## For Claude Code CLI — Apply this spec to the entire app

---

## Brand Identity

**App:** Pitgoal — daily task tracker + goal manager
**Vibe:** Premium, minimal, Apple-quality spacing. Dark mode only. Inspired by Any Distance app.
**Philosophy:** Color = status/accent only. Everything else is grayscale. No clutter. Generous whitespace.

---

## Color System

### Primary Accent
- `--accent`: `#FFD000` (golden yellow — matches Pitgoal logo)
- `--accent-10`: `rgba(255, 208, 0, 0.08)`
- `--accent-30`: `rgba(255, 208, 0, 0.2)`
- Active accent on dark: black text `#0a0a0a` on `#FFD000` background

### Background
- `--bg`: `linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0d0d0d 100%)` — subtle gradient
- `--card`: `#161616`
- `--border`: `#1e1e1e`
- `--border2`: `#2a2a2a` (emphasized borders, expanded states)

### Text Hierarchy (grayscale only)
- `--t1`: `#ffffff` — primary headings, big numbers
- `--t2`: `#bbbbbb` — task names, body text
- `--t3`: `#888888` — secondary info
- `--t4`: `#555555` — labels, inactive filters
- `--t5`: `#3a3a3a` — timestamps, hints, disabled

### Semantic Colors
- `--warn`: `#fb923c` (orange) — warnings, skip count
- `--danger`: `#E24B4A` — urgent tasks, delete actions
- `--rest`: `#6b8a7a` (muted green) — rest type tasks
- `--pink`: `#f472b6` — collab badge

### On-accent Colors (text/elements ON yellow background)
- Title: `#0a0a0a`
- Subtitle/meta: `rgba(0,0,0,0.4)`
- Hint text: `rgba(0,0,0,0.25)`
- Button bg: `rgba(0,0,0,0.1)`
- Button text: `rgba(0,0,0,0.45)`
- Primary action button: bg `#0a0a0a`, text `#FFD000`

---

## Typography

### Font Stack
- `DISPLAY`: System font — `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`
- `BODY`: Same system font
- `MONO`: `'SF Mono', 'JetBrains Mono', monospace` — timestamps, labels, badges, stats

### Scale
- Big stat numbers: 30px, weight 700, letter-spacing -1px
- Task name (card): 16–17px, weight 600–700
- Timer display: 22–24px, weight 700, tabular-nums
- Card timestamp: 10px, MONO, weight 500, color --t5
- Badge/label text: 9px, MONO, weight 500–700
- Section header (COMPLETED, SKIPPED): 11px, weight 600, letter-spacing 1px
- Filter pill text: 11px, weight 500–700
- Stat sub-label: 9px, MONO, letter-spacing 2px, weight 600

---

## Border Radius Rules

| Element | Radius | Notes |
|---------|--------|-------|
| Stats cards | 16px | Square-ish, solid feel |
| Date strip container | 50px | Full pill |
| Date pill (selected) | 50px | Pill inside pill container |
| Filter pills | 50px | Full pill |
| Active task card | 50px | Full pill, taller height for breathing room |
| Pending task (collapsed) | 50px | Full pill |
| Expanded task card | 16px | Opens up to show action pills |
| Action pills (inside cards) | 50px | Small pill buttons |
| Type/tag badges | 50px | Small pills |
| Bottom nav container | 50px | Full pill |
| Add task button | 50% (circle) | Round circle |
| Month grid overlay | 16px | When date area tapped |
| CreateTaskSheet | 24px top corners | Bottom sheet |

---

## Spacing Rules

- Page padding: `24px` horizontal, `24px` top
- Card internal padding: `16px 22px` (collapsed), `16px 20px` (expanded), `24px 28px` (active)
- Gap between cards: `8px`
- Gap between sections: `14–18px`
- Gap between stat cards: `10px`
- Gap between filter pills: `8px`
- Gap between action pills: `6px`

---

## Component Specs

### A. Stats Row (top of page)
- 3 cards in a row, flex: 1 each, gap 10px
- Background: `--card`, border: `1px solid --border`, radius 16px
- Content: big number (30px, --t1) + sub-label (9px, --t5, MONO, letter-spacing 2px)
- Middle stat (tracked hours) uses `--accent` color for the number
- Padding: `16px 12px`, text-align center

### B. Date Strip
- Container: `--card` bg, 50px radius, padding 6px, border 1px `--border`
- 5 date cells inside, flex: 1, radius 50px
- Selected date: bg `#FFD000`, day text `#0a0a0a` (18px, 700), weekday text `rgba(0,0,0,0.5)`
- Unselected: day text `--t5` (16px, 600), weekday text `--t5` (10px, 500)
- Below strip: centered text `MAR 2026 ▾` (10px, color #333, letter-spacing 1px)
- Tapping `MAR 2026 ▾` expands a month grid overlay (16px radius, same card bg)

### C. Filter Bar
- Single row, horizontal scroll, **scrollbar hidden** (use CSS: `::-webkit-scrollbar { display: none }`, `-ms-overflow-style: none`, `scrollbar-width: none`)
- No wrapping — `flex-wrap: nowrap`, `overflow-x: auto`
- Active filter: bg `#FFD000`, text `#0a0a0a`, weight 700
- Inactive: bg `--card`, text `--t4`, weight 500, border 1px `--border`
- All pills: radius 50px, padding `8px 18px` (active: `8px 20px`)
- Types are round pills, tags are round pills (both 50px radius now)
- Long-press custom items to enter delete mode (red X badge)

### D. Task Cards

#### Active Task (currently running timer)
- **Pill shape**: radius 50px
- **Taller**: padding `24px 28px` — generous breathing room
- Background: `#FFD000`
- Layout (stacked, 3 rows):
  1. Status row: pulse dot (6px) + "ACTIVE" label (9px, rgba(0,0,0,0.4)) + time range (9px, rgba(0,0,0,0.25))
  2. Title row: task name (19px, #0a0a0a, 700) left — timer (24px, #0a0a0a, 700, tabular-nums) right
  3. Action row: 3 pill buttons (Done / Pause / Skip), flex: 1 each, radius 50px
- Done button: bg #0a0a0a, text #FFD000 (inverted)
- Other buttons: bg rgba(0,0,0,0.1), text rgba(0,0,0,0.45)
- Row gaps: 10px → 16px → buttons

#### Active Task EXPANDED (tap to expand)
- Same as above but adds:
  4. Description text (if exists): 13px, rgba(0,0,0,0.5), margin-top 12px
  5. Additional action pills row: Edit, Switch, Urgent toggle — same style as expanded pending
- Radius changes to 24px when expanded (accommodates more content)

#### Upcoming Task ("IN X MIN" state)
- Same as collapsed pending card but with badge:
  - Top-left badge: "IN 5 MIN" — 8px, MONO, weight 700, letter-spacing 1px, color --accent, bg --accent-10, padding 2px 6px, radius 50px
- Play button circle on right: 40px, border 2px --border2

#### Pending Task — Collapsed
- Pill shape: radius 50px
- Background: `--card`, border: 1px `--border`
- Padding: `16px 22px`
- Layout: flex row, task info left, play button circle right
  - Timestamp: 10px, --t5, MONO, weight 500
  - Task name: 16px, --t2, weight 600
  - Badges row: type pill + duration pill + tag pills (gap 5px)
- Play button: 40px circle, border 2px --border2, play icon fill #444
- Badge style: 9px, MONO, weight 500, padding 3px 10px, radius 50px, bg #222, color #444
- Tag badge accent: tag's own color at 0.08 opacity bg, full color text

#### Pending Task — Expanded (tap to expand)
- Radius changes to **16px** (from 50px)
- Border color: `--border2` (brighter)
- Same info layout at top
- Chevron up icon replaces play button (12px, stroke #444)
- Below info: action pills row (wraps), gap 6px, margin-top 12px
  - **Done**: bg #FFD000, text #0a0a0a, weight 700
  - **Edit, Skip, Urgent, Rest**: bg #222, text #555, weight 600
  - **Delete**: bg rgba(200,50,50,0.08), text #844, weight 600
- If task has `desc`: show description text below badges, 12px, color --t3, margin-top 8px

#### Collab Task
- Same card style as pending collapsed (pill, --card bg, same border)
- **No gradient, no special background** — differentiated by COLLAB badge only
- COLLAB badge: 8px, MONO, weight 700, letter-spacing 1px, color #c8a000, bg rgba(255,208,0,0.1), radius 50px
- Right side: friend initial avatar (36px circle, bg rgba(255,208,0,0.1), text #c8a000, 13px, 700)
- "w/ Name" badge in badges row

#### Done Task (in collapsed Completed section)
- Same as collapsed pending but:
  - Opacity: 0.5
  - Task name: line-through, color --t5
  - Tap to undo (mark undone)

#### Skipped Task (in collapsed Skipped section)
- Same as done task styling
- REDO button to restore

### E. Completed / Skipped Sections
- Collapsible headers below task list
- Layout: label (11px, #2a2a2a, weight 600, letter-spacing 1px) + count badge (10px, #3a3a3a, bg #1a1a1a, radius 50px) + line separator (1px, #1a1a1a) + chevron down (12px, stroke #2a2a2a)
- Gap between items: 8px
- Chevron rotates on expand

### F. Floating Add Button
- Position: bottom bar, **same row as nav pill, to the right**, separated by 10px gap
- Size: 50px circle (same height as nav icon buttons)
- Background: #FFD000
- Icon: plus sign, stroke #0a0a0a, stroke-width 2.5
- Opens CreateTaskSheet (bottom sheet)

### G. Bottom Navigation
- Floating pill: bg #161616, radius 50px, padding 5px, border 1px #222
- 4 icon buttons: 50px circles each
- Active tab: bg #FFD000, icon stroke #0a0a0a
- Inactive tab: transparent bg, icon stroke #3a3a3a
- Tab order: Timer (main) | Grid (community) | Friends | Profile
- Layout: centered in viewport with add button to the right
- Bottom padding: 34px (safe area)

### H. CreateTaskSheet (bottom sheet)
- Slides up from bottom when + tapped
- Top corners: 24px radius
- Background: #161616 or slightly darker
- Split-tap trigger bar: tap text = inline fast mode, tap + = open sheet
- Name input with attached suggestions (no gap between input and suggestion list)
- Description textarea
- TYPE row: pill selection (TASK/REST/LIFE + custom), single select
- TAGS row: pill selection (42KL/HUB/CERT/DOIT/SELF + custom), multi-select
- + button on type/tag rows opens add popup (centered card)
- TIME + DURATION fields
- All pills and buttons follow the same 50px radius pill style

### I. PopupBar (existing)
- 3-state popup: full / medium / pill
- Shows when timer active, paused, or task upcoming
- Should use --accent (#FFD000) for working state instead of old green
- Timer text: 24px, weight 700, tabular-nums

---

## Animation

- `fadeUp`: from opacity 0, translateY(6px) → opacity 1, translateY(0) — 0.3s ease, staggered 0.04s per card
- `pulse`: opacity 1 → 0.3 → 1, 1.5s infinite — for active dot indicator
- `tap` class: `:active { opacity: 0.65; transform: scale(0.97) }` — tactile feedback
- Card expand/collapse: smooth height transition
- Scrollbar hiding: `.no-scrollbar::-webkit-scrollbar { display: none }` + `-ms-overflow-style: none` + `scrollbar-width: none`

---

## CSS Variables to Update (globals.css)

Replace the current accent color system. The old green (#2ECDA7) becomes yellow (#FFD000):

```css
[data-theme="dark"] {
  --bg: #0a0a0a;
  --card: #161616;
  --border: #1e1e1e;
  --border2: #2a2a2a;
  --accent: #FFD000;
  --accent-10: rgba(255, 208, 0, 0.08);
  --accent-30: rgba(255, 208, 0, 0.2);
  --t1: #ffffff;
  --t2: #bbbbbb;
  --t3: #888888;
  --t4: #555555;
  --t5: #3a3a3a;
  --warn: #fb923c;
  --danger: #E24B4A;
  --danger-dim: rgba(226, 75, 74, 0.1);
  --danger-fill: #E24B4A;
  --rest: #6b8a7a;
  --pink: #f472b6;
  --pink-dim: rgba(244, 114, 182, 0.1);
  --glow: #222222;
  --warn-fill: #FFD000;
  --warn-fill-text: #0a0a0a;
  --fill-title: #0a0a0a;
  --fill-sub: rgba(0,0,0,0.4);
}
```

---

## Key Behavioral Notes

1. **Only 1 card expanded at a time** — expanding one collapses the other
2. **Active task always at top** of timeline, followed by upcoming
3. **markDone from inline pills must clear activeTask** if that task is active (bug already fixed)
4. **Filter bar**: single row scroll, hidden scrollbar, long-press to delete custom types/tags
5. **Month picker**: tap "MAR 2026 ▾" below date strip to expand month grid
6. **Task description**: shown in expanded view only, below badges
7. **Collab tasks**: sorted by time with regular tasks, distinguished by COLLAB badge + avatar only

---

## What NOT to Change

- All business logic (timer, energy system, auto-shift, save/load, Supabase sync)
- Task data shape (keep all existing fields)
- CreateTaskSheet functionality (types, tags, suggestions, popup add/delete)
- localStorage keys
- Notification system
- The 4-tab bottom nav structure (main, community, friends, profile)
- PopupBar 3-state system (just restyle with new colors)
