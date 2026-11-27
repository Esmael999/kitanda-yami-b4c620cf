// A local workspace, not an authenticated account. Only enabled on the isolated PR preview.
const KEY = "kitanda:visitor";
export function visitorAvailable(host: string): boolean {
  return host.toLowerCase() === "deploy-preview-2--kitanda-yami.netlify.app";
}
export function isVisitorAvailable(): boolean {
  return typeof window !== "undefined" && visitorAvailable(window.location.hostname);
}
export function readVisitor(): {id:string; name:string} | null {
  if (!isVisitorAvailable()) return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return v && typeof v.id === "string" && /^visitor:[a-f0-9-]{36}$/.test(v.id) && typeof v.name === "string" ? v : null;
  } catch { return null; }
}
export function enterVisitor(name: string) {
  if (!isVisitorAvailable()) throw new Error("Acesso local indisponível.");
  sessionStorage.setItem(KEY, JSON.stringify({id:"visitor:"+crypto.randomUUID(), name:name.trim().slice(0,100)}));
  window.location.assign("/");
}
export function leaveVisitor() {
  sessionStorage.removeItem(KEY);
  window.location.replace("/entrar");
}
