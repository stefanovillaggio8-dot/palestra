-- Safari iOS non garantisce l'esportazione WebP da canvas.toBlob():
-- conserva la stessa cartella protetta dell'utente ma permette anche JPEG.
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id = 'palestra-foto-profilo';

drop policy if exists "palestra_foto_profilo_solo_proprietario_v525" on storage.objects;
create policy "palestra_foto_profilo_solo_proprietario_v527"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'palestra-foto-profilo'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.extension(name) in ('webp', 'jpg')
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
);
