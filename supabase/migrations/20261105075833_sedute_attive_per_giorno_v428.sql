-- Non alterare o cancellare allenamenti esistenti.
-- Ogni utente puo' avere una sola seduta aperta per scheda e giorno.
-- Una seduta incompleta dei giorni scorsi non deve impedire il backup
-- e la sincronizzazione delle sedute nuove.
create unique index if not exists una_seduta_in_corso_per_giorno
  on public.sedute (user_id, scheda_id, data)
  where stato = 'in_corso' and eliminata = false;

drop index if exists public.una_seduta_in_corso;
