-- Proposed migration: review and test on an isolated database before production.
-- Do not apply until email/SMS verification is enabled and the matching frontend is ready.
begin;
create schema if not exists kitanda_private;
revoke all on schema kitanda_private from public, anon, authenticated;
create table if not exists kitanda_private.team_invites (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  contact text not null,
  kind text not null check (kind in ('email','phone')),
  name text not null,
  job_title text not null default 'Ajudante' check (length(btrim(job_title)) between 1 and 80),
  permissions jsonb not null,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  unique(establishment_id, contact)
);
alter table kitanda_private.team_invites enable row level security;
alter table public.employees add column if not exists job_title text not null default 'Ajudante' check (length(btrim(job_title)) between 1 and 80);
revoke all on kitanda_private.team_invites from public, anon, authenticated;

create or replace function public.create_team_invite(_contact text,_kind text,_name text,_permissions jsonb,_job_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  est uuid := public.current_establishment_id();
  contact_value text := lower(btrim(coalesce(_contact,'')));
  token text := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  expiry timestamptz := now() + interval '7 days';
  perms jsonb;
begin
  if auth.uid() is null or est is null or not public.is_owner() then raise exception 'Sem permissão.' using errcode='42501'; end if;
  if _kind is null or _kind not in ('email','phone') or
     (_kind='email' and (contact_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(contact_value)>254)) or
     (_kind='phone' and contact_value !~ '^[+]2449[0-9]{8}$') then raise exception 'Contacto inválido.'; end if;
  if length(btrim(coalesce(_name,''))) not between 1 and 100 then raise exception 'Nome inválido.'; end if;
  if length(btrim(coalesce(_job_title,''))) not between 1 and 80 then raise exception 'Função inválida.'; end if;
  if jsonb_typeof(coalesce(_permissions,'{}'::jsonb)) <> 'object' then raise exception 'Permissões inválidas.'; end if;
  select jsonb_object_agg(k, coalesce((_permissions->k) = 'true'::jsonb,false)) into perms
    from unnest(array['vender','fiado','receber','produtos','relatorios']) k;
  if exists(select 1 from public.employees e where e.establishment_id=est and lower(e.email)=contact_value) then
    raise exception 'Já existe uma associação ou convite anterior para este contacto.';
  end if;
  insert into kitanda_private.team_invites(establishment_id,contact,kind,name,job_title,permissions,token_hash,expires_at)
  values(est,contact_value,_kind,btrim(_name),btrim(_job_title),perms,sha256(convert_to(token,'UTF8')),expiry)
  on conflict(establishment_id,contact) do update set kind=excluded.kind,name=excluded.name,job_title=excluded.job_title,permissions=excluded.permissions,
    token_hash=excluded.token_hash,expires_at=excluded.expires_at
    where team_invites.used_at is null;
  if not found then raise exception 'Este convite já foi utilizado.'; end if;
  return jsonb_build_object('token',token,'expires_at',expiry);
end $$;

create or replace function public.list_team_invites()
returns jsonb language plpgsql security definer set search_path='' as $$
declare est uuid := public.current_establishment_id();
begin
  if auth.uid() is null or est is null or not public.is_owner() then raise exception 'Sem permissão.' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'contact',contact,'kind',kind,'name',name,'job_title',job_title,'permissions',permissions,'expires_at',expires_at,'used_at',used_at) order by expires_at desc)
     from kitanda_private.team_invites where establishment_id=est),'[]'::jsonb);
end $$;

create or replace function public.inspect_team_invite(_token text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('contact',i.contact,'kind',i.kind,'name',i.name,'job_title',i.job_title,'shop',e.name)
  from kitanda_private.team_invites i join public.establishments e on e.id=i.establishment_id
  where length(_token)=64 and i.token_hash=sha256(convert_to(_token,'UTF8')) and i.used_at is null and i.expires_at>now()
$$;

-- The signup trigger preserves legacy email invitations and normal shop creation.
-- New token-based signups remain without membership until verified and redeemed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  _est uuid;
  _inv public.employees%rowtype;
  _name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '');
  _type text := coalesce(new.raw_user_meta_data ->> 'business_type', 'cantina');
  _token text := new.raw_user_meta_data ->> 'team_invitation';
