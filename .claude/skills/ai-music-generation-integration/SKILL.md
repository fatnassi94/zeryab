---
name: ai-music-generation-integration
description: Integrate a real external AI audio/music generation model or service — provider evaluation (API, licensing of outputs, cost, latency, inputs), server-side calls, job status, previews, error handling and clear labelling. Use only after the rule-based composer works, and whenever someone asks for "AI-generated music", prompts-to-audio, or reference-audio generation.
---

# AI music generation integration

## Implemented: sheet-music transcription (not audio generation)
Admins can turn a photo or PDF of a score into notation in the Maqam lab with Claude (`claude-opus-5-5`, effort high, structured JSON output, `fallbacks: "default"`). Off unless `ANTHROPIC_API_KEY` is set (README › Sheet music from a photo or PDF).
- `src/lib/ai/transcribe.ts` (server-only call, typed SDK errors, refusal/max_tokens checks) · `src/app/api/studio/transcribe/route.ts` (admin only, same-origin, ≤8 images or 1 PDF; under `/api` so the proxy doesn't buffer uploads) · `src/lib/music/score/ai-transcription.ts` (schema, prompt, `transcriptionToScore`, `unevenBars`, cost estimate) · `musicxml-write.ts`.
- Results are labelled ("transcribed by Claude — check every bar"), show tokens and estimated cost, are kept on the device at once, and are saved to the club library only by a person (`documents.source` records the model). Spend cap: set it on the API key's workspace in the Claude Console.

**Order matters:** the deterministic pipeline (`maqam-midi-composer` → `audio-engine-architecture` → `audio-export-and-rendering`) must work first. AI generation is an optional layer.

## Hard rules
- **Never fabricate**: no placeholder audio, no "AI" label on rule-based output, no UI for a provider that isn't configured. If no provider is set up, the feature is hidden or shows "not configured".
- **Never call paid APIs** without the club's explicit approval of the provider, pricing and budget.
- **Keys server-side only** (`process.env`, Route Handler / Server Action; never `NEXT_PUBLIC_`).
- **Reference audio** only from recordings the club owns rights to, with consent of performers.

## Provider evaluation (do this at implementation time — offerings change fast)
Write `docs/ai-audio-provider.md` with, for each candidate:
| Question | Why |
|---|---|
| Is there an official, documented API (not a scraped/unofficial wrapper)? | Reliability, ToS |
| Output licence: can the club use/publish outputs commercially? Attribution? | Legal |
| Inputs: text prompt, melody/MIDI conditioning, reference audio, duration limits | Can it respect a maqam at all? |
| Microtonal fidelity: does output keep quarter-tones or drift to 12-TET? | Musical validity — test with Bayati/Saba |
| Cost per minute of audio, rate limits, latency, async jobs/webhooks | Budget, UX |
| Data retention / training on uploaded audio | Privacy of members' recordings |
Run a small blind listening test with teachers before choosing.

## Integration workflow
1. Table `generation_jobs` (id, user_id, provider, params jsonb, status queued|running|succeeded|failed, cost_estimate, output_path, error, created_at) with RLS: owner + staff read; insert via server action only.
2. Server action validates input, checks per-user quota, creates the job, calls the provider; long jobs use provider webhooks → Route Handler (verify signatures) or polling with backoff.
3. Store outputs in `media-private` under `generated/<user>/<job>.wav` with metadata (provider, model version, prompt, date) and an "AI-generated" flag shown in the UI.
4. UI: job status, preview player, retry, cancel; clear errors (quota, provider down, content filtered).
5. Pitch-check outputs with `maqam-audio-analysis` and show the intonation report next to the audio.

## Acceptance criteria
- Feature flag off by default; with no API key, no AI UI is visible.
- Every generated file traceable to provider, model version and parameters.
- Cost per month bounded by a configured cap; jobs stop when exceeded.
