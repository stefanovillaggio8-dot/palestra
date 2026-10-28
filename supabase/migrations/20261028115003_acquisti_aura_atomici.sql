-- Compatibile con acquisti esistenti: nessuna riscrittura dei saldi.
create or replace function public.prezzo_oggetto_aura(p_oggetto text)
returns integer language sql immutable security invoker set search_path = '' as $$
  select case p_oggetto
    when 'titolo-cardio' then 1600
    when 'titolo-tecnica' then 2400
    when 'titolo-ego' then 3400
    when 'titolo-riposo' then 3900
    when 'titolo-specchio' then 4800
    when 'titolo-panca' then 2200
    when 'effetto-ambra' then 4500
    when 'effetto-ombra' then 5900
    when 'effetto-fulmine' then 7200
    when 'effetto-nebula' then 8900
    when 'armatura-guerriero-braci' then 9200
    when 'armatura-guerriero-abisso' then 13500
    when 'armatura-assassino-notte' then 9400
    when 'armatura-assassino-spettro' then 13800
    when 'armatura-berserker-rabbia' then 9800
    when 'armatura-berserker-apocalisse' then 14500
    when 'skin-mitica' then 22000
    else null end;
$$;
revoke all on function public.prezzo_oggetto_aura(text) from public, anon;
grant execute on function public.prezzo_oggetto_aura(text) to authenticated;

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
  if new.tipo <> 'spesa_aura' then return new; end if;
  if auth.uid() is null or new.user_id <> auth.uid() or not exists
    (select 1 from public.profili where id=new.account_id and user_id=auth.uid()) then
    raise exception 'Account non autorizzato.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aura-shop:' || new.account_id,0));
  oggetto := split_part(new.fonte, ':', 2);
  prezzo := public.prezzo_oggetto_aura(oggetto);
  if prezzo is null or split_part(new.fonte, ':', 1) <> 'shop' or new.aura <> -prezzo or new.xp <> 0 then
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
revoke all on function public.proteggi_acquisto_aura() from public, anon;
create trigger protezione_acquisti_aura before insert or update or delete on public.ricompense
for each row execute function public.proteggi_acquisto_aura();

create or replace function public.acquista_oggetto_aura(p_account text,p_oggetto text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare acquisto public.ricompense; prezzo integer; fonte_spesa text;
begin
  if auth.uid() is null or not exists(select 1 from public.profili where id=p_account and user_id=auth.uid()) then
    raise exception 'Account non autorizzato.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aura-shop:' || p_account,0));
  select * into acquisto from public.ricompense where account_id=p_account and user_id=auth.uid()
    and tipo='spesa_aura' and split_part(fonte,':',2)=p_oggetto order by created_at,id limit 1;
  if found then return jsonb_build_object('acquistato',false,'spesa',to_jsonb(acquisto)); end if;
  prezzo := public.prezzo_oggetto_aura(p_oggetto);
  if prezzo is null then raise exception 'Oggetto non valido.'; end if;
  fonte_spesa := 'shop:' || p_oggetto || ':' || p_account;
  insert into public.ricompense(id,user_id,account_id,tipo,fonte,aura,xp,dettaglio,quando,rev,device_id)
    values('spesa-' || fonte_spesa,auth.uid(),p_account,'spesa_aura',fonte_spesa,-prezzo,0,'Aura Shop: ' || p_oggetto,current_date,1,'shop-server')
    returning * into acquisto;
  return jsonb_build_object('acquistato',true,'spesa',to_jsonb(acquisto));
end;
$$;
revoke all on function public.acquista_oggetto_aura(text,text) from public, anon;
grant execute on function public.acquista_oggetto_aura(text,text) to authenticated;
