# Zeryab project skills

30 focused skills. Each folder holds a `SKILL.md` (YAML frontmatter `name` + `description`); a few have `references/` with data or scripts. Claude Code loads them when it runs from this repository root (`zeryab/zeryab`).

## Map
| Group | Skills | Hub |
|---|---|---|
| UI & creative | premium-ui-design, arabic-rtl-design-system, creative-frontend-art-direction, design-system-architecture, responsive-mobile-first, accessibility-audit | design-system-architecture |
| Motion | motion-design-system, framer-motion-specialist, gsap-cinematic-web, webgl-threejs-experiences, canvas-audio-visualization, web-animation-performance | motion-design-system |
| Arabic music | arabic-maqam-theory-engine, microtonal-tuning-engine, maqam-midi-composer, arabic-rhythm-engine, arabic-instrument-synthesis, maqam-audio-analysis | microtonal-tuning-engine |
| Audio production | audio-engine-architecture, pro-audio-player-ui, arabic-arrangement-and-mixing, ai-music-generation-integration, audio-export-and-rendering, audio-engine-testing | audio-engine-architecture |
| Platform | nextjs-typescript-architecture, supabase-security-rls, multilingual-content-workflow, music-library-management, performance-optimization, production-quality-review | production-quality-review |

## Dependency spine
```
design-system-architecture ─┬─ premium-ui-design ── creative-frontend-art-direction
                            ├─ arabic-rtl-design-system ── multilingual-content-workflow
                            └─ motion-design-system ─┬─ framer-motion-specialist
                                                     ├─ gsap-cinematic-web
                                                     └─ web-animation-performance ── webgl-threejs-experiences

microtonal-tuning-engine ── arabic-maqam-theory-engine ─┬─ maqam-midi-composer ─┐
arabic-rhythm-engine ───────────────────────────────────┘                       │
audio-engine-architecture ─┬─ arabic-instrument-synthesis ── arabic-arrangement-and-mixing
                           ├─ pro-audio-player-ui ── canvas-audio-visualization
                           └─ audio-export-and-rendering
maqam-audio-analysis (uses tuning + maqam + canvas)      ai-music-generation-integration (last)
audio-engine-testing covers the whole music/audio column.
```

## Reference data needing human review
- `arabic-maqam-theory-engine/references/maqam-data.md` — 24-TET theoretical starter values, draft.
- `arabic-rhythm-engine/references/iqaat.md` — common skeletons, draft; Tunisian iqa'at intentionally left for the club's teachers.

## Implementation sequence
1. Design system + UI polish (tokens, primitives, states) — `design-system-architecture`, `premium-ui-design`.
2. RTL/responsive hardening + visual check script — `arabic-rtl-design-system`, `responsive-mobile-first`, `production-quality-review`.
3. Motion system + homepage story — `motion-design-system`, `creative-frontend-art-direction` (add `motion`/`gsap` only here).
4. Maqam theory + microtonal pitch model (pure TS + Vitest) — `microtonal-tuning-engine`, `arabic-maqam-theory-engine`, `arabic-rhythm-engine`, `audio-engine-testing`.
5. Functional playback + rule-based composition — `audio-engine-architecture`, `maqam-midi-composer`, `pro-audio-player-ui`.
6. Instruments, arrangement, mixing, export — `arabic-instrument-synthesis`, `arabic-arrangement-and-mixing`, `audio-export-and-rendering`.
7. Optional AI generation — `ai-music-generation-integration` (provider approval first).
8. Security, accessibility, production testing — continuous, gate before pilot launch.
