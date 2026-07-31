---
# DESIGN.md — machine-readable design tokens (normative).
# Prose below provides context for how to apply them.
colors:
  canvas: "#faf8f5"
  cream-100: "#f5f1ea"
  cream-200: "#ece5d9"
  white: "#ffffff"
  ink: "#141414"
  ink-soft: "#3f3f46"
  muted: "#6b6b6b"
  scrim: "rgba(15, 23, 42, 0.14)"
  scrim-strong: "rgba(15, 23, 42, 0.26)"
  brand-50: "#eef4fe"
  brand-100: "#dbe6fb"
  brand-200: "#b6ccf6"
  brand-300: "#7f9ff0"
  brand-400: "#3f6be0"
  brand-500: "#0a48b7"
  brand-600: "#083a95"
  brand-700: "#062c70"
  brand-900: "#05204f"
  sky: "#419fe8"
  teal: "#5099bb"
  lime: "#9acc25"
  rose-accent: "#e61e38"
  lime-accent: "#6f9e12"
  lime-bright: "#84b81a"
typography:
  display-xl:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  body-lg:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.16em"
  label-sm:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
rounded:
  xs: "4px"
  lg: "1rem"
  xl: "1.25rem"
  "2xl": "1.5rem"
  "3xl": "1.75rem"
  bezel: "1.75rem"
  full: "9999px"
spacing:
  page-stack: "2rem"
  card: "1.5rem"
  card-lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
  button-primary-hover:
    backgroundColor: "{colors.brand-600}"
    textColor: "#ffffff"
  button-ghost:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.3xl}"
    padding: "{spacing.card}"
  chip-selected:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-700}"
    rounded: "{rounded.full}"
---

# Design System: Maubisa Pusat Akun

## Overview

**Creative North Star: "Ruang Belajar yang Tenang" (The Calm Study).** A warm, disciplined
workspace for people making high-stakes decisions about their education and career — final-year
students seeking thesis guidance, fresh graduates upskilling, professionals pursuing
certification. The system pairs a cream paper canvas with deep academic navy so money and
account tasks feel calm and trustworthy, never clinical or alarming.

Mood: **warm, credible, quietly confident, unhurried.** Reassurance outranks expression: this is
an Operate surface (dashboard + checkout) where scanability, consistency, and confidence at
money/security moments matter more than flourish. Brand lives in precise details — the paper
canvas, the navy sidebar, the disciplined type — not in loud gestures.

**Anti-reference:** generic purple-gradient SaaS billing dashboards, aggressive fintech red, and
anything that makes an anxious student feel rushed or a certification buyer distrust the page.

> Note: this DESIGN.md was auto-extracted from code (Tailwind v4 `@theme` in `src/app/globals.css`)
> and the North Star / voice inferred from PRODUCT.md audience while the user was unavailable to
> confirm qualitative naming. Refresh with `/impeccable document` to confirm the descriptive
> language.

## Colors

### Primary
- **Maubisa Blue** (`#0a48b7`, `brand-500`): the single brand accent — primary buttons, links,
  selected states, focus rings (`brand-400`), and the **left sidebar** (a `brand-500 → brand-700`
  vertical gradient for depth; white text at AAA, section/label text ≥ AA). Deepest step
  `brand-900` (`#05204f`) is reserved for the deepest headings only, no longer the sidebar.
- Full ramp `brand-50 … brand-900` for tints (selected chip backgrounds `brand-50`, hover
  borders `brand-300`, hover fills `brand-600`).

### Palette extension (brand family, use with intent)
- **Sky** (`#419fe8`, `sky`): brighter blue for the **active nav accent** (icon + indicator dot)
  on the blue sidebar, where a mid-blue would not pop.
- **Teal** (`#5099bb`, `teal`) / **Lime** (`#9acc25`, `lime`): reserved accents from the brand
  palette for future data/status use. Do not scatter; the page still has one primary (Maubisa
  Blue).

