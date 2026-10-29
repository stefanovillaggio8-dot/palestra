-- Test indipendenti: nessuna scrittura nelle tabelle dell'utente.
-- Eseguire con la migration 20261029113000_shop_aura_streak_attuale.sql presente.
do $$
declare n int;
begin
  -- Con calendario Mar/Mer/Ven/Sab (2,3,5,6), il riposo non azzera.
  select public.conta_streak_corrente_shop(
    array[date '2026-10-20',date '2026-10-21',date '2026-10-23',date '2026-10-24'],
    array[2,3,5,6],date '2026-10-25') into n;
  if n<>4 then raise exception 'Riposo non deve resettare: %',n; end if;
  -- Lunedì 26 non scelto, martedì 27 saltato: azzera mercoledì.
  select public.conta_streak_corrente_shop(
    array[date '2026-10-20',date '2026-10-21',date '2026-10-23',date '2026-10-24'],
    array[2,3,5,6],date '2026-10-28') into n;
  if n<>0 then raise exception 'Giorno previsto saltato deve azzerare: %',n; end if;
  -- Recupera senza riprendere il record passato.
  select public.conta_streak_corrente_shop(
    array[date '2026-10-20',date '2026-10-21',date '2026-10-23',date '2026-10-24',date '2026-10-28'],
    array[2,3,5,6],date '2026-10-29') into n;
  if n<>1 then raise exception 'Ripartenza deve valere uno: %',n; end if;
  -- Oggi previsto ma non ancora finito NON interrompe.
  select public.conta_streak_corrente_shop(
    array[date '2026-10-27'],array[2,3],date '2026-10-28') into n;
  if n<>1 then raise exception 'Oggi non deve azzerare: %',n; end if;
  -- Senza calendario: oggi/ieri e reset dopo il secondo giorno.
  select public.conta_streak_corrente_shop(
    array[date '2026-10-26',date '2026-10-27'],null,date '2026-10-28') into n;
  if n<>2 then raise exception 'Giorni senza calendario devono essere consecutivi: %',n; end if;
  select public.conta_streak_corrente_shop(
    array[date '2026-10-26',date '2026-10-27'],null,date '2026-10-29') into n;
  if n<>0 then raise exception 'Senza calendario deve azzerare dopo giorno saltato: %',n; end if;
end $$;
