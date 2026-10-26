-- Multiutente, amicizie con invito monouso e lettura RLS degli allenamenti condivisi.
-- Già applicato al progetto Supabase adnteitlhopehllutlua il 26/10/2026.
begin;

alter table public.profili add column if not exists scheda_id text;
update public.profili set scheda_id='scheda-gym-3' where id='account-1' and (scheda_id is null or scheda_id='');
update public.profili set scheda_id='scheda-altro-1' where id='account-2' and (scheda_id is null or scheda_id='');

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.amicizie_app (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  friend_profile_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id, friend_profile_id),
  constraint amicizie_app_no_self check (profile_id <> friend_profile_id)
);
create index if not exists amicizie_app_friend_profile on public.amicizie_app(friend_profile_id, friend_user_id);
alter table public.amicizie_app enable row level security;
revoke all on public.amicizie_app from public, anon, authenticated;

create table if not exists public.inviti_amici_app (
  token uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  creator_profile_id text not null,
  claim_profile_id text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_profile_id text,
  created_at timestamptz not null default now()
);
create index if not exists inviti_amici_app_creator on public.inviti_amici_app(created_by, created_at desc);
alter table public.inviti_amici_app enable row level security;
revoke all on public.inviti_amici_app from public, anon, authenticated;

create or replace function private.amico_puo_leggere_profilo(p_profile_id text, p_campo text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.amicizie_app a
    join public.profili p on p.id = a.friend_profile_id and p.user_id = a.friend_user_id
    where a.user_id = (select auth.uid()) and a.friend_profile_id = p_profile_id
      and ((p_campo = 'profilo' and coalesce(p.privacy ->> 'profilo','privato') = 'pubblico')
        or (p_campo = 'performance' and coalesce(p.privacy ->> 'performance','privato') = 'pubblico')
        or (p_campo = 'leaderboard' and coalesce(p.privacy ->> 'leaderboard','privato') = 'pubblico')
        or (p_campo = 'statistiche' and coalesce(p.privacy ->> 'statistiche','privato') = 'pubblico'))
  );
$$;

create or replace function private.amico_puo_leggere_scheda(p_scheda_id text, p_campo text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.amicizie_app a
    join public.profili p on p.id = a.friend_profile_id and p.user_id = a.friend_user_id
    where a.user_id = (select auth.uid()) and p.scheda_id = p_scheda_id
      and ((p_campo = 'performance' and coalesce(p.privacy ->> 'performance','privato') = 'pubblico')
        or (p_campo = 'leaderboard' and coalesce(p.privacy ->> 'leaderboard','privato') = 'pubblico')
        or (p_campo = 'statistiche' and coalesce(p.privacy ->> 'statistiche','privato') = 'pubblico'))
  );
$$;

create or replace function private.amico_puo_leggere_seduta(p_seduta_id text, p_campo text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.sedute s
    where s.id = p_seduta_id and private.amico_puo_leggere_scheda(s.scheda_id, p_campo)
  );
$$;

create or replace function private.amico_puo_leggere_esercizio(p_esercizio_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.serie sr
    join public.sedute s on s.id = sr.seduta_id
    where sr.esercizio_id = p_esercizio_id
      and private.amico_puo_leggere_scheda(s.scheda_id, 'performance')
  );
$$;

create or replace function private.amico_puo_leggere_account(p_account_id text, p_campo text)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.amico_puo_leggere_profilo(p_account_id, p_campo); $$;

revoke all on function private.amico_puo_leggere_profilo(text,text) from public, anon;
revoke all on function private.amico_puo_leggere_scheda(text,text) from public, anon;
revoke all on function private.amico_puo_leggere_seduta(text,text) from public, anon;
revoke all on function private.amico_puo_leggere_esercizio(text) from public, anon;
revoke all on function private.amico_puo_leggere_account(text,text) from public, anon;
grant execute on function private.amico_puo_leggere_profilo(text,text) to authenticated;
grant execute on function private.amico_puo_leggere_scheda(text,text) to authenticated;
grant execute on function private.amico_puo_leggere_seduta(text,text) to authenticated;
grant execute on function private.amico_puo_leggere_esercizio(text) to authenticated;
grant execute on function private.amico_puo_leggere_account(text,text) to authenticated;

