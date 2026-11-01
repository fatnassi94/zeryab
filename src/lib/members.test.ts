import { describe, expect, it } from "vitest";
import { checkInvite, checkMemberEdit, pickRoles, roleChanges } from "./members";

describe("members back office", () => {
  it("always keeps the member role and drops unknown ones", () => {
    expect(pickRoles(["teacher", "superuser"])).toEqual(["member", "teacher"]);
    expect(pickRoles([])).toEqual(["member"]);
  });

  it("checks a pre-approval", () => {
    expect(checkInvite({ email: " Salma@Club.TN ", name: " سلمى  ", part: "percussion", roles: ["librarian"] })).toEqual({
      ok: true, value: { email: "salma@club.tn", full_name: "سلمى", part: "percussion", roles: ["member", "librarian"] },
    });
    const bad = checkInvite({ email: "salma", name: "x", part: "drums", roles: [] });
    expect(bad.ok === false && Object.keys(bad.errors).sort()).toEqual(["email", "name", "part"]);
  });

  it("checks the admin's edit of a member", () => {
    const r = checkMemberEdit({ name: "سلمى بن علي", part: "", instruments: "عود، ناي", phone: "", notes: " يعزف منذ 2010 " });
    expect(r).toEqual({ ok: true, value: { full_name: "سلمى بن علي", part: null, instruments: ["عود", "ناي"], phone: null, admin_notes: "يعزف منذ 2010" } });
  });

  it("works out role changes, and an admin keeps their own admin role", () => {
    expect(roleChanges(["member", "teacher"], ["member", "librarian"], false)).toEqual({ add: ["librarian"], remove: ["teacher"] });
    expect(roleChanges(["member", "admin"], ["member"], true)).toEqual({ add: [], remove: [] });
    expect(roleChanges(["member", "admin"], ["member"], false)).toEqual({ add: [], remove: ["admin"] });
  });
});
