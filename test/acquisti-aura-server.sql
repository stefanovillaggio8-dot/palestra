begin;
insert into auth.users(id) values('00000000-0000-4000-8000-00000000a328');
insert into public.profili(id,user_id,username) values('test-shop-v328','00000000-0000-4000-8000-00000000a328','Test rollback');
insert into public.ricompense(id,user_id,account_id,tipo,fonte,aura,xp) values('test-credito-v328','00000000-0000-4000-8000-00000000a328','test-shop-v328','test','test',3000,0);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000a328',true);
do $$
declare a jsonb; b jsonb; saldo bigint;
begin
a := public.acquista_oggetto_aura('test-shop-v328','titolo-cardio');
b := public.acquista_oggetto_aura('test-shop-v328','titolo-cardio');
if not (a->>'acquistato')::boolean or (b->>'acquistato')::boolean then raise exception 'Idempotenza fallita'; end if;
begin perform public.acquista_oggetto_aura('test-shop-v328','titolo-tecnica'); raise exception 'TEST: saldo insufficiente accettato';
exception when others then if SQLERRM <> 'Non hai abbastanza Aura.' then raise; end if; end;
begin perform public.acquista_oggetto_aura('altro','titolo-cardio'); raise exception 'TEST: account altrui accettato';
exception when others then if SQLERRM <> 'Account non autorizzato.' then raise; end if; end;
begin delete from public.ricompense where id=a->'spesa'->>'id'; raise exception 'TEST: acquisto eliminato';
exception when others then if SQLERRM <> 'Gli acquisti restano nell inventario.' then raise; end if; end;
begin update public.ricompense set aura=0 where id=a->'spesa'->>'id'; raise exception 'TEST: acquisto modificato';
exception when others then if SQLERRM <> 'Un acquisto salvato non può essere modificato.' then raise; end if; end;
begin update public.ricompense set tipo='spesa_aura',fonte='shop:titolo-panca:test',aura=-2200 where id='test-credito-v328'; raise exception 'TEST: credito trasformato';
exception when others then if SQLERRM <> 'Un acquisto richiede una nuova registrazione.' then raise; end if; end;
select sum(aura) into saldo from public.ricompense where account_id='test-shop-v328';
if saldo<>1400 then raise exception 'TEST: saldo errato'; end if;
end $$;
select sum(aura) saldo, count(*) filter(where tipo='spesa_aura') acquisti from public.ricompense where account_id='test-shop-v328';
rollback;
