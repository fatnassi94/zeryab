import { describe, expect, it } from "vitest";
import { fileProblem, formatBytes, isUploadPath, MAX_FILE_BYTES, parseDocument, parseRecording, storagePath } from "./library";

const id = "0f8b6c1e-2d4a-4b5c-9e7f-1a2b3c4d5e6f";
const form = (v: Record<string, string>) => (k: string) => v[k] ?? "";

describe("library uploads", () => {
  it("accepts audio for recordings and PDFs or pictures for documents, up to 50 MB", () => {
    expect(fileProblem("recordings", "audio/mpeg", 1000)).toBeNull();
    expect(fileProblem("recordings", "application/pdf", 1000)).toBe("type");
    expect(fileProblem("documents", "application/pdf", MAX_FILE_BYTES + 1)).toBe("size");
    expect(fileProblem("documents", "image/png", 0)).toBe("empty");
  });

  it("only takes back paths it made itself", () => {
    const p = storagePath("recordings", "audio/mpeg", id, 2026);
    expect(p).toBe(`recordings/2026/${id}.mp3`);
    expect(isUploadPath("recordings", p)).toBe(true);
    expect(isUploadPath("documents", p)).toBe(false);
    expect(isUploadPath("recordings", `recordings/2026/../../lessons/${id}.mp3`)).toBe(false);
    expect(isUploadPath("documents", `documents/2026/${id}.exe`)).toBe(false);
  });

  it("checks a recording's details", () => {
    const ok = parseRecording(form({ title: " نوبة  الذيل ", visibility: "members", status: "published", date: "2026-03-14", maqam: id }));
    expect("meta" in ok && ok.meta).toMatchObject({ title: "نوبة الذيل", recorded_on: "2026-03-14", maqam_id: id, performers: null });
    const bad = parseRecording(form({ title: "x", visibility: "everyone", status: "live", date: "2026-02-30", maqam: "bayati" }));
    expect("errors" in bad && Object.keys(bad.errors).sort()).toEqual(["date", "maqam", "status", "title", "visibility"]);
  });

  it("checks a document's details", () => {
    const ok = parseDocument(form({ title: "كلمات الموشح", kind: "lyrics", visibility: "public", status: "draft" }));
    expect("meta" in ok && ok.meta).toMatchObject({ kind: "lyrics", visibility: "public", document_date: null });
    expect(parseDocument(form({ title: "ok title", kind: "video", visibility: "members", status: "draft" }))).toEqual({ errors: { kind: true } });
  });

  it("writes sizes for lists", () => {
    expect(formatBytes(500)).toBe("1 KB");
    expect(formatBytes(12.4 * 1024 * 1024)).toBe("12.4 MB");
  });
});
