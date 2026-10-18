"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { DEFAULT_MIX, Player, previewNote, type Mix } from "@/lib/audio/engine";
import { INSTRUMENT_IDS, type InstrumentId } from "@/lib/audio/voices";
import { removeNote, setTempo, shiftDegree } from "@/lib/music/composer/edit";
import { compose, getIqa } from "@/lib/music/composer/generate";
import { scaleTimeline, toTimeline, TUNINGS, type TimedNote } from "@/lib/music/composer/timeline";
import type { Composition } from "@/lib/music/composer/types";
import type { ClubSong } from "@/lib/data/scores";
import { MAQAMAT } from "@/lib/music/maqam/data/maqamat";
import { getMaqam, resolvePitch } from "@/lib/music/maqam/engine";
import { arabicToneName, spelledName } from "@/lib/music/notes";
import { IQAAT } from "@/lib/music/rhythm/data/iqaat";
import { compositionToScore } from "@/lib/music/score/from-composition";
import type { NameOptions } from "@/lib/music/score/layout";
import { ScoreImportError } from "@/lib/music/score/import";
import { estimateCostUsd, unevenBars } from "@/lib/music/score/ai-transcription";
import { MUSICXML_MIME, scoreToMusicXml } from "@/lib/music/score/musicxml-write";
import { scoreTimeline } from "@/lib/music/score/playback";
import type { Score, ScorePitch } from "@/lib/music/score/types";
import type { Locale } from "@/lib/music/types";
import { archiveClubSong, loadClubSong, saveClubSong } from "./actions";
import { ClubPanel } from "./club-panel";
import { PianoRoll } from "./piano-roll";
import { ScoreView } from "./score-view";
import { meterOf, readScoreFile, SongPanel, type LoadedSong } from "./song-panel";
import { saveSong, type StoredSong } from "./song-store";
import { TranscribePanel, type TranscriptionResult } from "./transcribe-panel";

type Labels = Dictionary["studio"];
type Mode = "generate" | "song";
type Playable = Parameters<Player["play"]>[0];

const TUNING_IDS = ["theoretical", "24-edo", "53-edo"] as const;

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

const pitchLabel = (p: ScorePitch, locale: Locale) => {
  const name = spelledName(p.step, p.alter, locale);
  const arabic = arabicToneName(p.step, p.alter, p.octave);
  return arabic ? `${name} (${arabic})` : name;
};

/** Sounding notes of a score in reading order (one id per tie chain), for keyboard navigation. */
function noteOrder(score: Score): string[] {
  const seen = new Set<string>();
  for (const m of score.measures) for (const n of m.notes) if (n.pitch) seen.add(n.sourceId);
  return [...seen];
}

function findNote(score: Score, sourceId: string) {
  for (const m of score.measures) for (const n of m.notes) if (n.sourceId === sourceId && n.pitch) return { note: n, bar: m.number };
  return null;
}

/** What the server tells the lab about the club library and the viewer's rights. */
export type ClubProps = { songs: ClubSong[]; canManage: boolean; canTranscribe: boolean; transcriptionReady: boolean };

/** A MusicXML text as a stored song record (for transcriptions and club songs). */
async function musicXmlSong(musicxml: string, title: string, id: string = crypto.randomUUID()) {
  const bytes = new TextEncoder().encode(musicxml).buffer as ArrayBuffer;
  const imported = await readScoreFile(bytes);
  const record: StoredSong = {
    id, title, fileName: `${title}.musicxml`, format: "musicxml", bars: imported.score.measures.length, meter: meterOf(imported.score), addedAt: Date.now(), bytes,
  };
  return { record, imported };
}

const fileSafe = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "score";

