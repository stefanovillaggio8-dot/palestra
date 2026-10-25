-- Migrazione sicura: consente a utenti diversi di avere lo stesso ID locale.
-- Prima le tabelle avevano PRIMARY KEY(id), globale per tutto il progetto.
-- Con RLS, un UPSERT su un ID già appartenente a un altro utente falliva con
-- "new row violates row-level security policy" anche se user_id era corretto.
-- Non elimina né modifica righe: cambia solo i vincoli di unicità.
begin;

DO $$
DECLARE
  tabella text;
  chiave_primaria text;
BEGIN
  FOREACH tabella IN ARRAY ARRAY[
    'esercizi', 'schede', 'versi', 'sedute', 'serie', 'note',
    'profili', 'missioni', 'ricompense', 'pesi'
  ] LOOP
    SELECT conname INTO chiave_primaria
    FROM pg_constraint
    WHERE conrelid = format('public.%I', tabella)::regclass
      AND contype = 'p';

    IF chiave_primaria IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tabella, chiave_primaria);
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      tabella, tabella || '_user_id_id_key'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (user_id, id)',
      tabella, tabella || '_user_id_id_key'
    );
  END LOOP;
END $;

-- Anche gli indici di deduplicazione devono essere isolati per utente:
-- account_id è un ID locale (es. account-1), quindi si ripete tra account Supabase.
DROP INDEX IF EXISTS public.ricompense_unica;
CREATE UNIQUE INDEX ricompense_unica
  ON public.ricompense (user_id, account_id, tipo, coalesce(fonte, ''));

DROP INDEX IF EXISTS public.missioni_unica;
CREATE UNIQUE INDEX missioni_unica
  ON public.missioni (user_id, account_id, missione_id, categoria, coalesce(data::text, ''), coalesce(settimana, ''));

commit;
