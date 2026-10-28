-- Eseguire in transazione con rollback, dopo docs/requisiti-skin.sql.
-- Usa soltanto un account sintetico creato nella stessa transazione.
insert into auth.users(id) values('00000000-0000-4000-8000-00000000a329');
insert into public.profili(id,user_id,username,scheda_id,classe_rpg) values('test-skin-v329','00000000-0000-4000-8000-00000000a329','Test skin rollback','test-skin-scheda','guerriero');
insert into public.ricompense(id,user_id,account_id,tipo,fonte,aura,xp) values('test-skin-credito','00000000-0000-4000-8000-00000000a329','test-skin-v329','test','test',200000,0);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000a329',true);
do $$
declare o text; soglia integer; a jsonb; saldo bigint;
begin
  for o,soglia in select * from (values
    ('armatura-guerriero-braci',15),('armatura-guerriero-abisso',50),
    ('armatura-assassino-notte',15),('armatura-assassino-spettro',50),
    ('armatura-berserker-rabbia',15),('armatura-berserker-apocalisse',50),('skin-mitica',80)) t(id,n)
  loop
    delete from public.sedute where user_id=auth.uid();
    update public.profili set classe_rpg=case when o='skin-mitica' then 'guerriero' else split_part(o,'-',2) end where id='test-skin-v329';
    insert into public.sedute(id,user_id,scheda_id,data,stato)
      select 'skin-seduta-'||i,auth.uid(),'test-skin-scheda',date '2025-01-01'+i-1,'completata' from generate_series(1,soglia-1) i;
    if public.record_streak_shop('test-skin-v329')<>soglia-1 then raise exception 'TEST: record errato'; end if;
    begin
      perform public.acquista_oggetto_aura('test-skin-v329',o);
      raise exception 'TEST: acquisto sotto soglia accettato';
    exception when others then
      if SQLERRM not like 'Record di Streak insufficiente:%' then raise; end if;
    end;
    -- Anche INSERT diretto deve passare dal requisito, senza dipendere dalla UI/RPC.
    begin
      insert into public.ricompense(id,user_id,account_id,tipo,fonte,aura,xp)
        values('bypass-'||o,auth.uid(),'test-skin-v329','spesa_aura','shop:'||o||':test-skin-v329',-public.prezzo_oggetto_aura(o),0);
      raise exception 'TEST: bypass accettato';
    exception when others then
      if SQLERRM not like 'Record di Streak insufficiente:%' then raise; end if;
    end;
    insert into public.sedute(id,user_id,scheda_id,data,stato) values('skin-soglia',auth.uid(),'test-skin-scheda',date '2025-01-01'+soglia-1,'completata');
    a := public.acquista_oggetto_aura('test-skin-v329',o);
    if not (a->>'acquistato')::boolean then raise exception 'TEST: soglia valida rifiutata'; end if;
    select sum(aura) into saldo from public.ricompense where account_id='test-skin-v329';
    delete from public.sedute where user_id=auth.uid();
    -- Nessun requisito retroattivo e nessun secondo addebito.
    a := public.acquista_oggetto_aura('test-skin-v329',o);
    if (a->>'acquistato')::boolean then raise exception 'TEST: acquisto ripetuto'; end if;
    if saldo <> (select sum(aura) from public.ricompense where account_id='test-skin-v329') then raise exception 'TEST: saldo retroattivo'; end if;
    insert into public.ricompense select * from public.ricompense where id=a->'spesa'->>'id' on conflict(id) do update set rev=public.ricompense.rev+1;
  end loop;
end $$;
select 'Sette soglie, bypass diretto, idempotenza e proprietà: OK' as risultato;

do $$
begin
  update public.profili set giorni_allenamento='[1,5]'::jsonb where id='test-skin-v329';
  insert into public.sedute(id,user_id,scheda_id,data,stato) values
    ('cal-lun',auth.uid(),'test-skin-scheda','2025-01-06','completata'),
    ('cal-mer',auth.uid(),'test-skin-scheda','2025-01-08','completata'),
    ('cal-ven',auth.uid(),'test-skin-scheda','2025-01-10','completata'),
    ('cal-salto',auth.uid(),'test-skin-scheda','2025-01-17','completata'),
    ('cal-altra',auth.uid(),'altra-scheda','2025-01-13','completata');
  if public.record_streak_shop('test-skin-v329')<>3 then raise exception 'TEST: riposo, extra o isolamento scheda errato'; end if;
  update public.profili set giorni_allenamento=null where id='test-skin-v329';
  if public.record_streak_shop('test-skin-v329')<>1 then raise exception 'TEST: calendario senza programma errato'; end if;
end $$;
select 'Calendario e isolamento scheda: OK' as risultato;
