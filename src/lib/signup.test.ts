import { describe, expect, it } from "vitest";
import { checkProfile, checkSignup, looksLikeBot } from "./signup";

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

describe("own profile", () => {
  const ok = { fullName: "  سلمى  بن علي ", displayName: "", instruments: "عود، ناي, عود", phone: "+216 22 333 444", locale: "fr" };

  it("tidies names, splits instruments on Arabic or Latin commas, keeps one of each", () => {
    expect(checkProfile(ok)).toEqual({
      ok: true,
      value: { full_name: "سلمى بن علي", display_name: null, instruments: ["عود", "ناي"], phone: "+216 22 333 444", preferred_locale: "fr" },
    });
  });

  it("names the fields to fix", () => {
    const r = checkProfile({ fullName: "x", displayName: "a".repeat(61), instruments: "ع", phone: "call me", locale: "de" });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["displayName", "fullName", "instruments", "locale", "phone"]);
  });
});
