// IndexedDB storage for the offline copy of the ledger and the pending sync queue (one set per account).
import { createStore, del, get, set } from "idb-keyval";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("kitanda", "kv"));

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key, db());
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value, db());
  } catch {
    /* storage blocked — data stays in memory until the next sync */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await del(key, db());
  } catch {
    /* ignore */
  }
}
