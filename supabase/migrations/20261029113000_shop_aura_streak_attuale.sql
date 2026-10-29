-- Aura Shop: solo la Streak attuale permette NUOVI acquisti.
-- Il record storico e gli oggetti già acquistati non vengono modificati.
-- Il calcolo server usa il fuso Europe/Rome, i giorni di allenamento previsti
-- e la scheda/versioni storiche già usati da record_streak_shop.
-- Questa funzione pura rende verificabili i casi di calendario senza toccare dati.
create or replace function public.conta_streak_corrente_shop(
  p_date date[], p_previsti integer[], p_oggi date
) returns integer language plpgsql immutable security invoker
set search_path = '' as $$
declare
  allenamenti date[];
  ultimo date;
  primo date;
  g date;
  totale integer := 0;
  con_calendario boolean := coalesce(array_length(p_previsti,1),0) > 0;
begin
  if p_oggi is null then return 0; end if;
  select array_agg(distinct x.g order by x.g)
    into allenamenti
    from unnest(coalesce(p_date, array[]::date[])) x(g)
    where x.g <= p_oggi;
  if coalesce(array_length(allenamenti,1),0)=0 then return 0; end if;
  ultimo := allenamenti[array_length(allenamenti,1)];
  primo := allenamenti[1];

  if not con_calendario then
    -- Senza giorni scelti: deve aver allenato oggi o ieri.
    if ultimo < p_oggi-1 then return 0; end if;
  else
    -- OGGI non è un giorno perso, anche quando è un giorno previsto.
    -- Basta un solo giorno previsto mancato tra ultimo allenamento e ieri.
    for g in select dates.d::date from pg_catalog.generate_series(
      ultimo+1, p_oggi-1, interval '1 day'
    ) as dates(d) loop
      if extract(dow from g)::integer = any(p_previsti)
        and not (g = any(allenamenti)) then
        return 0;
      end if;
    end loop;
  end if;

  g := ultimo;
  while g >= primo loop
    if g = any(allenamenti) then
      totale := totale+1;
    elsif not con_calendario
      or extract(dow from g)::integer=any(p_previsti) then
      exit;
    end if;
    g := g-1;
  end loop;
  return totale;
end;
$$;
revoke all on function public.conta_streak_corrente_shop(date[],integer[],date) from public,anon;
grant execute on function public.conta_streak_corrente_shop(date[],integer[],date) to authenticated;

create or replace function public.streak_attuale_shop(p_account text)
returns integer language plpgsql stable security invoker
set search_path = '' as $$
declare
  p public.profili;
  previsti integer[];
  allenamenti date[];
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  select * into p from public.profili
    where id=p_account and user_id=auth.uid();
  if not found then raise exception 'Account non autorizzato.'; end if;

  select array_agg(distinct x.v::integer)
    into previsti
    from jsonb_array_elements_text(
      case when jsonb_typeof(p.giorni_allenamento)='array'
        then p.giorni_allenamento else '[]'::jsonb end
    ) as x(v)
    where x.v ~ '^[0-6]$';

  select array_agg(distinct s.data order by s.data)
    into allenamenti
    from public.sedute s
    where s.user_id=auth.uid()
      and s.stato='completata'
      and not coalesce(s.eliminata,false)
      and s.data <= oggi
      and (s.scheda_id=p.scheda_id or
        (s.scheda_id is null and exists (
          select 1 from public.versioni v
          where v.id=s.versione_id and v.scheda_id=p.scheda_id
            and v.user_id=auth.uid()
        )));
  return public.conta_streak_corrente_shop(allenamenti,previsti,oggi);
end;
$$;
revoke all on function public.streak_attuale_shop(text) from public,anon;
grant execute on function public.streak_attuale_shop(text) to authenticated;

-- Il trigger esistente rimane sul database; sostituiamo solo la sua logica
-- di validazione. Restano immutati controllo classe, saldo, prezzi,
-- idempotenza e proprietà delle spese passate.
create or replace function public.verifica_requisiti_skin()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare oggetto text; richiesto integer; classe text;
begin
  if new.tipo is distinct from 'spesa_aura' then return new; end if;
  if exists(select 1 from public.ricompense where id=new.id) then return new; end if;
  oggetto := split_part(new.fonte,':',2);
  richiesto := case oggetto
    when 'armatura-guerriero-braci' then 15 when 'armatura-guerriero-abisso' then 50
    when 'armatura-assassino-notte' then 15 when 'armatura-assassino-spettro' then 50
    when 'armatura-berserker-rabbia' then 15 when 'armatura-berserker-apocalisse' then 50
    when 'skin-mitica' then 80 else 0 end;
  if richiesto=0 then return new; end if;
  if public.streak_attuale_shop(new.account_id) < richiesto then
    raise exception 'Streak attuale insufficiente: servono % allenamenti consecutivi.',richiesto;
  end if;
  if oggetto like 'armatura-%' then
    select classe_rpg into classe from public.profili
      where id=new.account_id and user_id=auth.uid();
    if classe is distinct from split_part(oggetto,'-',2) then
      raise exception 'Skin incompatibile con la tua classe.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.verifica_requisiti_skin() from public,anon;
