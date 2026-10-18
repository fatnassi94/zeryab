#!/usr/bin/env node
/**
 * Songs transcribed in Claude Code (no API key): the transcription is written
 * as JSON in the schema of src/lib/music/score/ai-transcription.ts, then
 *
 *   npm run score:convert -- score-inbox/song.json [more.json …]
 *
 * writes song.musicxml next to each file (add it in the lab, then save it to
 * the club library) and lists bars whose notes don't add up.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: npm run score:convert -- <transcription.json> [...]");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const outDir = await mkdtemp(join(tmpdir(), "zeryab-score-"));
await build({
  root,
  logLevel: "warn",
  configFile: false,
  resolve: { alias: { "@": join(root, "src") } },
  build: { outDir, emptyOutDir: true, lib: { entry: join(root, "scripts/score-convert/entry.ts"), formats: ["es"], fileName: () => "convert.mjs" } },
});
const { convert } = await import(pathToFileURL(join(outDir, "convert.mjs")).href);

let failed = false;
for (const file of files) {
  try {
    const r = convert(await readFile(file, "utf8"));
    const out = file.replace(/\.json$/i, "") + ".musicxml";
    await writeFile(out, r.musicxml);
    console.log(`✓ ${out}  —  ${r.title ?? "(untitled)"}: ${r.bars} bars, ${r.notes} notes`);
    for (const u of r.uneven) console.log(`  ! bar ${u.bar}: ${u.written} of ${u.expected} beats`);
    for (const w of r.warnings) console.log(`  · ${w}`);
  } catch (e) {
    failed = true;
    console.error(`✗ ${file}: ${e instanceof Error ? e.message : e}`);
  }
}
process.exit(failed ? 1 : 0);
