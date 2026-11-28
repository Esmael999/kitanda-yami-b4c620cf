import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "./cloud-map";
export type InviteContact = "email" | "phone";
export type TeamInvite = { id: string; contact: string; kind: InviteContact; name: string; job_title: string; permissions: Partial<Record<Permission, boolean>>; expires_at: string; used_at: string | null };
export type InviteDetails = Pick<TeamInvite,"contact"|"kind"|"name"|"job_title"> & { shop: string };
type Rpc = (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?:string } | null }>;
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  // Remove the cast after the migration and regeneration of Supabase types.
  const { data, error } = await (supabase.rpc.bind(supabase) as unknown as Rpc)(name,args);
  if (error) {
    if (error.code === "PGRST202" || error.message.includes("schema cache")) throw new Error("O serviço de convites e actividades ainda não está activo.");
    throw new Error(error.message);
  }
  return data as T;
}
export const createInvite = (input: {contact: string; kind: InviteContact; name: string; jobTitle: string; permissions: TeamInvite["permissions"]}) =>
  rpc<{token:string; expires_at:string}>("create_team_invite",{_contact:input.contact,_kind:input.kind,_name:input.name,_permissions:input.permissions,_job_title:input.jobTitle});
export const listInvites = () => rpc<TeamInvite[]>("list_team_invites");
export const inspectInvite = (token:string) => rpc<InviteDetails|null>("inspect_team_invite",{_token:token});
export const redeemInvite = (token:string) => rpc<void>("redeem_team_invite",{_token:token});
export function inviteUrl(token:string) {
  const url = new URL("/entrar",window.location.origin);
  url.searchParams.set("convite",token);
  return url.toString();
}

export type Activity = {
  sales_count:number; sales_total:number; payments_count:number; payments_total:number; stock_count:number;
  events: { id:string; at:string; kind:"sale"|"payment"|"stock"; amount:number|null; delta:number|null; product:string|null }[];
};
export const getTeamActivity = (id:string, days:1|7|30) => rpc<Activity>("team_activity",{_employee_id:id,_days:days});
export function whatsappInvite(url:string,phone?:string) {
  const number = phone?.replace(/^\+/,"") ?? "";
  return "https://wa.me/"+number+"?text="+encodeURIComponent("Olá! Foi convidado a juntar-se à minha equipa no Kitanda Yami. Abra este link para aceitar: "+url);
}
