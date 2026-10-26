import { describe, expect, it } from "vitest";
import { checkSignup, looksLikeBot } from "./signup";

const ok = { fullName: "Fares Fatnassi", email: "Fares@Example.com", password: "oud-and-nay-2026", part: "lead_vocal", instrument: "" };

describe("checkSignup", () => {
  it("accepts a valid sign-up and normalises it", () => {
    const r = checkSignup({ ...ok, fullName: "  Fares   Fatnassi " });
    expect(r).toEqual({ ok: true, value: { fullName: "Fares Fatnassi", email: "fares@example.com", password: ok.password, part: "lead_vocal", instrument: "" } });
  });

  it("requires a name, a real email and a known part", () => {
    const r = checkSignup({ ...ok, fullName: "F", email: "nope", part: "dancer" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ fullName: "name", email: "email", part: "part" });
  });

  it("rejects short, overlong and guessable passwords", () => {
    const err = (password: string) => {
      const r = checkSignup({ ...ok, password });
      return r.ok ? null : r.errors.password;
    };
    expect(err("short1")).toBe("passwordShort");
    expect(err("x".repeat(73))).toBe("passwordLong");
    expect(err("aaaaaaaaaa")).toBe("passwordWeak");
    expect(err("12345678abc")).toBe("passwordWeak");
    expect(err("my-fares-secret")).toBe("passwordWeak");
  });

  it("asks which instrument, and keeps it only for instrumentalists", () => {
    const missing = checkSignup({ ...ok, part: "instrument", instrument: " " });
    expect(missing.ok ? null : missing.errors.instrument).toBe("instrument");
    const oud = checkSignup({ ...ok, part: "instrument", instrument: "عود" });
    expect(oud.ok && oud.value.instrument).toBe("عود");
    const singer = checkSignup({ ...ok, instrument: "عود" });
    expect(singer.ok && singer.value.instrument).toBe("");
  });
});

describe("looksLikeBot", () => {
  const now = 1_000_000;
  it("flags the hidden field, a missing timestamp and a too-fast form", () => {
    expect(looksLikeBot("http://spam", String(now - 60_000), now)).toBe(true);
    expect(looksLikeBot("", "", now)).toBe(true);
    expect(looksLikeBot("", String(now - 800), now)).toBe(true);
    expect(looksLikeBot("", String(now - 30_000), now)).toBe(false);
  });
});
