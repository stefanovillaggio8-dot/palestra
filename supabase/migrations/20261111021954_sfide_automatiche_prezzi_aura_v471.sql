-- Migrazione v471 applicata su Supabase palestra il 2026-11-11.
-- Adegua il listino e esclude i premi nel cestino dal saldo spendibile.
-- Non modifica alcuna riga storica, nessun acquisto, Rank o profilo.

CREATE OR REPLACE FUNCTION public.prezzo_oggetto_aura(p_oggetto text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_oggetto
    when 'titolo-cardio' then 600
    when 'titolo-tecnica' then 900
    when 'titolo-ego' then 1200
    when 'titolo-riposo' then 1400
    when 'titolo-specchio' then 1800
    when 'titolo-panca' then 800
    when 'effetto-ambra' then 2000
    when 'effetto-ombra' then 2600
    when 'effetto-fulmine' then 3300
    when 'effetto-nebula' then 4200
    when 'armatura-guerriero-braci' then 5000
    when 'armatura-guerriero-abisso' then 8000
    when 'armatura-assassino-notte' then 5100
    when 'armatura-assassino-spettro' then 8400
    when 'armatura-berserker-rabbia' then 5300
    when 'armatura-berserker-apocalisse' then 8800
    when 'skin-mitica' then 14000
    else null
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.proteggi_acquisto_aura()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare prezzo integer; oggetto text; saldo bigint;
begin
  if TG_OP = 'DELETE' then
    if old.tipo = 'spesa_aura' then
      raise exception 'Gli acquisti restano nell inventario.';
    end if;
    return old;
  end if;
  if TG_OP = 'UPDATE' and old.tipo = 'spesa_aura' then
    if (new.id,new.user_id,new.account_id,new.tipo,new.fonte,new.aura,new.xp)
      is distinct from (old.id,old.user_id,old.account_id,old.tipo,old.fonte,old.aura,old.xp) then
      raise exception 'Un acquisto salvato non può essere modificato.';
    end if;
    return new;
  end if;
  if new.tipo is distinct from 'spesa_aura' then return new; end if;
  if TG_OP = 'UPDATE' then raise exception 'Un acquisto richiede una nuova registrazione.'; end if;
  if auth.uid() is null or new.user_id is distinct from auth.uid() or not exists
    (select 1 from public.profili where id=new.account_id and user_id=auth.uid()) then
    raise exception 'Account non autorizzato.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aura-shop:' || new.account_id,0));
  oggetto := split_part(new.fonte, ':', 2);
  prezzo := public.prezzo_oggetto_aura(oggetto);
  if prezzo is null or split_part(new.fonte, ':', 1) <> 'shop'
    or new.aura is distinct from -prezzo or new.xp is distinct from 0 then
    raise exception 'Oggetto o prezzo non valido.';
  end if;
  if exists (select 1 from public.ricompense r where r.id=new.id and
    (r.user_id,r.account_id,r.tipo,r.fonte,r.aura,r.xp) is not distinct from
    (new.user_id,new.account_id,new.tipo,new.fonte,new.aura,new.xp)) then return new; end if;
  if exists (select 1 from public.ricompense r where r.account_id=new.account_id
    and r.tipo='spesa_aura' and split_part(r.fonte, ':', 2)=oggetto) then
    raise exception 'Oggetto già acquistato.';
  end if;
  select coalesce(sum(aura),0) into saldo from public.ricompense
    where account_id=new.account_id and user_id=auth.uid()
      and not coalesce(eliminata,false);
  if saldo < prezzo then raise exception 'Non hai abbastanza Aura.'; end if;
  return new;
end;
$function$
;

revoke all on function public.prezzo_oggetto_aura(text) from public, anon;
grant execute on function public.prezzo_oggetto_aura(text) to authenticated;
