import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "./cloud-map";
export type InviteContact = "email" | "phone";
export type TeamInvite = { id: string; contact: string; kind: InviteContact; name: string; permissions: Partial<Record<Permission, boolean>>; expires_at: string; used_at: string | null };
export type InviteDetails = Pick<TeamInvite,"contact"|"kind"|"name"> & { shop: string };
type Rpc = (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  // Remove the cast after the migration and regeneration of Supabase types.
  const { data, error } = await (supabase.rpc.bind(supabase) as unknown as Rpc)(name,args);
  if (error) throw new Error(error.message);
  return data as T;
}
export const createInvite = (input: {contact: string; kind: InviteContact; name: string; permissions: TeamInvite["permissions"]}) =>
  rpc<{token:string; expires_at:string}>("create_team_invite",{_contact:input.contact,_kind:input.kind,_name:input.name,_permissions:input.permissions});
export const listInvites = () => rpc<TeamInvite[]>("list_team_invites");
export const inspectInvite = (token:string) => rpc<InviteDetails|null>("inspect_team_invite",{_token:token});
export const redeemInvite = (token:string) => rpc<void>("redeem_team_invite",{_token:token});
export function inviteUrl(token:string) {
  const url = new URL("/entrar",window.location.origin);
  url.searchParams.set("convite",token);
  return url.toString();
}