### Neutral
- **Paper Canvas** (`#faf8f5`, `canvas`): app background, softened by two faint navy radial
  glows fixed at the top corners.
- **Cream** (`#f5f1ea` / `#ece5d9`, `cream-100/200`): inset code/VA fields, secondary surfaces.
- **Ink** (`#141414`) / **Ink Soft** (`#3f3f46`) / **Muted** (`#6b6b6b`): text primary →
  secondary → tertiary. Body/supporting text on white uses `zinc-500`+ (≥4.5:1); reserve
  `zinc-400` for non-essential metadata and icons only.

### Status accents (semantic, used sparingly)
- **Success Lime** (`#6f9e12` / `#84b81a`): paid/active confirmations, "Terpopuler".
- **Danger Rose** (`#e61e38`, `rose-accent`): destructive confirms (cancel), errors — never a
  decorative color.
- Amber (`amber-50/200/600/700` from Tailwind): "menunggu pembayaran" nudges.

### Named Rules
- **One accent only.** Navy is the brand; lime/rose/amber are *semantic status*, not palette
  expansion. Never introduce a second brand hue.
- **Never gray on a colored surface.** On a tinted surface, tint secondary text from that hue or
  the foreground.

## Typography

Three self-hosted faces: **Cabinet Grotesk** (display/headings, `-0.02em`), **Satoshi**
(UI/body), **Geist Mono** (order IDs, VA numbers, amounts-as-data only).