create or replace function public.profili_amici()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_profili jsonb;
begin
  if v_uid is null then raise exception 'Accedi per vedere i tuoi amici.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'username',p.username,'avatar_id',p.avatar_id,'amministratore',false,
    'amici',p.amici,'privacy',p.privacy,'colore',p.colore,'classe_rpg',p.classe_rpg,
    'personaggio_creato',p.personaggio_creato,'giorni_allenamento',p.giorni_allenamento,
    'scheda_id',p.scheda_id
  ) order by lower(p.username)), '[]'::jsonb)
  into v_profili
  from public.amicizie_app a join public.profili p on p.id=a.friend_profile_id and p.user_id=a.friend_user_id
  where a.user_id=v_uid;
  return v_profili;
end;
$$;
revoke all on function public.profili_amici() from public, anon;
grant execute on function public.profili_amici() to authenticated;

create or replace function public.crea_invito_amico(p_profilo_id text, p_trasferisci_andrea boolean default false)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_token uuid; v_claim text := null; v_scade timestamptz := now() + interval '14 days';
begin
  if v_uid is null then raise exception 'Accedi prima di creare un invito.'; end if;
  if not exists (select 1 from public.profili p where p.id=p_profilo_id and p.user_id=v_uid) then
    raise exception 'Il profilo scelto non appartiene al tuo account.';
  end if;
  if p_trasferisci_andrea then
    if p_profilo_id <> 'account-1' or not exists (
      select 1 from public.profili p where p.id='account-2' and p.user_id=v_uid and p.scheda_id='scheda-altro-1'
    ) then raise exception 'Il profilo storico di Andrea non è disponibile per il trasferimento.'; end if;
    v_claim := 'account-2';
  end if;
  insert into public.inviti_amici_app(token,created_by,creator_profile_id,claim_profile_id,expires_at)
  values (gen_random_uuid(),v_uid,p_profilo_id,v_claim,v_scade) returning token into v_token;
  return jsonb_build_object('token',v_token::text,'expires_at',v_scade,'trasferisce_andrea',p_trasferisci_andrea,'profilo_destinazione',v_claim);
end;
$$;
revoke all on function public.crea_invito_amico(text,boolean) from public, anon;
grant execute on function public.crea_invito_amico(text,boolean) to authenticated;

