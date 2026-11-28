import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "./cloud-map";
export type InviteContact = "email" | "phone";
export type TeamInvite = { id: string; contact: string; kind: InviteContact; name: string; job_title: string; permissions: Partial<Record<Permission, boolean>>; expires_at: string; used_at: string | null };
export type InviteDetails = Pick<TeamInvite,"contact"|"kind"|"name"|"job_title"> & { shop: string };
export class InviteServiceUnavailable extends Error {}
type Rpc = (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?:string } | null }>;
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  // Remove the cast after the migration and regeneration of Supabase types.
  const { data, error } = await (supabase.rpc.bind(supabase) as unknown as Rpc)(name,args);
  if (error) {
    if (error.code === "PGRST202" || error.message.includes("schema cache")) throw new InviteServiceUnavailable("O serviço de convites e actividades ainda não está activo.");
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
// Existing RLS-protected ledger is enough for owner activity, even before the invite migration.
export async function getTeamActivity(id:string, days:1|7|30): Promise<Activity> {
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)throw new Error("Entre na sua conta.");
  const {data:owner,error:ownerError}=await supabase.from("employees").select("establishment_id,role,active").eq("user_id",auth.user.id).maybeSingle();
  if(ownerError||!owner||owner.role!=="owner"||!owner.active)throw new Error("Sem permissão.");
  const est=owner.establishment_id;
  const {data:helper,error:helperError}=await supabase.from("employees").select("user_id").eq("id",id).eq("establishment_id",est).eq("role","employee").maybeSingle();
  if(helperError||!helper)throw new Error("Ajudante não encontrado.");
  if(!helper.user_id)return {sales_count:0,sales_total:0,payments_count:0,payments_total:0,stock_count:0,events:[]};
  const actor=helper.user_id;
  const since=new Date(Date.now()-days*86400000).toISOString();
  async function all<T>(query:(a:number,b:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<T[]> {
    const rows:T[]=[];
    for(let a=0;;a+=500){
      const {data,error}=await query(a,a+499);
      if(error)throw error;
      rows.push(...(data??[]));
      if(!data||data.length<500)return rows;
    }
  }
  const [sales,payments,stock]=await Promise.all([
    all<{id:string;created_at:string;total:number}>((a,b)=>supabase.from("sales").select("id,created_at,total").eq("establishment_id",est).eq("seller_id",actor).gte("created_at",since).order("id").range(a,b)),
    all<{id:string;created_at:string;amount:number}>((a,b)=>supabase.from("payments").select("id,created_at,amount").eq("establishment_id",est).eq("received_by",actor).gte("created_at",since).order("id").range(a,b)),
    all<{id:string;created_at:string;delta:number;product_id:string}>((a,b)=>supabase.from("stock_movements").select("id,created_at,delta,product_id").eq("establishment_id",est).eq("created_by",actor).is("sale_id",null).gte("created_at",since).order("id").range(a,b)),
  ]);
  const {data:products,error:productError}=await supabase.from("products").select("id,name").eq("establishment_id",est);
  if(productError)throw productError;
  const names=new Map((products??[]).map(p=>[p.id,p.name]));
  const events:Activity["events"]=[
    ...sales.map(s=>({id:s.id,at:s.created_at,kind:"sale" as const,amount:s.total,delta:null,product:null})),
    ...payments.map(p=>({id:p.id,at:p.created_at,kind:"payment" as const,amount:p.amount,delta:null,product:null})),
    ...stock.map(m=>({id:m.id,at:m.created_at,kind:"stock" as const,amount:null,delta:m.delta,product:names.get(m.product_id)??null})),
  ];
  events.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
  return {sales_count:sales.length,sales_total:sales.reduce((n,s)=>n+s.total,0),payments_count:payments.length,payments_total:payments.reduce((n,p)=>n+p.amount,0),stock_count:stock.length,events:events.slice(0,100)};
}
export function whatsappInvite(url:string,phone?:string,legacyEmail?:string) {
  const number = phone?.replace(/^\+/,"") ?? "";
  return "https://wa.me/"+number+"?text="+encodeURIComponent(legacyEmail ? "Olá! Foi convidado a juntar-se à minha equipa no Kitanda Yami. Crie a sua conta com o email "+legacyEmail+" em "+url : "Olá! Foi convidado a juntar-se à minha equipa no Kitanda Yami. Abra este link para aceitar: "+url);
}