begin
  if _token is not null then
    if length(_token)<>64 or not exists (
      select 1 from kitanda_private.team_invites i
      where i.token_hash=sha256(convert_to(_token,'UTF8')) and i.used_at is null and i.expires_at>now()
        and ((i.kind='email' and i.contact=lower(new.email)) or
             (i.kind='phone' and ltrim(i.contact,'+')=ltrim(new.phone,'+')))
    ) then raise exception 'Convite inválido ou expirado.'; end if;
    return new;
  end if;
  if _type not in ('zunga','bancada','cantina','miniloja','deposito','comida') then _type := 'cantina'; end if;
  select * into _inv from public.employees where lower(email)=lower(new.email) and user_id is null and active order by created_at limit 1 for update;
  if found then
    update public.employees set user_id=new.id,name=case when name='' then _name else name end where id=_inv.id;
    _est:=_inv.establishment_id;
  else
    insert into public.establishments(name,business_type)
    values(coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_name'),''),'A minha cantina'),_type) returning id into _est;
    insert into public.employees(establishment_id,user_id,email,name,role)
    values(_est,new.id,lower(coalesce(new.email,new.phone,new.id::text)),_name,'owner');
  end if;
  insert into public.profiles(id,establishment_id,full_name) values(new.id,_est,_name) on conflict(id) do nothing;
  return new;
end $$;

create or replace function public.redeem_team_invite(_token text)
returns void language plpgsql security definer set search_path='' as $$
declare inv kitanda_private.team_invites%rowtype; u auth.users%rowtype;
begin
  if auth.uid() is null or length(coalesce(_token,''))<>64 then raise exception 'Convite inválido.' using errcode='42501'; end if;
  -- Serialize claims for the same account and token.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into inv from kitanda_private.team_invites where token_hash=sha256(convert_to(_token,'UTF8')) for update;
  if not found or inv.used_at is not null or inv.expires_at<=now() then raise exception 'Convite utilizado ou expirado.'; end if;
  select * into u from auth.users where id=auth.uid();
  if not found or not coalesce(
    (inv.kind='email' and lower(u.email)=inv.contact and u.email_confirmed_at is not null) or
    (inv.kind='phone' and ltrim(u.phone,'+')=ltrim(inv.contact,'+') and u.phone_confirmed_at is not null),false)
  then raise exception 'Confirme o contacto indicado no convite.' using errcode='42501'; end if;
  if exists(select 1 from public.employees where user_id=u.id) then raise exception 'Esta conta já pertence a um negócio.'; end if;
  insert into public.employees(establishment_id,user_id,email,name,role,job_title,permissions,active)
  values(inv.establishment_id,u.id,inv.contact,inv.name,'employee',inv.job_title,inv.permissions,true);
  insert into public.profiles(id,establishment_id,full_name) values(u.id,inv.establishment_id,inv.name)
    on conflict(id) do update set establishment_id=excluded.establishment_id,full_name=excluded.full_name;
  update kitanda_private.team_invites set used_at=now(),used_by=u.id where id=inv.id;
end $$;

revoke all on function public.create_team_invite(text,text,text,jsonb,text), public.list_team_invites(), public.redeem_team_invite(text), public.inspect_team_invite(text) from public,anon,authenticated;
grant execute on function public.create_team_invite(text,text,text,jsonb,text), public.list_team_invites(), public.redeem_team_invite(text) to authenticated;
grant execute on function public.inspect_team_invite(text) to anon,authenticated;
-- Read-only activity API. Attribution uses server-authenticated actor IDs in existing ledger rows.
create or replace function public.team_activity(_employee_id uuid, _days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path='' as $activity$
declare est uuid := public.current_establishment_id(); actor uuid; since timestamptz;
begin
  if auth.uid() is null or est is null or not public.is_owner() then raise exception 'Sem permissão.' using errcode='42501'; end if;
  if _days is null or _days not in (1,7,30) then raise exception 'Período inválido.'; end if;
  select user_id into actor from public.employees where id=_employee_id and establishment_id=est and role='employee';
  if not found or actor is null then raise exception 'Ajudante indisponível.'; end if;
  since := now() - make_interval(days => _days);
  return jsonb_build_object(
    'sales_count',(select count(*) from public.sales where establishment_id=est and seller_id=actor and created_at>=since),
    'sales_total',(select coalesce(sum(total),0) from public.sales where establishment_id=est and seller_id=actor and created_at>=since),
    'payments_count',(select count(*) from public.payments where establishment_id=est and received_by=actor and created_at>=since),
    'payments_total',(select coalesce(sum(amount),0) from public.payments where establishment_id=est and received_by=actor and created_at>=since),
    'stock_count',(select count(*) from public.stock_movements where establishment_id=est and created_by=actor and sale_id is null and created_at>=since),
    'events',coalesce((select jsonb_agg(to_jsonb(q) order by q.at desc,q.id) from (
      select * from (
        select id,created_at as at,'sale'::text as kind,total as amount,null::integer as delta,null::text as product from public.sales where establishment_id=est and seller_id=actor and created_at>=since
        union all
        select id,created_at,'payment',amount,null::integer,null::text from public.payments where establishment_id=est and received_by=actor and created_at>=since
        union all
        select m.id,m.created_at,'stock',null::integer,m.delta,p.name from public.stock_movements m left join public.products p on p.id=m.product_id and p.establishment_id=est where m.establishment_id=est and m.created_by=actor and m.sale_id is null and m.created_at>=since
      ) events order by at desc,id limit 100
    ) q),'[]'::jsonb));
end $activity$;
revoke all on function public.team_activity(uuid,integer) from public,anon,authenticated;
grant execute on function public.team_activity(uuid,integer) to authenticated;
commit;
