-- Solo funzioni e trigger: nessuna riscrittura di saldi, acquisti o progressi.
create or replace function public.record_streak_shop(p_account text)
returns integer language plpgsql stable security invoker set search_path = '' as $$
declare p public.profili; giorni integer[]; d date; precedente date; n integer := 0; massimo integer := 0; interrotto boolean;
begin
  select * into p from public.profili where id=p_account and user_id=auth.uid();
  if not found then raise exception 'Account non autorizzato.'; end if;
  select array_agg(distinct v::integer) into giorni from jsonb_array_elements_text(
    case when jsonb_typeof(p.giorni_allenamento)='array' then p.giorni_allenamento else '[]'::jsonb end
  ) t(v) where v ~ '^[0-6]$';
  -- Stessa sorgente di calcolaStreak: sedute della scheda e versioni storiche.
  for d in select distinct s.data from public.sedute s
    where s.user_id=auth.uid() and s.stato='completata' and not coalesce(s.eliminata,false)
      and s.data <= (now() at time zone 'Europe/Rome')::date
      and (s.scheda_id=p.scheda_id or (s.scheda_id is null and exists (
        select 1 from public.versioni v where v.id=s.versione_id and v.scheda_id=p.scheda_id and v.user_id=auth.uid())))
    order by s.data
  loop
    interrotto := false;
    if precedente is not null then
      if giorni is null then interrotto := d-precedente > 1;
      else
        select exists(select 1 from generate_series(1,least(d-precedente-1,7)) gap
          where extract(dow from precedente+gap)::integer=any(giorni)) into interrotto;
      end if;
    end if;
    n := case when interrotto then 1 else n+1 end;
    massimo := greatest(massimo,n); precedente := d;
  end loop;
  return massimo;
end;
$$;
revoke all on function public.record_streak_shop(text) from public,anon;
grant execute on function public.record_streak_shop(text) to authenticated;

create or replace function public.verifica_requisiti_skin()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare oggetto text; richiesto integer; classe text;
begin
  if new.tipo is distinct from 'spesa_aura' then return new; end if;
  -- Le registrazioni preesistenti restano valide: l'altro trigger ne protegge i valori.
  if exists(select 1 from public.ricompense where id=new.id) then return new; end if;
  oggetto := split_part(new.fonte,':',2);
  richiesto := case oggetto
    when 'armatura-guerriero-braci' then 15 when 'armatura-guerriero-abisso' then 50
    when 'armatura-assassino-notte' then 15 when 'armatura-assassino-spettro' then 50
    when 'armatura-berserker-rabbia' then 15 when 'armatura-berserker-apocalisse' then 50
    when 'skin-mitica' then 80 else 0 end;
  if richiesto=0 then return new; end if;
  if public.record_streak_shop(new.account_id) < richiesto then
    raise exception 'Record di Streak insufficiente: servono % giorni.',richiesto;
  end if;
  if oggetto like 'armatura-%' then
    select classe_rpg into classe from public.profili where id=new.account_id and user_id=auth.uid();
    if classe is distinct from split_part(oggetto,'-',2) then raise exception 'Skin incompatibile con la tua classe.'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.verifica_requisiti_skin() from public,anon;
create trigger requisiti_skin_aura before insert on public.ricompense
for each row execute function public.verifica_requisiti_skin();
