# Zeryab design tokens (source: `src/app/globals.css`)

Keep this file in sync with `@theme` whenever tokens change.

## Colour
| Token | Value | Role |
|---|---|---|
| `ink` | `#0A0E1A` | Page background |
| `night` | `#05070F` | Hero/sky base |
| `rail` | `#0D1220` | Sidebars (members/admin) |
| `panel` | `#111728` | Cards |
| `field` | `#0D1322` | Inputs |
| `text` | `#EEF1F7` | Primary text |
| `soft` | `#C5CDDC` | Body copy on dark |
| `muted` | `#A3ADC2` | Secondary text, metadata |
| `faint` | `#7C879C` | Placeholders only (fails AA for body text) |
| `gold` | `#E4BE74` | Primary action, emphasis, tonic |
| `gold-light` | `#F3D9A4` | Hover for gold |
| `gold-ink` | `#1A1206` | Text on gold |
| `teal` | `#6FC3D1` | Ghammaz/secondary degree, status |
| `teal-light` | `#8FD3DE` | Teal text on dark |
| `teal-ink` | `#08141A` | Text on teal |
| `rose` | `#E8A48C` | Errors, wrong answers |
| `success` | `#8FD3A8` | Reserved for success states (use sparingly) |
| `ivory` / `ivory-ink` | `#F6EFE1` / `#231A10` | Long-form reading surfaces (articles, lesson notes) |
| `line-strong` | `rgb(255 255 255 / .16)` | Emphasised dividers |
| `line` | `rgb(255 255 255 / .08)` | Borders/dividers |

Contrast notes: `text`, `soft`, `muted` on `ink`/`panel` pass AA; `gold-ink` on `gold` passes AA; `faint` is placeholder-only.

## Type
- Display: Reem Kufi 500/600/700 (`font-display`), Arabic + Latin subsets.
- Body: Readex Pro 300–600 (`font-sans`).
- Arabic display: `clamp(42px, 7vw, 80px)`, leading 1.15. Latin display: `clamp(36px, 5.2vw, 64px)`, leading 1.08, tracking −0.01em.
- Section titles 36–48 px; card titles 22–26 px; body 15–19 px, leading 1.8–1.9.

## Shape & space
- Radii: chips/buttons `999px`; cards `24px` (`--radius-card`); feature panels `28–32px`; inputs `12px`.
- Touch targets ≥ 44 px (`min-h-11`); primary buttons 48–56 px.
- Container `max-w-[1280px]`, gutters 16 px (phone) / 24 px.
- Section spacing 56–112 px.

## Motion (CSS variables in `@theme`, see `motion-design-system`)
`--duration-instant` 120ms · `--duration-fast` 180ms · `--duration-base` 320ms · `--duration-slow` 600ms
`--ease-out` cubic-bezier(0.22,1,0.36,1) · `--ease-in` cubic-bezier(0.4,0,1,1) · `--ease-in-out` cubic-bezier(0.65,0,0.35,1)

## Component classes (`@layer components`)
| Class | Use |
|---|---|
| `.card` / `a.card` | Surface; linked cards get hover border + press |
| `.panel-feature` | The single highlighted block (next rehearsal, event header) |
| `.panel-feature-dual` | Lesson header (teal + gold glow) |
| `.panel-invite` | Call-to-action band (join) |
| `.glass` | Translucent card over illustrations |
| `.btn-gold` / `.btn-ghost` | Primary / secondary; hover, press, disabled, `aria-disabled` states |
| `.chip` / `.chip-teal` | Metadata |
| `.field` / `.label` | Inputs (16 px text, focus ring, `aria-invalid` state) |
| `.skeleton` | Loading placeholder |
| `.glow-gold`, `.dot-gold`, `.dot-teal`, `.shadow-pop` | Effects |

## React primitives (`src/components/ui/*`)
`TextField`, `TextArea` (label/hint/error wiring) · `Notice` (success/info/error, live region) · `SubmitButton` (pending spinner via `useFormStatus`) · `EmptyState` · `Skeleton`; plus `RouteSkeleton` for `loading.tsx` files.
