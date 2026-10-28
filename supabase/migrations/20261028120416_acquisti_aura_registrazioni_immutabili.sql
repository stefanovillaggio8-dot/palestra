create or replace function public.proteggi_acquisto_aura()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare prezzo integer; oggetto text; saldo bigint;
begin
  if TG_OP = 'DELETE' then
    if old.tipo = 'spesa_aura' then raise exception 'Gli acquisti restano nell inventario.'; end if;
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
  if prezzo is null or split_part(new.fonte, ':', 1) <> 'shop' or new.aura is distinct from -prezzo or new.xp is distinct from 0 then
    raise exception 'Oggetto o prezzo non valido.';
  end if;
  -- Consente il normale upsert della stessa spesa, anche se il saldo è sceso.
  if exists (select 1 from public.ricompense r where r.id=new.id and
    (r.user_id,r.account_id,r.tipo,r.fonte,r.aura,r.xp) is not distinct from
    (new.user_id,new.account_id,new.tipo,new.fonte,new.aura,new.xp)) then return new; end if;
  if exists (select 1 from public.ricompense r where r.account_id=new.account_id and r.tipo='spesa_aura'
    and split_part(r.fonte, ':', 2)=oggetto) then raise exception 'Oggetto già acquistato.'; end if;
  select coalesce(sum(aura),0) into saldo from public.ricompense where account_id=new.account_id and user_id=auth.uid();
  if saldo < prezzo then raise exception 'Non hai abbastanza Aura.'; end if;
  return new;
end;
$$;