create or replace function public.accetta_invito_amico(p_token text, p_profilo_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.inviti_amici_app%rowtype;
  v_creatore_profilo public.profili%rowtype;
  v_destinatario public.profili%rowtype;
  v_uid_vecchio uuid;
  v_scheda text;
begin
  if v_uid is null then raise exception 'Accedi prima di accettare l’invito.'; end if;
  if p_token is null or p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Link di invito non valido.';
  end if;
  select * into v_inv from public.inviti_amici_app i where i.token=p_token::uuid for update;
  if not found then raise exception 'Invito non trovato o già scaduto.'; end if;
  if v_inv.used_at is not null then raise exception 'Questo invito è già stato utilizzato.'; end if;
  if v_inv.expires_at <= now() then raise exception 'Questo invito è scaduto: chiedine uno nuovo.'; end if;
  if v_inv.created_by = v_uid then raise exception 'Non puoi accettare un invito creato dal tuo stesso account.'; end if;
  select * into v_creatore_profilo from public.profili p where p.id=v_inv.creator_profile_id and p.user_id=v_inv.created_by;
  if not found then raise exception 'Il profilo di chi ha invitato non è più disponibile.'; end if;

  if v_inv.claim_profile_id is not null then
    if p_profilo_id <> v_inv.claim_profile_id or v_inv.claim_profile_id <> 'account-2' then
      raise exception 'Questo è il link di trasferimento della scheda storica di Andrea: va aperto con il profilo Andrea.';
    end if;
    select * into v_destinatario from public.profili p
    where p.id=v_inv.claim_profile_id and p.user_id=v_inv.created_by and p.scheda_id='scheda-altro-1' for update;
    if not found then raise exception 'Il profilo storico di Andrea è già stato trasferito o non esiste.'; end if;
    if exists (select 1 from public.sedute s where s.user_id=v_uid and s.stato='in_corso' and coalesce(s.eliminata,false)=false) then
      raise exception 'Termina prima l’allenamento in corso nell’account che riceve il profilo.';
    end if;
    v_uid_vecchio := v_inv.created_by;
    v_scheda := v_destinatario.scheda_id;

    update public.esercizi e set user_id=v_uid,rev=coalesce(e.rev,1)+1,updated_at=now()
    where e.user_id=v_uid_vecchio and e.id in (
      select distinct sr.esercizio_id from public.serie sr join public.sedute s on s.id=sr.seduta_id
      where s.user_id=v_uid_vecchio and s.scheda_id=v_scheda
    ) and e.id not like 'ex-%';
    update public.schede set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where id=v_scheda and user_id=v_uid_vecchio;
    update public.versioni set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where scheda_id=v_scheda and user_id=v_uid_vecchio;
    update public.sedute set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where scheda_id=v_scheda and user_id=v_uid_vecchio;
    update public.serie set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now()
    where seduta_id in (select s.id from public.sedute s where s.scheda_id=v_scheda and s.user_id=v_uid);
    update public.note set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now()
    where user_id=v_uid_vecchio and seduta_id in (select s.id from public.sedute s where s.scheda_id=v_scheda and s.user_id=v_uid);
    update public.missioni set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;
    update public.ricompense set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;
    update public.pesi set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;

    update public.profili set user_id=v_uid,
      amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.creator_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now()
    where id=v_inv.claim_profile_id and user_id=v_uid_vecchio;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.claim_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now()
    where id=v_inv.creator_profile_id and user_id=v_inv.created_by;
    insert into public.amicizie_app(user_id,profile_id,friend_user_id,friend_profile_id) values
      (v_uid,v_inv.claim_profile_id,v_inv.created_by,v_inv.creator_profile_id),
      (v_inv.created_by,v_inv.creator_profile_id,v_uid,v_inv.claim_profile_id)
    on conflict do nothing;
  else
    select * into v_destinatario from public.profili p where p.id=p_profilo_id and p.user_id=v_uid for update;
    if not found then raise exception 'Prima completa la registrazione dell’account e riprova.'; end if;
    if p_profilo_id=v_inv.creator_profile_id then raise exception 'Questo è già il tuo profilo.'; end if;
    insert into public.amicizie_app(user_id,profile_id,friend_user_id,friend_profile_id) values
      (v_uid,p_profilo_id,v_inv.created_by,v_inv.creator_profile_id),
      (v_inv.created_by,v_inv.creator_profile_id,v_uid,p_profilo_id)
    on conflict do nothing;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.creator_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now() where id=p_profilo_id and user_id=v_uid;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(p_profilo_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now() where id=v_inv.creator_profile_id and user_id=v_inv.created_by;
  end if;

  update public.inviti_amici_app set used_at=now(),accepted_by=v_uid,accepted_profile_id=p_profilo_id where token=v_inv.token;
  return jsonb_build_object('ok',true,'profilo',p_profilo_id,'amico',v_inv.creator_profile_id,'trasferito',v_inv.claim_profile_id is not null);
end;
$$;
revoke all on function public.accetta_invito_amico(text,text) from public, anon;
grant execute on function public.accetta_invito_amico(text,text) to authenticated;

drop policy if exists "amici leggono schede condivise" on public.schede;
create policy "amici leggono schede condivise" on public.schede for select to authenticated using (private.amico_puo_leggere_scheda(id,'performance'));
drop policy if exists "amici leggono versioni condivise" on public.versioni;
create policy "amici leggono versioni condivise" on public.versioni for select to authenticated using (private.amico_puo_leggere_scheda(scheda_id,'performance'));
drop policy if exists "amici leggono allenamenti condivisi" on public.sedute;
create policy "amici leggono allenamenti condivisi" on public.sedute for select to authenticated using (private.amico_puo_leggere_scheda(scheda_id,'performance'));
drop policy if exists "amici leggono serie condivise" on public.serie;
create policy "amici leggono serie condivise" on public.serie for select to authenticated using (private.amico_puo_leggere_seduta(seduta_id,'performance'));
drop policy if exists "amici leggono esercizi usati negli allenamenti condivisi" on public.esercizi;
create policy "amici leggono esercizi usati negli allenamenti condivisi" on public.esercizi for select to authenticated using (private.amico_puo_leggere_esercizio(id));
drop policy if exists "amici leggono missioni condivise" on public.missioni;
create policy "amici leggono missioni condivise" on public.missioni for select to authenticated using (private.amico_puo_leggere_account(account_id,'statistiche'));
drop policy if exists "amici leggono ricompense condivise" on public.ricompense;
create policy "amici leggono ricompense condivise" on public.ricompense for select to authenticated using (private.amico_puo_leggere_account(account_id,'statistiche'));

commit;