export function Studio({ locale, labels, club }: { locale: Locale; labels: Labels; club: ClubProps }) {
  const [mode, setMode] = useState<Mode>("generate");
  const [instrument, setInstrument] = useState<InstrumentId>("oud");
  const [view, setView] = useState<"score" | "roll">("score");
  const [names, setNames] = useState<NameOptions>({ solfege: true, arabic: locale === "ar", lyrics: true });
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [audioError, setAudioError] = useState(false);

  // Generated melody
  const [maqamId, setMaqamId] = useState("bayati-mashriqi");
  const [iqaId, setIqaId] = useState("maqsum");
  const [cycles, setCycles] = useState(8);
  const [seed, setSeed] = useState(1);
  const [comp, setComp] = useState<Composition>(() => compose({ maqamId: "bayati-mashriqi", iqaId: "maqsum", seed: 1, cycles: 8 }));
  const [selected, setSelected] = useState<string | null>(null);

  // Song from a score file
  const [song, setSong] = useState<LoadedSong | null>(null);
  const [songTempo, setSongTempo] = useState(90);
  const [songIqa, setSongIqa] = useState("none");
  const [songDrone, setSongDrone] = useState(true);
  const [songTuning, setSongTuning] = useState<string>("theoretical");
  const [songSelected, setSongSelected] = useState<string | null>(null);
  const [songError, setSongError] = useState<string | null>(null);

  // Club library
  const [clubSongs, setClubSongs] = useState(club.songs);
  const [clubBusy, setClubBusy] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);
  const [deviceRefresh, setDeviceRefresh] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveVisibility, setSaveVisibility] = useState<"members" | "public">("members");
  const [saveRights, setSaveRights] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const playerRef = useRef<Player | null>(null);
  const player = () => (playerRef.current ??= new Player());
  const playing = useSyncExternalStore(
    (fn) => player().subscribe(fn),
    () => playerRef.current?.state === "playing",
    () => false,
  );

  const variant = getMaqam(comp.maqamId);
  const iqa = getIqa(comp.iqaId);
  const timeline = useMemo(() => toTimeline(comp), [comp]);
  const compScore = useMemo(() => compositionToScore(comp), [comp]);

  const songScore = song?.imported.score ?? null;
  const songMeter = songScore ? meterOf(songScore) : "4/4";
  const songIqaat = useMemo(() => IQAAT.filter((i) => i.meter === songMeter), [songMeter]);
  const songTimeline = useMemo(
    () =>
      songScore
        ? scoreTimeline(songScore, { quarterBpm: songTempo, tuning: TUNINGS[songTuning], drone: songDrone, iqa: songIqa === "none" ? undefined : getIqa(songIqa) })
        : null,
    [songScore, songTempo, songTuning, songDrone, songIqa],
  );
  const finalNote = useMemo(() => {
    const bars = songScore?.measures ?? [];
    for (let i = bars.length - 1; i >= 0; i--) for (let j = bars[i].notes.length - 1; j >= 0; j--) if (bars[i].notes[j].pitch) return bars[i].notes[j].pitch!;
    return null;
  }, [songScore]);
  const hasLyrics = useMemo(() => !!songScore?.measures.some((m) => m.notes.some((n) => n.lyric)), [songScore]);
  const uneven = useMemo(() => (song?.ai && songScore ? unevenBars(songScore) : []), [song?.ai, songScore]);

  const score = mode === "song" ? songScore : compScore;
  const order = useMemo(() => (score ? noteOrder(score) : []), [score]);
  const selectedId = mode === "song" ? songSelected : selected;
  const setSelectedId = mode === "song" ? setSongSelected : setSelected;

  // What is sounding now, read by the score highlight every frame.
  const soundingRef = useRef<TimedNote[]>([]);
  const getActiveId = useCallback(() => {
    const p = playerRef.current;
    if (!p || p.state !== "playing") return null;
    const t = p.position;
    const list = soundingRef.current;
    let lo = 0;
    let hi = list.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].time <= t) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const e = found >= 0 ? list[found] : undefined;
    return e && t < e.time + e.duration ? (e.noteId ?? null) : null;
  }, []);
  const getPosition = useCallback(() => playerRef.current?.position ?? 0, []);

  useEffect(() => () => playerRef.current?.stop(), []);

  const stop = () => player().stop();
  const play = async (t: Playable) => {
    setAudioError(false);
    if (playing) {
      stop();
      return;
    }
    try {
      soundingRef.current = t.melody;
      await player().play(t, mix, instrument);
    } catch {
      setAudioError(true);
    }
  };

  const audition = (frequency: number | undefined) => {
    if (playing || !frequency) return;
    previewNote(frequency, instrument).catch(() => setAudioError(true));
  };
  const frequencyOf = (sourceId: string, list = mode === "song" ? songTimeline?.melody : timeline.melody) => list?.find((n) => n.noteId === sourceId)?.frequency;

  // Regenerate when the musical frame changes; keep tempo/tuning/toggles.
  const regenerate = (next: { maqamId?: string; iqaId?: string; cycles?: number; seed?: number }) => {
    stop();
    const c = compose({
      maqamId: next.maqamId ?? maqamId,
      iqaId: next.iqaId ?? iqaId,
      cycles: next.cycles ?? cycles,
      seed: next.seed ?? seed,
      tuningId: comp.tuningId,
      percussion: comp.percussion,
      drone: comp.drone,
    });
    // Keep the user's tempo unless the iqaʿ changed (then use its default).
    setComp(next.iqaId ? c : setTempo(c, comp.quarterBpm));
    setSelected(null);
  };

  const update = (c: Composition) => {
    stop();
    setComp(c);
  };

  const editDegree = (id: string, by: number) => {
    const c = shiftDegree(comp, id, by);
    update(c);
    audition(frequencyOf(id, toTimeline(c).melody));
  };

  const deleteNote = (id: string) => {
    const i = comp.notes.findIndex((n) => n.id === id);
    update(removeNote(comp, id));
    return comp.notes[Math.max(0, i - 1)]?.id ?? null;
  };

  const focusScoreNote = (id: string) =>
    requestAnimationFrame(() => document.querySelector<SVGGElement>(`[data-src="${CSS.escape(id)}"][tabindex="0"]`)?.focus());

  const onScoreSelect = (id: string) => {
    const next = id === selectedId ? null : id;
    setSelectedId(next);
    if (next) audition(frequencyOf(next));
  };

  const onScoreKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
    const i = order.indexOf(id);
    const go = (k: number) => {
      const next = order[k];
      if (!next) return;
      setSelectedId(next);
      audition(frequencyOf(next));
      focusScoreNote(next);
    };
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "Enter" || e.key === " ") onScoreSelect(id);
    else if (e.key === "Escape") setSelectedId(null);
    else if (mode === "generate" && e.key === "ArrowUp") editDegree(id, 1);
    else if (mode === "generate" && e.key === "ArrowDown") editDegree(id, -1);
    else if (mode === "generate" && (e.key === "Delete" || e.key === "Backspace")) {
      const prev = deleteNote(id);
      setSelected(prev);
      if (prev) focusScoreNote(prev);
    } else return;
    e.preventDefault();
  };

  const onRollKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = comp.notes.findIndex((n) => n.id === id);
    const focus = (i: number) => {
      const n = comp.notes[i];
      if (!n) return;
      setSelected(n.id);
      requestAnimationFrame(() => document.getElementById(`note-${n.id}`)?.focus());
    };
    if (e.key === "ArrowUp") editDegree(id, 1);
    else if (e.key === "ArrowDown") editDegree(id, -1);
    else if (e.key === "ArrowRight") focus(index + 1);
    else if (e.key === "ArrowLeft") focus(index - 1);
    else if (e.key === "Delete" || e.key === "Backspace") {
      deleteNote(id);
      focus(Math.max(0, index - 1));
    } else return;
    e.preventDefault();
  };

  const downloadMidi = async () => {
    const { toMidiFile } = await import("@/lib/music/composer/midi");
    const blob = new Blob([toMidiFile(comp) as BlobPart], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zeryab-${comp.maqamId}-${comp.iqaId}-${comp.seed}.mid`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const loadSong = (s: LoadedSong) => {
    stop();
    setSongError(null);
    setSong(s);
    setSaveOpen(false);
    setSaveState("idle");
    setSaveTitle(s.record.title);
    setSaveRights("");
    setSaveVisibility("members");
    setSongSelected(null);
    setSongTempo(Math.round(Math.min(200, Math.max(40, s.imported.score.tempo))));
    const meter = meterOf(s.imported.score);
    setSongIqa(IQAAT.find((i) => i.meter === meter)?.id ?? "none");
  };

  const changePart = async (part: number) => {
    if (!song) return;
    stop();
    try {
      setSong({ ...song, imported: await readScoreFile(song.record.bytes, part) });
      setSongSelected(null);
      setSongError(null);
    } catch (e) {
      // e.g. a percussion-only part: keep the current one and say why.
      setSongError(e instanceof ScoreImportError ? labels.importErrors[e.code] : labels.importErrors.read);
    }
  };

  const openClubSong = async (s: ClubSong) => {
    setClubError(null);
    setClubBusy(true);
    try {
      const res = await loadClubSong(s.id);
      if (!res.ok) throw new Error("not found");
      const { record, imported } = await musicXmlSong(res.musicxml, s.title, `club:${s.id}`);
      loadSong({ record, imported, saved: true, clubId: s.id });
    } catch {
      setClubError(labels.loadFailed);
    } finally {
      setClubBusy(false);
    }
  };

  const archiveClub = async (s: ClubSong) => {
    setClubError(null);
    const res = await archiveClubSong(s.id);
    if (res.ok) setClubSongs((list) => list.filter((x) => x.id !== s.id));
    else setClubError(labels.saveFailed);
  };

  // A transcription is kept on this device right away (it cost an API call), then opened.
  const onTranscribed = async (r: TranscriptionResult) => {
    try {
      const { record, imported } = await musicXmlSong(r.musicxml, r.title || r.fileName.replace(/\.[^.]+$/, ""));
      let saved = true;
      try {
        await saveSong(record);
        setDeviceRefresh((k) => k + 1);
      } catch {
        saved = false;
      }
      loadSong({ record, imported, saved, ai: { model: r.model, warnings: r.warnings, usage: r.usage } });
    } catch {
      setClubError(labels.importErrors.read);
    }
  };

  const saveToClub = async () => {
    if (!song || !songScore) return;
    setSaveState("saving");
    const res = await saveClubSong({
      title: saveTitle.trim() || song.record.title,
      composer: songScore.composer,
      musicxml: scoreToMusicXml({ ...songScore, title: saveTitle.trim() || song.record.title }),
      visibility: saveVisibility,
      rights: saveRights,
      aiModel: song.ai?.model || undefined,
    });
    if (res.ok) {
      setClubSongs((list) => [res.song, ...list]);
      setSong({ ...song, clubId: res.song.id });
      setSaveOpen(false);
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
  };

  const downloadSongXml = () => {
    if (!song || !songScore) return;
    const url = URL.createObjectURL(new Blob([scoreToMusicXml(songScore)], { type: MUSICXML_MIME }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSafe(song.record.title)}.musicxml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    stop();
    setMode(m);
  };

  const showScore = mode === "song" ? !!songScore : view === "score";
  const instrumentSelect = (
    <Select id={`st-instrument-${mode}`} label={labels.instrument} value={instrument} onChange={(v) => { stop(); setInstrument(v as InstrumentId); }}
      options={INSTRUMENT_IDS.map((id) => [id, labels.instruments[id]])} />
  );

  // Selected note details.
  const selInfo = selectedId && score ? findNote(score, selectedId) : null;
  const selFrequency = selectedId ? frequencyOf(selectedId) : undefined;
  const compSel = mode === "generate" ? comp.notes.find((n) => n.id === selected) ?? null : null;
  const compSelIndex = compSel ? comp.notes.indexOf(compSel) : -1;

  return (
    <div className="flex flex-col gap-6">
      {/* Source: generated melody or a song's score file */}
      <div role="tablist" aria-label={labels.modeLabel} className="grid grid-cols-2 gap-1 rounded-[28px] border border-line bg-panel p-1.5 sm:inline-flex sm:self-start">
        {(["generate", "song"] as const).map((m) => (
          <button
            key={m}
            id={`st-tab-${m}`}
            type="button"
            role="tab"
            aria-selected={mode === m}
            aria-controls={`st-panel-${m}`}
            tabIndex={mode === m ? 0 : -1}
            onClick={() => switchMode(m)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const other = m === "generate" ? "song" : "generate";
              switchMode(other);
              requestAnimationFrame(() => document.getElementById(`st-tab-${other}`)?.focus());
            }}
            className={`min-h-11 cursor-pointer rounded-[22px] border-0 px-4 py-2 font-[inherit] text-[15px] leading-snug transition-colors sm:px-5 ${mode === m ? "bg-gold font-semibold text-gold-ink" : "bg-transparent text-soft hover:text-text"}`}
          >
            {m === "generate" ? labels.modeGenerate : labels.modeSong}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Notice tone="info">{labels.synthNotice}</Notice>
        {mode === "generate" && <p className="m-0 text-[13px] text-muted">{labels.draftNotice}</p>}
      </div>

      {mode === "generate" ? (
        <div id="st-panel-generate" role="tabpanel" aria-labelledby="st-tab-generate" className="flex flex-col gap-6">
          <div className="card grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4 p-5 sm:p-6">
            <Select id="st-maqam" label={labels.maqam} value={maqamId} onChange={(v) => { setMaqamId(v); regenerate({ maqamId: v }); }}
              options={MAQAMAT.map((m) => [m.id, `${m.names[locale]}${locale === "ar" ? "" : ` (${m.names.ar})`}`])} />
            <Select id="st-iqa" label={labels.iqa} value={iqaId} onChange={(v) => { setIqaId(v); regenerate({ iqaId: v }); }}
              options={IQAAT.map((i) => [i.id, `${i.names[locale]} · ${i.meter}`])} />
            <Select id="st-tuning" label={labels.tuning} value={comp.tuningId} onChange={(v) => update({ ...comp, tuningId: v })}
              options={TUNING_IDS.map((t) => [t, labels.tunings[t]])} />
            {instrumentSelect}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-tempo" className="label">{labels.tempo}: <bdi>{comp.quarterBpm}</bdi></label>
              <input id="st-tempo" type="range" min={40} max={200} value={comp.quarterBpm}
                onChange={(e) => update(setTempo(comp, Number(e.target.value)))} className="accent-gold min-h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-cycles" className="label">{labels.cycles}: <bdi>{cycles}</bdi></label>
              <input id="st-cycles" type="range" min={4} max={16} value={cycles}
                onChange={(e) => { const v = Number(e.target.value); setCycles(v); regenerate({ cycles: v }); }} className="accent-gold min-h-11" />
            </div>
            <fieldset className="m-0 flex flex-wrap items-end gap-4 border-0 p-0">
              <Toggle label={labels.drone} checked={comp.drone} onChange={(v) => update({ ...comp, drone: v })} />
              <Toggle label={labels.percussion} checked={comp.percussion} onChange={(v) => update({ ...comp, percussion: v })} />
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-gold min-w-36" onClick={() => play(timeline)} aria-pressed={playing}>
              {playing ? labels.stop : labels.play}
            </button>
            <button type="button" className="btn-ghost" onClick={() => play(scaleTimeline(comp.maqamId, comp.tuningId))} disabled={playing}>{labels.playScale}</button>
            <button type="button" className="btn-ghost" onClick={() => { const s = Math.floor(Math.random() * 999_999) + 1; setSeed(s); regenerate({ seed: s }); }}>
              {labels.generate}
            </button>
            <button type="button" className="btn-ghost" onClick={downloadMidi} aria-describedby="midi-hint">{labels.downloadMidi}</button>
            <span className="text-[13px] text-muted">{labels.seed}: <bdi>{comp.seed}</bdi></span>
          </div>
          <p id="midi-hint" className="-mt-3 m-0 text-[13px] text-muted">{labels.midiHint}</p>
        </div>
      ) : (
        <div id="st-panel-song" role="tabpanel" aria-labelledby="st-tab-song" className="flex flex-col gap-6">
          {(clubSongs.length > 0 || club.canManage) && (
            <ClubPanel labels={labels} songs={clubSongs} canManage={club.canManage} currentId={song?.clubId ?? null} busy={clubBusy}
              onOpen={openClubSong} onArchive={archiveClub} />
          )}
          {clubError && <Notice tone="error">{clubError}</Notice>}
          <SongPanel labels={labels} currentId={song?.record.id ?? null} onLoad={loadSong} onRemoveCurrent={() => { stop(); setSong(null); }}
            refreshKey={deviceRefresh} />
          {club.canTranscribe && <TranscribePanel labels={labels} locale={locale} ready={club.transcriptionReady} onDone={onTranscribed} />}
          {song && songScore && (
            <>
              {song.ai && (
                <div role="status" className="rounded-2xl border border-teal/30 bg-teal/10 px-[18px] py-3.5 text-[15px] leading-[1.8] text-teal-light">
                  <p className="m-0">{fill(labels.aiCheck, { model: song.ai.model })}</p>
                  {song.ai.usage.output > 0 && (
                    <p className="m-0 text-[13px] opacity-80">
                      {fill(labels.aiCost, { input: song.ai.usage.input, output: song.ai.usage.output, cost: estimateCostUsd(song.ai.usage).toFixed(2) })}
                    </p>
                  )}
                  {(song.ai.warnings.length > 0 || uneven.length > 0) && (
                    <>
                      <p className="m-0 mt-2 font-semibold">{labels.aiNotes}</p>
                      <ul className="m-0 mt-1 ps-5">
                        {uneven.map((u) => <li key={`bar-${u.bar}`}>{fill(labels.aiUneven, u)}</li>)}
                        {song.ai.warnings.map((w, i) => <li key={i} dir="auto">{w}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
              <div className="card grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4 p-5 sm:p-6">
                {song.imported.parts.length > 1 && (
                  <Select id="st-part" label={labels.part} value={String(song.imported.part)} onChange={(v) => changePart(Number(v))}
                    options={song.imported.parts.map((p) => [String(p.value), p.name])} />
                )}
                <Select id="st-song-iqa" label={labels.songRhythm} value={songIqa} onChange={(v) => { stop(); setSongIqa(v); }}
                  options={[["none", songIqaat.length ? labels.noRhythm : fill(labels.noMatchingRhythm, { meter: songMeter })], ...songIqaat.map((i) => [i.id, `${i.names[locale]} · ${i.meter}`] as const)]} />
                <Select id="st-song-tuning" label={labels.tuningSong} value={songTuning} onChange={(v) => { stop(); setSongTuning(v); }}
                  options={TUNING_IDS.map((t) => [t, labels.tunings[t]])} />
                {instrumentSelect}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="st-song-tempo" className="label">{labels.tempo}: <bdi>{songTempo}</bdi></label>
                  <input id="st-song-tempo" type="range" min={40} max={200} value={songTempo}
                    onChange={(e) => { stop(); setSongTempo(Number(e.target.value)); }} className="accent-gold min-h-11" />
                </div>
                <div className="flex items-end">
                  <Toggle label={fill(labels.droneOnFinal, { name: finalNote ? spelledName(finalNote.step, finalNote.alter, locale) : "—" })}
                    checked={songDrone} onChange={(v) => { stop(); setSongDrone(v); }} />
                </div>
              </div>
              {songError && <Notice tone="error">{songError}</Notice>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-gold min-w-36" onClick={() => songTimeline && play(songTimeline)} aria-pressed={playing}>
                  {playing ? labels.stop : labels.play}
                </button>
                <button type="button" className="btn-ghost" onClick={downloadSongXml}>{labels.downloadXml}</button>
                {club.canManage && !song.clubId && !saveOpen && (
                  <button type="button" className="btn-ghost" onClick={() => { setSaveOpen(true); setSaveState("idle"); }}>{labels.saveToClub}</button>
                )}
                {!song.saved && <span className="text-[13px] text-muted">{labels.notSaved}</span>}
              </div>
              {club.canManage && !song.clubId && saveOpen && (
                <form className="card grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-end gap-4 p-5 sm:p-6"
                  onSubmit={(e) => { e.preventDefault(); void saveToClub(); }}>
                  <TextField id="st-save-title" label={labels.saveTitle} value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} required maxLength={200} dir="auto" />
                  <Select id="st-save-visibility" label={labels.saveVisibility} value={saveVisibility} onChange={(v) => setSaveVisibility(v === "public" ? "public" : "members")}
                    options={[["members", labels.visibilityMembers], ["public", labels.visibilityPublic]]} />
                  <TextField id="st-save-rights" label={labels.saveRights} value={saveRights} onChange={(e) => setSaveRights(e.target.value)} maxLength={500} dir="auto" />
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="btn-ghost" disabled={saveState === "saving"}>{labels.saveButton}</button>
                    {saveState === "error" && <span className="text-sm text-rose" role="alert">{labels.saveFailed}</span>}
                  </div>
                </form>
              )}
              {saveState === "saved" && <Notice tone="success">{labels.saved}</Notice>}
            </>
          )}
        </div>
      )}

      {audioError && <Notice tone="error">{labels.audioError}</Notice>}

      {score && (
        <>
          {/* Mixer (live) */}
          <div className="flex flex-wrap gap-5 text-sm">
            {(["melody", "drone", "percussion"] as const).map((track) => (
              <label key={track} className="flex items-center gap-2 text-soft">
                <span className="min-w-20">{track === "melody" ? labels.melodyTrack : track === "drone" ? labels.drone : labels.percussion}</span>
                <input type="range" min={0} max={1} step={0.05} value={mix[track]} className="accent-gold"
                  onChange={(e) => { const m = { ...mix, [track]: Number(e.target.value) }; setMix(m); playerRef.current?.setMix(m); }} />
              </label>
            ))}
          </div>

          <section aria-labelledby="st-output-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="st-output-h" className="m-0 font-display text-2xl font-semibold">
                  <bdi>{mode === "song" && song ? song.record.title : labels.outputTitle}</bdi>
                </h2>
                {mode === "song" && songScore && (
                  <p className="m-0 text-[13px] text-muted">{fill(labels.songInfo, { bars: songScore.measures.length, meter: songMeter, notes: order.length })}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {mode === "generate" && (
                  <div role="group" aria-label={labels.view} className="flex rounded-full border border-line p-1">
                    {(["score", "roll"] as const).map((v) => (
                      <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                        className={`min-h-10 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-sm ${view === v ? "bg-gold/90 font-semibold text-gold-ink" : "bg-transparent text-soft hover:text-text"}`}>
                        {v === "score" ? labels.viewScore : labels.viewRoll}
                      </button>
                    ))}
                  </div>
                )}
                {showScore && (
                  <div role="group" aria-labelledby="st-names-label" className="flex flex-wrap items-center gap-x-4">
                    <span id="st-names-label" className="text-[13px] text-muted">{labels.namesLabel}</span>
                    <Toggle label={labels.nameSolfege} checked={names.solfege} onChange={(v) => setNames({ ...names, solfege: v })} />
                    <Toggle label={labels.nameArabic} checked={names.arabic} onChange={(v) => setNames({ ...names, arabic: v })} />
                    {mode === "song" && hasLyrics && <Toggle label={labels.nameLyrics} checked={names.lyrics} onChange={(v) => setNames({ ...names, lyrics: v })} />}
                  </div>
                )}
              </div>
            </div>

            {showScore ? (
              <div className="rounded-[24px] bg-ivory px-2 py-4 sm:px-5 sm:py-6">
                <ScoreView
                  score={score}
                  locale={locale}
                  names={names}
                  label={fill(labels.scoreLabel, { n: order.length })}
                  restLabel={labels.rest}
                  selectedId={selectedId}
                  onSelect={onScoreSelect}
                  onNoteKeyDown={onScoreKey}
                  playing={playing}
                  getActiveId={getActiveId}
                />
              </div>
            ) : (
              <PianoRoll comp={comp} variant={variant} iqa={iqa} locale={locale} label={fill(labels.rollLabel, { n: comp.notes.length })}
                phraseLabels={labels.phrases} selected={selected} onNoteKey={onRollKey}
                onSelect={(id) => { setSelected(id); if (id) audition(frequencyOf(id)); }}
                playing={playing} getPosition={getPosition} pulseSeconds={timeline.pulseSeconds} />
            )}

            {mode === "song" && <p className="m-0 text-[13px] leading-[1.8] text-muted">{labels.songLimits}</p>}

            {/* Selected note */}
            <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
              {selInfo ? (
                <>
                  <span className="text-muted">{labels.selected}:</span>
                  <span className="font-display text-lg"><bdi>{pitchLabel(selInfo.note.pitch!, locale)}</bdi></span>
                  <span dir="ltr" className="text-muted">
                    {compSel && compSelIndex >= 0
                      ? `${Math.round(timeline.melody[compSelIndex].pitch.cents - resolvePitch(variant, 0).cents)}¢ · `
                      : ""}
                    {selFrequency ? `${selFrequency.toFixed(2)} Hz` : ""}
                  </span>
                  {mode === "song" && <span className="text-muted">{fill(labels.bar, { bar: selInfo.bar })}</span>}
                  {compSel && (
                    <>
                      <button type="button" className="btn-ghost min-h-11! px-4!" onClick={() => editDegree(compSel.id, 1)}>{labels.up}</button>
                      <button type="button" className="btn-ghost min-h-11! px-4!" onClick={() => editDegree(compSel.id, -1)}>{labels.down}</button>
                      <button type="button" className="btn-ghost min-h-11! px-4!" onClick={() => { deleteNote(compSel.id); setSelected(null); }}>{labels.remove}</button>
                    </>
                  )}
                </>
              ) : (
                <span className="text-muted">{mode === "song" ? labels.songKeyboardHint : labels.keyboardHint}</span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Select({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: (readonly [string, string])[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-soft">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-gold" />
      {label}
    </label>
  );
}
