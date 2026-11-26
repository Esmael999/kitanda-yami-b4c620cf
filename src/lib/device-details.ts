// Preview-only annotations, separate from the synced financial ledger.
import { createStore, get, set, del, keys, delMany } from "idb-keyval";
import { useEffect, useState } from "react";
let store: ReturnType<typeof createStore> | undefined;
const db = () => (store ??= createStore("kitanda-details", "kv"));
const prefix = (uid: string) => `account:${uid}:`;
const event = "kitanda:details";
export async function writeDetail(uid: string, detail: string, value: string | null) {
  if (!uid) throw new Error("Conta indisponível");
  const key = prefix(uid) + detail;
  if (value === null) await del(key, db());
  else await set(key, value, db());
  window.dispatchEvent(new CustomEvent(event, { detail: key }));
}
export async function clearDetails(uid: string) {
  if (!uid) return;
  const own = (await keys(db())).filter(k => typeof k === "string" && k.startsWith(prefix(uid)));
  await delMany(own, db());
  window.dispatchEvent(new CustomEvent(event, { detail: prefix(uid) }));
}
export function useDetail(uid: string | null, detail: string) {
  const key = uid ? prefix(uid) + detail : null;
  const [entry, setEntry] = useState<{ key: string; value: string | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let active = true;
    let sequence = 0;
    const load = async () => {
      const request = ++sequence;
      let value: string | null = null;
      try { value = (await get<string>(key, db())) ?? null; } catch { /* no local copy */ }
      if (active && sequence === request) setEntry({ key, value });
    };
    const changed = (e: Event) => {
      const changedKey = (e as CustomEvent<string>).detail;
      if (changedKey && key.startsWith(changedKey)) void load();
    };
    void load();
    window.addEventListener(event, changed);
    return () => { active = false; window.removeEventListener(event, changed); };
  }, [key]);
  return entry?.key === key ? entry?.value ?? null : null;
}
