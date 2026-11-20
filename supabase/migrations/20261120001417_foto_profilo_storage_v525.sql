-- v525: un piccolo archivio separato per le foto profilo, senza campi nuovi.
-- Le foto sono pubbliche perché visibili come avatar agli amici; solo il
-- proprietario autenticato può caricarle nella propria cartella Auth.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('palestra-foto-profilo', 'palestra-foto-profilo', true, 204800, array['image/webp'])
on conflict (id) do nothing;

create policy "palestra_foto_profilo_solo_proprietario_v525"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'palestra-foto-profilo'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.extension(name) = 'webp'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
);
