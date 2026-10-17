import type { Cents } from "./pitch";

/**
 * Scala tuning file (.scl), readable by most hardware and software synths.
 * `degrees` are cents above the tonic for each step after the tonic, ending
 * with the period (usually 1200). Format: https://www.huygens-fokker.org/scala/scl_format.html
 */
export function toScl(fileName: string, description: string, degrees: Cents[]): string {
  if (!degrees.length) throw new Error("A scale needs at least one degree");
  const clean = (s: string) => s.replace(/[\r\n]+/g, " ");
  const lines = [
    `! ${clean(fileName)}.scl`,
    "!",
    clean(description),
    ` ${degrees.length}`,
    "!",
    // A value with a period is read as cents; always print one decimal at least.
    ...degrees.map((c) => ` ${c.toFixed(Math.max(1, decimals(c)))}`),
  ];
  return lines.join("\n") + "\n";
}

function decimals(x: number) {
  const s = String(Math.abs(x));
  return s.includes(".") ? Math.min(6, s.split(".")[1].length) : 0;
}
