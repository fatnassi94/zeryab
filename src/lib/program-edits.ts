import { PROGRAM_ICONS, PROGRAM_LABELS, VOICES, type Program } from "./programs";

/**
 * Back-office edits of a program page: changed values keyed by their path in
 * the program ("title.ar", "tableaux.0.songs.1.rhythm"…), applied over the
 * version written in programs.ts. Only texts and a few display values can be
 * changed; numbering, pages and map geometry stay as written.
 */
export type EditValue = string | number | string[];
export type Edits = Record<string, EditValue>;

type Kind = "text" | "optional" | "color" | "icon" | "page" | "voices";

const RULES: [RegExp, Kind][] = [
  [/^(series|title|orbit|centre|summary)\.(ar|fr|en)$/, "text"],
  [/^next\.(ar|fr|en)$/, "optional"],
  [new RegExp(`^labels\\.(${PROGRAM_LABELS.join("|")})\\.(ar|fr|en)$`), "optional"],
  [/^steps\.(ar|fr|en)\.[0-3]$/, "text"],
  [/^tableaux\.\d+\.title\.(ar|fr|en)$/, "text"],
  [/^tableaux\.\d+\.mood\.(ar|fr|en)$/, "optional"],
  [/^tableaux\.\d+\.stop\.name\.(ar|fr|en)$/, "text"],
  [/^tableaux\.\d+\.color$/, "color"],
  [/^tableaux\.\d+\.icon$/, "icon"],
  [/^tableaux\.\d+\.page$/, "page"],
  [/^tableaux\.\d+\.songs\.\d+\.title$/, "text"],
  [/^tableaux\.\d+\.songs\.\d+\.rhythm$/, "optional"],
  [/^tableaux\.\d+\.songs\.\d+\.page$/, "page"],
  [/^tableaux\.\d+\.songs\.\d+\.voices$/, "voices"],
  [/^scene\.stations\.\d+\.(place|dance)\.(ar|fr|en)$/, "text"],
  [/^scene\.stations\.\d+\.rhythm$/, "optional"],
  [/^scene\.moments\.\d+\.note\.(ar|fr|en)$/, "text"],
];

/** Optional blocks created on first edit (a tableau without a mood, a program without a next one, own headings). */
const OPTIONAL_BLOCKS = new Set<string>(["mood", "next", "labels", ...PROGRAM_LABELS]);
export const MAX_TEXT = 2000;

export type EditError = "path" | "value" | "empty";
export type EditResult = { ok: true; program: Program; value: EditValue | undefined } | { ok: false; error: EditError };

const kindOf = (path: string) => RULES.find(([re]) => re.test(path))?.[1] ?? null;

function clean(kind: Kind, value: unknown, program: Program): EditValue | undefined | EditError {
  switch (kind) {
    case "text":
    case "optional": {
      if (typeof value !== "string" || value.length > MAX_TEXT) return "value";
      const text = value.replace(/\s+/g, " ").trim();
      if (!text) return kind === "text" ? "empty" : undefined;
      return text;
    }
    case "color":
      return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "value";
    case "icon":
      return typeof value === "string" && (PROGRAM_ICONS as readonly string[]).includes(value) ? value : "value";
    case "page":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= program.pages.length ? (value as number) : "value";
    case "voices":
      return Array.isArray(value) && value.length > 0 && value.every((v) => (VOICES as readonly string[]).includes(v))
        ? VOICES.filter((v) => value.includes(v))
        : "value";
  }
}

/** The program with one value changed, or why the change is refused. The input is not modified. */
export function applyEdit(program: Program, path: string, value: unknown): EditResult {
  const kind = typeof path === "string" && path.length <= 120 ? kindOf(path) : null;
  if (!kind) return { ok: false, error: "path" };
  const v = clean(kind, value, program);
  if (v === "value" || v === "empty" || v === "path") return { ok: false, error: v };

  const next = structuredClone(program);
  const keys = path.split(".");
  let node: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    let child = node[keys[i]];
    if (child === undefined && OPTIONAL_BLOCKS.has(keys[i])) child = node[keys[i]] = keys[i] === "labels" ? {} : { ar: "", fr: "", en: "" };
    if (child === null || typeof child !== "object") return { ok: false, error: "path" };
    if (Array.isArray(child) && !(Number(keys[i + 1]) < child.length)) return { ok: false, error: "path" };
    node = child as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (v === undefined) {
    if (OPTIONAL_BLOCKS.has(keys[keys.length - 2])) node[last] = "";
    else delete node[last];
  } else node[last] = v;
  return { ok: true, program: next, value: v };
}

/** Every saved edit applied in turn; an edit that no longer fits the program is skipped. */
export function applyEdits(program: Program, edits: Edits): Program {
  let out = program;
  for (const [path, value] of Object.entries(edits ?? {})) {
    const r = applyEdit(out, path, value);
    if (r.ok) out = r.program;
  }
  return out;
}

/** The value at a path, for comparing an edit with the original. */
export function valueAt(program: Program, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), program);
}