### Hierarchy
- **Display** (Cabinet, 700, `clamp(1.75rem,4vw,2.25rem)`, tight): page hero ("Halo, {nama}.").
- **Headline** (Cabinet, 700, ~1.25rem): panel titles.
- **Title** (Satoshi, 700, 0.875rem): card/section titles, table item names.
- **Body** (Satoshi, 400, 0.875rem, 1.6): descriptions, help text. Keep readable measure.
- **Label** (Satoshi, 600, 0.6875rem, `0.16em`, uppercase): section eyebrows ("Ringkasan
  pesanan", "Metode pembayaran"), stat labels. Use `zinc-500` for contrast.

### Named Rules
- Mono is **for data only** (order IDs, VA/bill numbers), never as a "technical" costume.

## Layout

- **Shell:** fixed navy sidebar (desktop) + top bar with breadcrumb, quick-search (`/`),
  notifications, profile; a slide-over drawer replaces the sidebar below `md`.
- **Content rhythm:** page sections stack at `space-y-8` (`2rem`); the overview hero uses
  `space-y-10`. Cards: internal padding `p-6` (`1.5rem`), large panels `p-6 sm:p-8`.
- **Breakpoint behavior:** data tables (payments, subscription bills) render as a full table at
  `md+` and as stacked **InvoiceRowCard**s below `md`, so primary actions never hide behind
  horizontal scroll.
- **Max width:** dashboard content ~`max-w-6xl`; checkout column `max-w-md`.

## Elevation & Depth

Flat-with-soft-lift, not heavy. Shadows are ambient (separation), never hard offsets.

### Shadow Vocabulary
- **soft** (`0 1px 2px rgba(11,15,23,.05), 0 20px 45px -28px rgba(11,15,23,.28)`): resting cards.
- **lift** (`… 0 34px 60px -30px rgba(11,15,23,.4)`): toasts, popovers, drawer.
- **brand** (`… 0 18px 40px -12px rgba(10,72,183,.45)`): primary CTA only.

### Named Rules
- Every shadow carries offset + soft blur. No zero-blur block shadows, no colored halos.

## Shapes

Generously rounded, friendly-not-childish. Radius scale: inputs/pills `rounded-2xl` (1.5rem) →
cards `rounded-3xl` (1.75rem, `bezel`) → chips/buttons `rounded-full`. Borders are hairline
(`border-black/[0.06–0.08]`); never a colored border above 1px.

## Components

### Buttons
- **Shape:** `rounded-full`. Base carries `focus-visible:ring-2 ring-brand-400 ring-offset-2`.
- **Primary:** `bg-brand-500 text-white shadow-brand`, hover `bg-brand-600 -translate-y-[1px]`,
  `active:scale-[0.98]`. Padding `py-2.5 px-5` (icon variant `pl-5 pr-2`).
- **Ghost:** `bg-white text-ink ring-1 ring-black/[0.08] shadow-soft`, hover `bg-zinc-50`.
- **Destructive:** `bg-red-600` hover `bg-red-700` — only for confirmed cancel.

### Chips
- **Filter/goal chips:** `rounded-full border border-black/10 bg-white`; selected →
  `border-brand-400 bg-brand-50 text-brand-700`. Keyboard focus via `peer`/`has-[:focus-visible]`.

### Cards / Containers
- **Corner:** `rounded-3xl`. **Background:** white on paper canvas. **Shadow:** `soft`.
- **Border:** hairline `border-black/[0.06]`. **Padding:** `p-6` (large `p-6 sm:p-8`).

### Status Badge
- Pill with tinted bg + tinted text from the *same* status hue (lime=paid, amber=pending,
  rose=failed/cancelled, zinc=neutral). Centralized labels in Indonesian.

### Trust & reassurance patterns (money/security surfaces)
The North Star is calm confidence at high-stakes moments; these patterns encode it:
- **Trust precedes the decision.** On guest checkout, a compact trust line (lock icon · badan
  hukum · KOMDIGI · Midtrans 3D Secure) sits directly under the order summary, *before* the form
  and Bayar CTA — a guest from an ad must believe before they commit. The full "Aman & tepercaya"
  block (trust points + WhatsApp) stays below for depth. Never place all trust after the CTA.
- **Status banners reassure first.** A pending-payment banner leads with the outcome ("aksesmu
  aktif otomatis begitu dikonfirmasi"), not urgency. The container carries the amber *status* tint;
  the CTA stays calm (white + amber-800 text), never a loud solid-amber button that manufactures
  debt anxiety for an already-anxious student.
- **Destructive surfaces stay quiet until intent.** Session/security rows keep the current device
  primary (lime "Aktif sekarang"); secondary actions are neutral at rest ("Akhiri sesi" in zinc,
  rose only on hover/confirm). Rose is reserved for the confirm step, never the resting list — a
  wall of red makes protection feel like danger.
- **Destructive confirmations are focused modals, not inline cards.** Cancelling a payment (checkout
  waiting screen and payment/subscription tables) confirms in a centered `Modal` (dimmed backdrop,
  focus-trap, esc, scroll-lock) — never an inline red block that pushes content. A destructive,
  deliberate action deserves focus, and a modal never causes layout shift. Inline confirmation is
  reserved for low-stakes, contextual toggles. One shared `CancelPaymentDialog` keeps checkout and
  tables consistent.
- **Every overlay renders through a portal to `document.body`.** A `position:fixed` overlay placed
  inside an ancestor that has a `transform` (our `Reveal`/`animate-rise` keeps a transform via
  fill-mode `both`) is positioned relative to that ancestor, not the viewport, so it gets trapped
  and clipped inside a card. All modals/dialogs (shared `Modal`, `AddCardDialog`, `ThreeDsModal`)
  use `createPortal` with a mount guard. Never hand-roll a `fixed inset-0` overlay inline in page
  content; portal it, or the next `Reveal` wrapper silently breaks it.
- **Payment success is a full-screen confirmation, not a status line.** When a payment resolves to
  paid, the instruction card is replaced by a centered lime check + "Pembayaran berhasil" + a
  redirecting spinner, held about 2s before navigating to the dashboard (`/akses` logged-in,
  `/terima-kasih` guest). A money moment ending well deserves an unmistakable peak, not a quiet
  status swap.
- **Card method uses a neutral card icon, not one network's logo.** The card method tile (picker and
  instruction header) shows a generic card glyph — every issuer/network is accepted, so featuring
  Visa alone would misrepresent. The Visa/Mastercard/JCB marks appear only inside the card form as a
  live BIN-detection indicator (the typed card's network highlights; others dim).
- **A row of mixed-aspect logos sits in identical fixed boxes, not equal height.** Equal `height` +
  `w-auto` makes a wide wordmark (Visa ~3:1) dwarf squarer marks (Mastercard, JCB). Give each mark
  the same fixed box (`h-5 w-9`, `object-contain`) so they occupy one footprint and the wordmark
  scales down to fit. This is the rule wherever network/brand marks line up (card-form header, and
  any future logo strip), distinct from a single wide wordmark in one chip (banks, below).
- **Redirects are allowlisted.** Any post-action navigation whose target can come from a query param
  (`?redirect=` on checkout, login) passes `safeInternalPath()` — internal paths only, rejecting
  absolute URLs, protocol-relative `//`, and schemes. No open redirect from a money/auth surface.
- **Checkout is two columns on desktop, one on mobile.** The select phase uses a
  `lg:grid-cols-[0.9fr_1fr]` split: left = order summary + trust (sticky), right = buyer form +
  method picker + pay button. This keeps every method (including Card at the bottom) reachable
  without a long scroll past the whole list. Below `lg` it collapses to a single column (summary →
  form). The instruction/success phase stays a single narrow `max-w-md` column (focused task).
- **Payment brand logos are wide wordmarks in a fixed wide chip.** Bank/e-wallet marks (from
  idn-finlogos, newest variant when a bank has rebranded) are wordmarks, so the logo chip is a
  fixed 56×36 slot with `object-contain`, never a tiny square that shrinks the wordmark. Logos are
  rasterized to transparent PNG (reliable cross-browser as plain images); the card method stays a
  neutral card icon.
- **The credit card is a live, on-brand object, not a purple template.** `shared-assets/credit-card`
  mirrors the Untitled UI API (`type`, `company`, `cardNumber`, `cardHolder`, `cardExpiration`,
  `width`) but is themed with the nav gradient (`brand-500 → brand-700`), Maubisa wordmark, gold
  chip, and contactless glyph. It updates as the buyer types and auto-detects the network logo from
  the BIN. Reused in checkout (live preview above the fields) and in saved-method cards (masked
  `•••• •••• •••• 1234`). One card object across products = consistent, trustworthy money moments.
- **Saved payment methods read as a manager, not a log.** `/metode-pembayaran` shows real saved
  cards with one **primary** (starred, ringed) and others secondary, each with set-primary + remove,
  plus an **Add card** dialog (Midtrans Card Registration, no charge). What is stored is the Midtrans
  token + brand/last4/expiry, never the PAN. A "previously used" list is the wrong model here; users
  expect to add, designate a default, and remove, like every subscription app.
- **3DS assurance is per-card.** The verification modal shows the program mark of the *typed*
  network (Visa → Verified by Visa, Mastercard → SecureCode), or the card's own logo + a neutral
  "3-D Secure" badge for others, next to the Midtrans gateway mark. Showing every brand regardless
  of the card in hand is noise; match the instrument the buyer actually used.


## Motion

One authored moment per surface, exponential ease-out from an already-visible default.
- Tokens: `--ease-out-quint` (`cubic-bezier(0.16,1,0.3,1)`), `--ease-fluid`.
- Entrances: `animate-rise` / `animate-fade` (dashboard), staggered auth entrances.
- Interactions: 200–500ms color/transform transitions; `active:scale-[0.98]` on buttons.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` neutralizes entrances (state
  preserved). Honor it — never a global `0.01ms` kill of useful feedback.

### Named Rules
- Motion conveys **state**, not decoration. No bounce/elastic easing (the ease-out curve is
  named `--ease-out-quint`, not "spring", to keep intent honest).
