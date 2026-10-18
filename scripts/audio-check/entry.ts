/**
 * Browser entry for `npm run check:audio`: renders real audio with the app's
 * engine (OfflineAudioContext) and measures it. Bundled by scripts/audio-check.mjs.
 */
import { renderOffline } from "@/lib/audio/engine";
import { INSTRUMENT_IDS } from "@/lib/audio/voices";
import { compose, getIqa } from "@/lib/music/composer/generate";
import { scaleTimeline, toTimeline } from "@/lib/music/composer/timeline";
import { parseMusicXml } from "@/lib/music/score/musicxml";
import { scoreTimeline } from "@/lib/music/score/playback";

/** Fundamental frequency by normalised autocorrelation with parabolic interpolation. */
function detectPitch(x: Float32Array, sampleRate: number, minHz = 70, maxHz = 1200): number {
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / minHz);
  const n = x.length - maxLag;
  const corr = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < n; i++) {
      s += x[i] * x[i + lag];
      e1 += x[i] * x[i];
      e2 += x[i + lag] * x[i + lag];
    }
    corr[lag] = s / Math.sqrt(e1 * e2 || 1);
  }
  // First strong peak (avoids octave errors from later, equally high peaks).
  const best = Math.max(...corr.slice(minLag, maxLag + 1));
  let lag = minLag;
  for (let l = minLag + 1; l < maxLag; l++) {
    if (corr[l] > corr[l - 1] && corr[l] >= corr[l + 1] && corr[l] > best * 0.9) {
      lag = l;
      break;
    }
  }
  const [a, b, c] = [corr[lag - 1], corr[lag], corr[lag + 1]];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return sampleRate / (lag + shift);
}

function levels(buf: AudioBuffer) {
  let peak = 0;
  let sumSq = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      sumSq += d[i] * d[i];
    }
  }
  return { peak, rms: Math.sqrt(sumSq / (buf.length * buf.numberOfChannels)) };
}

async function run(fixtureXml: string) {
  const sr = 48000;

  // 1. Scale pitches (melody only).
  const scale = scaleTimeline("bayati-mashriqi", "theoretical", 60);
  const scaleBuf = await renderOffline(scale, { sampleRate: sr, tail: 0.5 });
  const ch = scaleBuf.getChannelData(0);
  const notes = scale.melody.map((n) => {
    const start = Math.floor((n.time + 0.15) * sr);
    const seg = ch.slice(start, start + Math.floor(0.12 * sr));
    const measured = detectPitch(seg, sr);
    return { expectedHz: n.frequency, measuredHz: measured, errorCents: 1200 * Math.log2(measured / n.frequency) };
  });

  // 2. Full composition: level and percussion timing.
  const comp = compose({ maqamId: "bayati-mashriqi", iqaId: "maqsum", seed: 7, cycles: 4, quarterBpm: 120 });
  const t = toTimeline(comp);
  const buf = await renderOffline(t, { sampleRate: sr });
  let peak = 0;
  let sumSq = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      sumSq += d[i] * d[i];
    }
  }
  const rms = Math.sqrt(sumSq / (buf.length * buf.numberOfChannels));

  // Percussion-only render: onsets should match the scheduled dum/tak times.
  const percOnly = await renderOffline({ ...t, melody: [], drone: [] }, { sampleRate: sr, tail: 0.5 });
  const p = percOnly.getChannelData(0);
  const onsetErrorsMs = t.percussion.map((h) => {
    const from = Math.floor((h.time - 0.01) * sr);
    const to = Math.floor((h.time + 0.03) * sr);
    let first = -1;
    for (let i = Math.max(0, from); i < to; i++) if (Math.abs(p[i]) > 0.02) { first = i; break; }
    return first < 0 ? Infinity : ((first / sr) - h.time) * 1000;
  });

  // 3. Every melody instrument: scale pitches (measured before any vibrato) and level of a full piece.
  const instruments: { id: string; maxErrorCents: number; peak: number }[] = [];
  for (const id of INSTRUMENT_IDS) {
    const b = await renderOffline(scale, { sampleRate: sr, tail: 0.5, instrument: id });
    const d = b.getChannelData(0);
    let maxErrorCents = 0;
    for (const n of scale.melody) {
      const start = Math.floor((n.time + 0.15) * sr);
      const f = detectPitch(d.slice(start, start + Math.floor(0.12 * sr)), sr);
      maxErrorCents = Math.max(maxErrorCents, Math.abs(1200 * Math.log2(f / n.frequency)));
    }
    instruments.push({ id, maxErrorCents, peak: levels(await renderOffline(t, { sampleRate: sr, instrument: id })).peak });
  }

  // 4. An imported score (MusicXML test fixture) with drone and iqaʿ, on the nay voice.
  const score = parseMusicXml(new DOMParser().parseFromString(fixtureXml, "application/xml"));
  const st = scoreTimeline(score, { drone: true, iqa: getIqa("malfuf") });
  const songBuf = await renderOffline(st, { sampleRate: sr, instrument: "nay" });
  const song = { ...levels(songBuf), durationSec: songBuf.duration, expectedSec: st.duration, notes: st.melody.length };

  return { notes, peak, rms, onsetErrorsMs, durationSec: buf.duration, instruments, song };
}

(window as unknown as { __audioCheck: (xml: string) => Promise<unknown> }).__audioCheck = run;
