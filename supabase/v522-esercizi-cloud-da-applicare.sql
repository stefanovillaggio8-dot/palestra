-- Patch v522 da applicare al progetto Palestra quando Supabase autorizza
-- la migrazione. Non eseguita automaticamente da GitHub Pages.
-- La tabella legacy public.versi NON va eliminata: la produzione usa versioni.
begin;

alter table public.esercizi
  add column if not exists configurazione jsonb not null default '{}'::jsonb;
alter table public.esercizi_globali
  add column if not exists configurazione jsonb not null default '{}'::jsonb;

-- Ogni utente autenticato vede solo la propria riga, se autorizzata.
-- Il flag amministratore del profilo pubblico non e' una credenziale.
drop policy if exists "amministratori vedono solo se stessi" on public.amministratori;
create policy "amministratori vedono solo se stessi" on public.amministratori
  for select to authenticated
  using (attivo and auth.uid() is not null
    and lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "scrivere gli esercizi globali" on public.esercizi_globali;
create policy "scrivere gli esercizi globali" on public.esercizi_globali
  for all to authenticated
  using (auth.uid() is not null and exists (
    select 1 from public.amministratori a
    where lower(a.email) = lower((select auth.jwt() ->> 'email')) and a.attivo
  ))
  with check (auth.uid() is not null and exists (
    select 1 from public.amministratori a
    where lower(a.email) = lower((select auth.jwt() ->> 'email')) and a.attivo
  ));

commit;

-- Una volta verificata l'identita' del proprietario su auth.users e profili,
-- abilitare ESCLUSIVAMENTE il suo indirizzo in public.amministratori.
-- Non derivare l'abilitazione dal campo profili.amministratore: e' modificabile
-- dal client e non costituisce una prova di autorizzazione.
