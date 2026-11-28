// Local accounts in the PR preview only. Never a Supabase identity or verified phone.
import { angolanPhone } from "./phone";
const KEY = "kitanda:local-session:v2";
type LocalAccount = {id:string;name:string;salt:string;verifier:string};
export function visitorAvailable(host: string): boolean {
  return host.toLowerCase() === "deploy-preview-2--kitanda-yami.netlify.app";
}
export function isVisitorAvailable(): boolean {
  return typeof window !== "undefined" && visitorAvailable(window.location.hostname);
}
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(bytes instanceof Uint8Array?bytes.buffer:bytes),b=>b.toString(16).padStart(2,"0")).join("");
const encode=(s:string)=>new TextEncoder().encode(s);
async function accountKey(phone:string) {
  const normalized=angolanPhone(phone);
  if(!normalized)throw new Error("Introduza um número angolano válido.");
  return "kitanda:local-account:"+hex(await crypto.subtle.digest("SHA-256",encode(normalized)));
}
async function verifier(password:string,salt:string) {
  const material=await crypto.subtle.importKey("raw",encode(password),"PBKDF2",false,["deriveBits"]);
  const bytes=Uint8Array.from(salt.match(/../g)??[],s=>parseInt(s,16));
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:bytes,iterations:600000},material,256));
}
export function readVisitor(): {id:string; name:string} | null {
  if (!isVisitorAvailable()) return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return v && typeof v.id === "string" && /^visitor:[a-f0-9-]{36}$/.test(v.id) && typeof v.name === "string" ? v : null;
  } catch { return null; }
}
export async function enterLocalAccount(input:{phone:string;password:string;name:string;create:boolean}) {
  if(!isVisitorAvailable())throw new Error("Acesso local indisponível.");
  if(input.password.length<6)throw new Error("Introduza pelo menos 6 caracteres.");
  const key=await accountKey(input.phone);
  let account=JSON.parse(localStorage.getItem(key)??"null") as LocalAccount|null;
  if(input.create){
    if(account)throw new Error("Já existe uma conta neste dispositivo. Escolha Entrar.");
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    account={id:"visitor:"+crypto.randomUUID(),name:input.name.trim().slice(0,100),salt,verifier:await verifier(input.password,salt)};
    localStorage.setItem(key,JSON.stringify(account));
  } else {
    if(!account)throw new Error("Ainda não tem conta neste dispositivo. Escolha Criar conta.");
    if(await verifier(input.password,account.salt)!==account.verifier)throw new Error("Verifique o telefone e a palavra-passe.");
  }
  sessionStorage.setItem(KEY,JSON.stringify({id:account.id,name:account.name}));
  window.location.assign("/");
}
export function leaveVisitor() {
  sessionStorage.removeItem(KEY);
  window.location.replace("/entrar");
}
