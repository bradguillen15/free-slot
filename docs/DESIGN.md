# Design System

FreeSlot's visual language: tokens, motion, layout, and the rules contributors must follow.

---

## Aesthetic direction

**Refined dark editorial** — calm, time-aware, slightly futuristic. The product is about *attention*, so the UI tries not to fight for it.

- High contrast typography paired with soft surfaces and subtle gradients.
- Primary accent: a single cool hue with a glow used sparingly (active nav, AI suggestions, CTAs).
- Productive vs unproductive coded in semantic colors so it reads at a glance in week/month views.
- Generous spacing in the calendar grids; dense elsewhere.

---

## The cardinal rule

> **Never write raw color classes** like `bg-white`, `text-black`, `border-gray-200`, `bg-blue-500`.
>
> Always use semantic tokens from `src/index.css` and `tailwind.config.ts`.

If a token doesn't exist for what you need, **add one** in both files (HSL only) instead of hardcoding.

---

## Tokens

Defined in `src/index.css` as HSL CSS variables under `:root` and `.dark`. Mapped to Tailwind utilities in `tailwind.config.ts`.

### Surfaces & text

| Token | Use |
|---|---|
| `--background` / `bg-background` | Page background |
| `--foreground` / `text-foreground` | Primary text |
| `--surface` / `bg-surface` | Cards, grid cells |
| `--muted` / `bg-muted`, `text-muted-foreground` | Subtle backgrounds, secondary text |
| `--border` / `border-border` | Default borders |
| `--sidebar`, `--sidebar-border`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground` | Sidebar + mobile nav |

### Brand & semantic

| Token | Use |
|---|---|
| `--primary` / `bg-primary`, `text-primary`, `text-primary-foreground` | Brand color, active state, CTAs |
| `--accent` / `bg-accent`, `text-accent-foreground` | Secondary accent (peak time, emphasis) |
| `--productive` / `bg-productive` | Productive logs / bars |
| `--unproductive` / `bg-unproductive` | Unproductive logs / bars |
| `--destructive` / `bg-destructive`, `text-destructive-foreground` | Destructive actions, errors |
| `--ring` / `ring` utilities | Focus rings |

### Composed effects

- `gradient-primary` — main brand gradient (use for CTAs, the active nav pill, AI ribbons).
- `shadow-glow` — soft primary-tinted glow under prominent elements.
- `shadow-soft` — neutral elevation for cards.

These are utility classes layered on top of tokens. Prefer them to ad-hoc gradients/shadows.

---

## Typography

| Class | Family / weight | Use |
|---|---|---|
| `font-display` | Display sans, semibold | Page titles, day numbers, big metrics |
| (default) | Body sans | UI text |
| `font-mono-num` | Monospaced numerals | Times, durations, counts (so they don't jiggle) |

Tracking & sizing follow Tailwind defaults. Use `tracking-tight` on display headings, `tracking-wider`/`uppercase` for tiny labels.

**Don't** introduce new fonts without updating the design system.

---

## Spacing & layout

- Page max widths: `max-w-6xl` (Day), `max-w-[1400px]` (Week / Month).
- Page padding: `px-6 md:px-10 py-8`.
- Cards: `rounded-2xl border border-border bg-surface p-3-4`.
- Grid cells (week/month): `rounded-xl` for cells, `rounded-2xl` for containers.

---

## Iconography

`lucide-react` only. Standard sizes: `h-3.5 w-3.5` (chips), `h-4 w-4` (buttons / nav), `h-5 w-5` (mobile nav, headers).

---

## Motion

We use `framer-motion` for everything animated.

### Principles

1. **Snappy, not bouncy.** Spring defaults: `stiffness: 380, damping: 30-32` for nav indicators. Tween: `duration: 0.25, ease: [0.32, 0.72, 0, 1]` (Apple-style ease).
2. **Shared-element transitions** for view changes — `layoutId="viewSwitcherPill"`, `layoutId="navIndicator"`, `layoutId="mobileNavIndicator"`. Never duplicate a `layoutId` for unrelated elements.
3. **Page transitions** are centralized in `AppLayout` (`opacity + y: 6 → 0`). Don't add competing page-level transitions inside individual pages.
4. **Micro-delays** for staggered lists: `transition={{ delay: i * 0.01-0.02 }}`. Keep the multiplier small.
5. **Hover/tap** scaling for prominent buttons: `whileHover={{ scale: 1.05 }}`, `whileTap={{ scale: 0.95 }}`. Reserve for floating action buttons and primary CTAs.

### Don'ts

- ❌ No motion on every list item — it gets noisy.
- ❌ No long-running ambient animations except `animate-pulse-glow` on the FAB.
- ❌ No JS-driven scroll animations.

---

## Components

### shadcn/ui (`src/components/ui/`)

These are *ours*. Customize variants via `class-variance-authority` rather than overriding with one-off classes:

```ts
const buttonVariants = cva("...", {
  variants: {
    variant: {
      premium: "gradient-primary text-primary-foreground shadow-glow",
    },
  },
});
```

### View switcher (`src/components/ViewSwitcher.tsx`)

Animated segmented pill for Day / Week / Month. Uses `layoutId="viewSwitcherPill"`. Place it at the top of any calendar view.

### App shell (`src/components/AppLayout.tsx`)

- Desktop: left sidebar with the full nav.
- Mobile (`md:hidden`): bottom nav with **Calendar / Activities / Stats / Settings** only — calendar views are switched via the in-page `ViewSwitcher`.
- Locked items show a 🔒 and route to `/auth` for guests.

### Public header (`src/components/PublicHeader.tsx`)

Used on `/auth` and `/onboarding` so users always have a route home and into the app.

---

## Responsive rules

Breakpoints follow Tailwind defaults. Practical guidance:

- `< md` (mobile): single column, bottom nav visible, ViewSwitcher centered, calendar grids horizontally scrollable when they exceed viewport (`overflow-x-auto -mx-6 px-6`).
- `md – lg`: desktop sidebar appears, content widens.
- `lg+`: optional split layouts (e.g. Day view with `lg:grid-cols-[1fr_320px]` for the sidebar summary).

Always test at **750 × 727** (the common preview viewport) and at desktop.

---

## Accessibility

- Every interactive nav item has `aria-label` or visible text.
- The view switcher uses `role="tablist"` / `role="tab"` / `aria-selected`.
- Focus rings use the `--ring` token.
- Color is never the only signal: free time also shows a label, productive/unproductive also show via category names.
- Motion respects `prefers-reduced-motion` indirectly (framer-motion honors it for layout animations).

---

## Adding a new design element — checklist

1. Does a token already exist? Use it.
2. If not, add the HSL var to `index.css` (light + dark) and map it in `tailwind.config.ts`.
3. If it's a recurring composition, make it a utility class (`gradient-*`, `shadow-*`) or a CVA variant.
4. Match the existing motion language (snappy springs, soft tweens, shared `layoutId` for transitions).
5. Verify on mobile (750px) and desktop.
