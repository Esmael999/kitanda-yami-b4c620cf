ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'cantina';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _est uuid;
  _inv public.employees%rowtype;
  _name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '');
  _type text := coalesce(new.raw_user_meta_data ->> 'business_type', 'cantina');
begin
  if _type not in ('zunga','bancada','cantina','miniloja','deposito','comida') then _type := 'cantina'; end if;
  select * into _inv from public.employees
  where lower(email) = lower(new.email) and user_id is null and active
  order by created_at limit 1;

  if found then
    update public.employees set user_id = new.id,
      name = case when name = '' then _name else name end
    where id = _inv.id;
    _est := _inv.establishment_id;
  else
    insert into public.establishments (name, business_type)
    values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''), 'A minha cantina'), _type)
    returning id into _est;
    insert into public.employees (establishment_id, user_id, email, name, role)
    values (_est, new.id, lower(coalesce(new.email, new.id::text)), _name, 'owner');
  end if;

  insert into public.profiles (id, establishment_id, full_name) values (new.id, _est, _name)
  on conflict (id) do nothing;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.set_business_type(_type text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _est uuid := public.require_establishment();
begin
  if not public.is_owner() then raise exception 'Só o dono pode mudar o tipo de negócio.' using errcode = '42501'; end if;
  if _type not in ('zunga','bancada','cantina','miniloja','deposito','comida') then raise exception 'Tipo inválido.' using errcode = '22023'; end if;
  update public.establishments set business_type = _type where id = _est;
end $function$;

REVOKE ALL ON FUNCTION public.set_business_type(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_business_type(text) TO authenticated;