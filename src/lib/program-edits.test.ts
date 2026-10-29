import { describe, expect, it } from "vitest";
import { applyEdit, applyEdits, valueAt } from "./program-edits";
import { getProgram } from "./programs";

const first = getProgram("al-aqd-al-khalis")!;
const majlis = getProgram("al-tahrirayn")!;

describe("program edits", () => {
  it("changes one text and leaves the original untouched", () => {
    const r = applyEdit(first, "title.ar", "  العقد   الصافي ");
    expect(r.ok && r.program.title.ar).toBe("العقد الصافي");
    expect(first.title.ar).toBe("العقد الخالص");
  });

  it("reaches songs inside tableaux, also with repeated indices", () => {
    const r = applyEdit(first, "tableaux.0.songs.0.title", "قطار الليل");
    expect(r.ok && r.program.tableaux[0].songs[0].title).toBe("قطار الليل");
    expect(applyEdit(first, "tableaux.0.songs.5.title", "x")).toEqual({ ok: false, error: "path" });
  });

  it("refuses structure, unknown paths and bad values", () => {
    expect(applyEdit(first, "slug", "x")).toMatchObject({ error: "path" });
    expect(applyEdit(first, "pages.0.n", 3)).toMatchObject({ error: "path" });
    expect(applyEdit(first, "__proto__.x", "x")).toMatchObject({ error: "path" });
    expect(applyEdit(first, "title.ar", "   ")).toMatchObject({ error: "empty" });
    expect(applyEdit(first, "tableaux.0.color", "red")).toMatchObject({ error: "value" });
    expect(applyEdit(first, "tableaux.0.page", 99)).toMatchObject({ error: "value" });
    expect(applyEdit(first, "tableaux.0.icon", "rocket")).toMatchObject({ error: "value" });
    expect(applyEdit(first, "scene.moments.0.note.ar", "x")).toMatchObject({ error: "path" }); // a map has no moments
  });

  it("creates optional blocks and removes an emptied rhythm", () => {
    const mood = applyEdit(first, "tableaux.0.mood.fr", "Départ à l’aube.");
    expect(mood.ok && mood.program.tableaux[0].mood).toEqual({ ar: "", fr: "Départ à l’aube.", en: "" });
    const rhythm = applyEdit(majlis, "tableaux.0.songs.0.rhythm", "");
    expect(rhythm.ok && "rhythm" in rhythm.program.tableaux[0].songs[0]).toBe(false);
  });

  it("gives a program its own section headings", () => {
    const r = applyEdit(first, "labels.sceneTitle.ar", "رحلة القطار");
    expect(r.ok && r.program.labels).toEqual({ sceneTitle: { ar: "رحلة القطار", fr: "", en: "" } });
    expect(applyEdit(first, "labels.follow.ar", "x")).toMatchObject({ error: "path" });
  });

  it("keeps voices in their usual order", () => {
    const r = applyEdit(majlis, "tableaux.0.songs.0.voices", ["all", "solo"]);
    expect(r.ok && r.program.tableaux[0].songs[0].voices).toEqual(["solo", "all"]);
    expect(applyEdit(majlis, "tableaux.0.songs.0.voices", [])).toMatchObject({ error: "value" });
  });

  it("applies saved edits and skips the ones that no longer fit", () => {
    const p = applyEdits(majlis, { "title.en": "Two Liberations", "tableaux.9.color": "#ffffff", "scene.moments.0.note.ar": "يبدأ صوت واحد" });
    expect(p.title.en).toBe("Two Liberations");
    expect(valueAt(p, "scene.moments.0.note.ar")).toBe("يبدأ صوت واحد");
  });
});
