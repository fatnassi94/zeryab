/**
 * Songs added to the lab, kept in this browser only (IndexedDB): the original
 * file bytes plus a little metadata for the list. Nothing is uploaded.
 * Every call rejects when storage is unavailable (private mode, blocked site
 * data); callers keep the song open for the session and say it isn't saved.
 */

export type StoredSong = {
  id: string;
  title: string;
  fileName: string;
  format: "musicxml" | "mxl" | "midi";
  bars: number;
  meter: string;
  addedAt: number;
  bytes: ArrayBuffer;
};

const DB = "zeryab-studio";
const STORE = "songs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listSongs(): Promise<StoredSong[]> {
  const all = await run("readonly", (s) => s.getAll() as IDBRequest<StoredSong[]>);
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export const saveSong = (song: StoredSong) => run("readwrite", (s) => s.put(song)).then(() => undefined);

export const deleteSong = (id: string) => run("readwrite", (s) => s.delete(id)).then(() => undefined);
