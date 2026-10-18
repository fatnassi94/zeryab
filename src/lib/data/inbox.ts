import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";

/** Transcriptions waiting in score-inbox/ (development only: the folder lives on the admin's computer). */
export async function inboxCount(): Promise<number> {
  if (process.env.NODE_ENV !== "development") return 0;
  try {
    return (await readdir(path.join(process.cwd(), "score-inbox"))).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}
