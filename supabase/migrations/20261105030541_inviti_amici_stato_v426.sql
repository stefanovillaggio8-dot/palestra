-- v426: l'autore puo consultare soltanto i propri inviti, inclusi quelli non ancora accettati.
-- I token sono restituiti esclusivamente al proprietario per poter ricopiare il link.
create or replace function private.inviti_amici_stato(p_profilo_id text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_risultato jsonb;
begin
  if v_uid is null then
    raise exception 'Accedi per controllare gli inviti.';
  end if;
  if not exists (
    select 1 from public.profili p
    where p.id = p_profilo_id and p.user_id = v_uid
  ) then
    raise exception 'Non puoi leggere gli inviti di un altro profilo.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'token', i.token::text,
    'creato', i.created_at,
    'scadenza', i.expires_at,
    'accettato', i.used_at is not null,
    'scaduto', i.used_at is null and i.expires_at <= now(),
    'tipo', case when i.claim_profile_id = 'account-2' then 'andrea' else 'normale' end
  ) order by i.created_at desc), '[]'::jsonb)
    into v_risultato
  from (
    select token, created_at, expires_at, used_at, claim_profile_id
    from public.inviti_amici_app
    where created_by = v_uid and creator_profile_id = p_profilo_id
    order by created_at desc
    limit 30
  ) i;
  return v_risultato;
end;
$$;
revoke all on function private.inviti_amici_stato(text) from public, anon, authenticated;
grant execute on function private.inviti_amici_stato(text) to authenticated;

create or replace function public.inviti_amici_stato(p_profilo_id text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.inviti_amici_stato(p_profilo_id); $$;
revoke all on function public.inviti_amici_stato(text) from public, anon, authenticated;
grant execute on function public.inviti_amici_stato(text) to authenticated;
