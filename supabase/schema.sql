-- schema.sql -- database dell'app Palestra su Supabase (PostgreSQL).
-- Esecutalo una volta sola nel SQL Editor di Supabase.
--
-- Due cose importanti:
--  1) I pesi e le ripetizioni sono numeric(6,2): 7,5 resta 7,5, niente arrotondi.
--  2) Ogni tabella ha le regole di sicurezza (RLS) che permettono a un utente
--     di vedere e modificare SOLO le proprie righe. Anche se qualcuno crea un
--     account sullo stesso progetto, di te non vede niente.

begin;

create table if not exists public.esercizi (
  id              text primary key,
  user_id         uuid not null references auth.users on delete cascade,
  nome            text not null,
  gruppo          text,
  convenzione     text not null default 'altro',
  foto            text,
  nota_permanente text default '',
  tipo            text default 'standard',
  eliminata       boolean not null default false,
  eliminata_il    timestamptz,
  rev             integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  device_id       text
);

create table if not exists public.schede (
  id                text primary key,
  user_id           uuid not null references auth.users on delete cascade,
  nome              text not null,
  versione_corrente text,
  eliminata         boolean not null default false,
  rev               integer not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  device_id         text
);

-- Ogni versione e' uno "scatto" immutabile della scheda. Le sedute vecchie
-- continuano a puntare alla loro versione, quindi modificare la scheda non
-- cambia mai lo storico.
create table if not exists public.versi (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  scheda_id  text not null,
  numero     integer not null,
  snapshot   jsonb not null,
  nota       text default '',
  rev        integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  device_id  text
);

create table if not exists public.sedute (
  id              text primary key,
  user_id         uuid not null references auth.users on delete cascade,
  scheda_id       text,
  versione_id     text,
  giorno_id       text,
  nome_giorno     text,
  data            date,
  ora_inizio      timestamptz,
  ora_fine        timestamptz,
  durata_secondi  integer,
  stato           text not null default 'in_corso',
  note            text default '',
  eliminata       boolean not null default false,
  rev             integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  device_id       text
);

create table if not exists public.serie (
  id                 text primary key,
  user_id            uuid not null references auth.users on delete cascade,
  seduta_id          text not null,
  esercizio_id       text not null,
  ordine             integer not null default 1,
  peso               numeric(6,2),
  peso_assistenza    numeric(6,2),
  ripetizioni        numeric(6,2),
  spotter            boolean not null default false,
  rip_assistite      numeric(6,2),
  dropset            boolean not null default false,
  giri_extra         jsonb default '[]'::jsonb,
  stato              text default 'da_fare',
  nota               text default '',
  eliminata          boolean not null default false,
  rev                integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  device_id          text
);

create table if not exists public.note (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  livello      text not null,
  esercizio_id text,
  seduta_id    text,
  serie_id     text,
  testo        text default '',
  eliminata    boolean not null default false,
  rev          integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  device_id    text
);

-- indici per le query piu' frequenti
create index if not exists sedute_giorno  on public.sedute (user_id, giorno_id);
create index if not exists sedute_data    on public.sedute (user_id, data desc);
create index if not exists sedute_stato   on public.sedute (user_id, stato);
create index if not exists serie_seduta   on public.serie (user_id, seduta_id);
create index if not exists serie_esercizio on public.serie (user_id, esercizio_id);
create index if not exists note_esercizio on public.note (user_id, esercizio_id);
create index if not exists note_seduta   on public.note (user_id, seduta_id);
create index if not exists versioni_scheda on public.versi (user_id, scheda_id);

-- regola che Ste ha chiesto: una sola seduta attiva per volta, garantita dal
-- database e non solo dall'app.
create unique index if not exists una_seduta_in_corso
  on public.sedute (user_id) where stato = 'in_corso' and eliminata = false;

-- sicurezza: via a tutti, accendiamo le regole una per una
alter table public.esercizi enable row level security;
alter table public.schede  enable row level security;
alter table public.versi    enable row level security;
alter table public.sedute   enable row level security;
alter table public.serie    enable row level security;
alter table public.note     enable row level security;

drop policy if exists "propri esercizi" on public.esercizi;
create policy "propri esercizi" on public.esercizi
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "propri schede" on public.schede;
create policy "propri schede" on public.schede
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "propri versioni" on public.versi;
create policy "propri versioni" on public.versi
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "propri sedute" on public.sedute;
create policy "propri sedute" on public.sedute
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "propri serie" on public.serie;
create policy "propri serie" on public.serie
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "propri note" on public.note;
create policy "propri note" on public.note
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- IL GIOCO: profili, esercizi globali, missioni e ricompense.
-- ============================================================================

-- Chi puo' scrivere gli esercizi globali? Solo chi sta in questa tabella.
-- Il frontend non puo' scriverci (le regole sotto lo controllano), quindi un
-- utente normale non puo' creare esercizi per gli altri, anche se prova.
create table if not exists public.amministratori (
  email    text primary key,
  attivo   boolean not null default true,
  creato_il timestamptz default now()
);

-- Il profilo di ogni account: username, avatar, privacy, amici.
-- L'avatar si salva come ID (non come immagine): cosi' si vede uguale su
-- ogni dispositivo e si puo' aggiungere un avatar nuovo senza toccare i dati.
create table if not exists public.profili (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  username      text not null default '',
  avatar_id     text not null default 'vuoto',
  amministratore boolean not null default false,
  amici         jsonb not null default '[]'::jsonb,
  privacy       jsonb not null default '{"profilo":"pubblico","performance":"pubblico","leaderboard":"pubblico","statistiche":"pubblico"}'::jsonb,
  colore        text default '#7c5cff',
  rev           integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  device_id     text
);

