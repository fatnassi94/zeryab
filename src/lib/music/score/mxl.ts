import { ScoreImportError } from "./musicxml";

/**
 * Compressed MusicXML (.mxl) is a zip archive whose META-INF/container.xml
 * names the score file. Minimal zip reader (stored or deflated entries, no
 * zip64) on the platform's DecompressionStream — no dependency.
 */

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

export const isZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

type Entry = { name: string; method: number; size: number; offset: number };

function entries(b: Uint8Array): Entry[] {
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ScoreImportError("read");
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const names = new TextDecoder();
  const out: Entry[] = [];
  for (let k = 0; k < count; k++) {
    if (u32(b, p) !== 0x02014b50) throw new ScoreImportError("read");
    const method = u16(b, p + 10);
    const size = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const local = u32(b, p + 42);
    const name = names.decode(b.subarray(p + 46, p + 46 + nameLen));
    if (u32(b, local) !== 0x04034b50) throw new ScoreImportError("read");
    const offset = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out.push({ name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(e: Entry, b: Uint8Array): Promise<Uint8Array> {
  const data = b.slice(e.offset, e.offset + e.size);
  if (e.method === 0) return data;
  if (e.method !== 8) throw new ScoreImportError("read");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Bytes of the score file inside an .mxl archive. */
export async function readMxl(b: Uint8Array): Promise<Uint8Array> {
  const list = entries(b);
  const container = list.find((e) => e.name === "META-INF/container.xml");
  let target: Entry | undefined;
  if (container) {
    const xml = new TextDecoder().decode(await inflate(container, b));
    const path = /full-path\s*=\s*"([^"]+)"/.exec(xml)?.[1];
    target = list.find((e) => e.name === path);
  }
  target ??= list.find((e) => !e.name.startsWith("META-INF/") && /\.(musicxml|xml)$/i.test(e.name));
  if (!target) throw new ScoreImportError("format");
  return inflate(target, b);
}

/** XML bytes → text, honouring a UTF-16 byte-order mark (some exporters write UTF-16). */
export function decodeXml(b: Uint8Array): string {
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b);
  return new TextDecoder("utf-8").decode(b);
}
