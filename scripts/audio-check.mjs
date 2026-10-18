#!/usr/bin/env node
/**
 * Real-audio check: bundles the app's audio engine for the browser, renders
 * with OfflineAudioContext in Chromium, and measures the result.
 *
 *   npm run check:audio
 *
 * Fails if any scale note is more than ±3 cents off (quarter-tones must be
 * exact), if the mix clips or is silent, or if drum onsets drift > 2 ms.
 * Browser: PW_CHROMIUM_PATH, or Brave if installed, or Playwright's Chromium.
 */
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const outDir = await mkdtemp(join(tmpdir(), "zeryab-audio-"));
await build({
  root,
  logLevel: "warn",
  configFile: false,
  resolve: { alias: { "@": join(root, "src") } },
  build: {
    outDir,
    emptyOutDir: true,
    lib: { entry: join(root, "scripts/audio-check/entry.ts"), formats: ["iife"], name: "AudioCheck", fileName: () => "audio-check.js" },
  },
});

const brave = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync(brave) ? brave : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
await page.setContent("<!doctype html><title>audio check</title>");
await page.addScriptTag({ content: await readFile(join(outDir, "audio-check.js"), "utf8") });
const fixture = await readFile(join(root, "src/lib/music/score/test-fixtures/rast-exercise.musicxml"), "utf8");
const r = await page.evaluate((xml) => window.__audioCheck(xml), fixture);
await browser.close();

const problems = [];
console.log("Bayati scale, rendered and measured:");
for (const n of r.notes) {
  const ok = Math.abs(n.errorCents) <= 3;
  if (!ok) problems.push(`note ${n.expectedHz.toFixed(2)} Hz measured ${n.measuredHz.toFixed(2)} Hz (${n.errorCents.toFixed(2)}¢)`);
  console.log(`  ${ok ? "✓" : "✗"} expected ${n.expectedHz.toFixed(2)} Hz  measured ${n.measuredHz.toFixed(2)} Hz  error ${n.errorCents >= 0 ? "+" : ""}${n.errorCents.toFixed(2)}¢`);
}
// Every track goes through the master DynamicsCompressor, whose look-ahead
// delays the output by a constant ~6 ms in Chromium. What matters musically is
// that the delay is the same for every stroke (no jitter, no drift).
const sorted = [...r.onsetErrorsMs].sort((a, b) => a - b);
const offset = sorted[Math.floor(sorted.length / 2)];
const jitter = sorted[sorted.length - 1] - sorted[0];
console.log(`Mix: peak ${r.peak.toFixed(3)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS), RMS ${(20 * Math.log10(r.rms)).toFixed(1)} dBFS, ${r.durationSec.toFixed(2)} s`);
console.log(`Percussion: ${r.onsetErrorsMs.length} strokes, constant output latency ${offset.toFixed(2)} ms, jitter ${jitter.toFixed(2)} ms`);
console.log("Instruments (Bayati scale pitch, full-piece peak):");
for (const i of r.instruments) {
  const ok = i.maxErrorCents <= 3 && i.peak < 1;
  if (i.maxErrorCents > 3) problems.push(`${i.id}: scale note off by ${i.maxErrorCents.toFixed(2)}¢`);
  if (i.peak >= 1) problems.push(`${i.id}: mix clips (peak ${i.peak})`);
  console.log(`  ${ok ? "✓" : "✗"} ${i.id.padEnd(7)} max error ${i.maxErrorCents.toFixed(2)}¢  peak ${(20 * Math.log10(i.peak)).toFixed(1)} dBFS`);
}
console.log(`Imported score: ${r.song.notes} notes, ${r.song.durationSec.toFixed(2)} s rendered (${r.song.expectedSec.toFixed(2)} s + tail), peak ${(20 * Math.log10(r.song.peak)).toFixed(1)} dBFS, RMS ${(20 * Math.log10(r.song.rms)).toFixed(1)} dBFS`);
if (r.song.peak >= 1) problems.push(`imported score clips (peak ${r.song.peak})`);
if (r.song.rms < 0.005) problems.push("imported score is (almost) silent");
if (!(r.song.durationSec >= r.song.expectedSec)) problems.push("imported score render is shorter than its timeline");
if (r.peak >= 1) problems.push(`mix clips (peak ${r.peak})`);
if (r.rms < 0.005) problems.push("mix is (almost) silent");
if (!(jitter <= 1)) problems.push(`drum timing jitter ${jitter.toFixed(2)} ms`);
if (!(offset >= 0 && offset <= 10)) problems.push(`unexpected output latency ${offset.toFixed(2)} ms`);

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log("✓ audio check passed");