-- Gli esercizi creati dall'amministratore valgono per TUTTI: non hanno
-- user_id perche' non appartengono a un account solo.
create table if not exists public.esercizi_globali (
  id            text primary key,
  nome          text not null,
  gruppo        text,
  convenzione   text not null default 'macchina',
  misura        text not null default 'kg_reps',
  foto          text,
  nota_permanente text default '',
  riferimento   numeric(8,2),
  soglie_rank   jsonb,
  creato_da     uuid,
  creato_il     timestamptz not null default now(),
  rev           integer not null default 1,
  updated_at    timestamptz not null default now(),
  device_id     text
);

-- Le missioni completate. Una riga per missione e per utente e per giorno
-- (o per settimana): la chiave primaria impedisce fisicamente i punti doppi.
create table if not exists public.missioni (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  account_id    text not null,
  missione_id   text not null,
  categoria     text not null,           -- daily | weekly | secret
  titolo        text default '',
  difficolta    text default 'easy',
  data          date,
  settimana     text,                    -- es. 2026-W40
  aura          integer not null default 0,
  xp            integer not null default 0,
  rivelata      boolean not null default false,
  completata_il timestamptz,
  rev           integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  device_id     text
);

-- Il registro delle ricompense: da qui nascono Aura, XP e livello.
-- E' solo in append: nessuna riga viene mai modificata o cancellata.
create table if not exists public.ricompense (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  account_id    text not null,
  tipo          text not null,           -- allenamento | record | promozione | missione | traguardo
  fonte         text,
  aura          integer not null default 0,
  xp            integer not null default 0,
  dettaglio     text default '',
  quando        date,
  rev           integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  device_id     text
);

create index if not exists missioni_account   on public.missioni (account_id, categoria);
create index if not exists missioni_settimana on public.missioni (settimana);
create index if not exists ricompense_account on public.ricompense (account_id, tipo);

-- il tetto alle ricompense: una sola riga per tipo e fonte, cosi' un utente
-- non puo' gonfiare la propria Aura scrivendo la stessa ricompensa due volte
create unique index if not exists ricompense_unica
  on public.ricompense (account_id, tipo, coalesce(fonte, ''));
create unique index if not exists missioni_unica
  on public.missioni (account_id, missione_id, categoria, coalesce(data::text, ''), coalesce(settimana, ''));

alter table public.amministratori enable row level security;
alter table public.profili         enable row level security;
alter table public.esercizi_globali enable row level security;
alter table public.missioni        enable row level security;
alter table public.ricompense      enable row level security;

-- ---------- le regole: cosa puo' fare ciascuno ----------

-- un utente vede e tocca SOLO il proprio profilo
drop policy if exists "propri profili" on public.profili;
create policy "propri profili" on public.profili
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- gli esercizi globali si leggono da tutti (servono a tutti) ma si scrivono
-- SOLO dall'amministratore: un utente normale non puo' creare un esercizio
-- per gli altri neanche se modifica la richiesta a mano.
drop policy if exists "leggere gli esercizi globali" on public.esercizi_globali;
create policy "leggere gli esercizi globali" on public.esercizi_globali
  for select using (true);

drop policy if exists "scrivere gli esercizi globali" on public.esercizi_globali;
create policy "scrivere gli esercizi globali" on public.esercizi_globali
  for all using (
    exists (select 1 from public.amministratori a
            where lower(a.email) = lower(auth.jwt() ->> 'email') and a.attivo)
  ) with check (
    exists (select 1 from public.amministratori a
            where lower(a.email) = lower(auth.jwt() ->> 'email') and a.attivo)
  );

-- missioni e ricompense: sono come i dati degli allenamenti, solo dell'utente.
-- Nessuno puo' scrivere i dati di un altro, quindi non puo' comprare rank,
-- LP, Aura o streak finto.
drop policy if exists "proprie missioni" on public.missioni;
create policy "proprie missioni" on public.missioni
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "proprie ricompense" on public.ricompense;
create policy "proprie ricompense" on public.ricompense
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOTA su rank, LP, Aura, streak e record: NON sono colonne scritte a mano.
-- Vengono calcolati dai dati (serie, sedute, missioni, ricompense) con le
-- regole di rank.js / streak.js / aura.js. Quindi non esiste una colonna che
-- un utente possa cambiare per farsi dare un rank: il massimo che potrebbe
-- fare e' allenarsi davvero.

commit;

-- Riepilogo dei limiti del piano gratuito che ti servono:
--   * 500 MB di database (per te ci stai dentro mille volte)
--   * 2 progetti gratuiti
--   * il progetto viene PAUSATO dopo 7 giorni di inattivita':
--     i dati restano, si riattiva dal pannello. Con l'app aperta almeno una
--     volta alla settimana non succede mai.
--
-- Per rendere Stefano amministratore (una volta sola, nel SQL Editor):
--   insert into public.amministratori (email) values ('LA_TUA_EMAIL');
--
-- Come si aggiunge un rank nuovo, una soglia, un avatar o una missione:
--   NULLA nel database: stanno in src/rank-config.js, src/avatar.js e
--   src/missioni.js. Si cambia un file e la nuova regola vale per tutti.
