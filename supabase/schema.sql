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

commit;

-- Riepilogo dei limiti del piano gratuito che ti servono:
--   * 500 MB di database (per te ci stai dentro mille volte)
--   * 2 progetti gratuiti
--   * il progetto viene PAUSATO dopo 7 giorni di inattivita':
--     i dati restano, si riattiva dal pannello. Con l'app aperta almeno una
--     volta alla settimana non succede mai.
