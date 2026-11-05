-- Retry sicuro inviti: solo account accettante e amicizia esistente.
CREATE OR REPLACE FUNCTION private.accetta_invito_amico(p_token text, p_profilo_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inv public.inviti_amici_app%rowtype;
  v_creatore_profilo public.profili%rowtype;
  v_destinatario public.profili%rowtype;
  v_uid_vecchio uuid;
  v_scheda text;
begin
  if v_uid is null then raise exception 'Accedi prima di accettare l’invito.'; end if;
  if p_token is null or p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Link di invito non valido.';
  end if;
  select * into v_inv from public.inviti_amici_app i where i.token=p_token::uuid for update;
  if not found then raise exception 'Invito non trovato o già scaduto.'; end if;
  -- Un click ripetuto sullo stesso invito non deve fallire se il primo
  -- collegamento e' gia' riuscito. Controlla sia il proprietario autenticato
  -- sia la relazione reale: non ricrea amicizie eliminate e non lega terzi.
  if v_inv.used_at is not null then
    if v_inv.accepted_by = v_uid
      and v_inv.accepted_profile_id = p_profilo_id
      and exists (
        select 1 from public.amicizie_app a
        where a.user_id = v_uid and a.profile_id = p_profilo_id
          and a.friend_user_id = v_inv.created_by
          and a.friend_profile_id = v_inv.creator_profile_id
      )
    then
      return jsonb_build_object('ok',true,'profilo',p_profilo_id,
        'amico',v_inv.creator_profile_id,'trasferito',
        v_inv.claim_profile_id is not null,'gia_collegati',true);
    end if;
    raise exception 'Questo invito è già stato utilizzato.';
  end if;
  if v_inv.expires_at <= now() then raise exception 'Questo invito è scaduto: chiedine uno nuovo.'; end if;
  if v_inv.created_by = v_uid then raise exception 'Non puoi accettare un invito creato dal tuo stesso account.'; end if;
  select * into v_creatore_profilo from public.profili p where p.id=v_inv.creator_profile_id and p.user_id=v_inv.created_by;
  if not found then raise exception 'Il profilo di chi ha invitato non è più disponibile.'; end if;

  if v_inv.claim_profile_id is not null then
    if p_profilo_id <> v_inv.claim_profile_id or v_inv.claim_profile_id <> 'account-2' then
      raise exception 'Questo è il link di trasferimento della scheda storica di Andrea: va aperto con il profilo Andrea.';
    end if;
    select * into v_destinatario from public.profili p
    where p.id=v_inv.claim_profile_id and p.user_id=v_inv.created_by and p.scheda_id='scheda-altro-1' for update;
    if not found then raise exception 'Il profilo storico di Andrea è già stato trasferito o non esiste.'; end if;
    if exists (select 1 from public.sedute s where s.user_id=v_uid and s.stato='in_corso' and coalesce(s.eliminata,false)=false) then
      raise exception 'Termina prima l’allenamento in corso nell’account che riceve il profilo.';
    end if;
    v_uid_vecchio := v_inv.created_by;
    v_scheda := v_destinatario.scheda_id;

    update public.esercizi e set user_id=v_uid,rev=coalesce(e.rev,1)+1,updated_at=now()
    where e.user_id=v_uid_vecchio and e.id in (
      select distinct sr.esercizio_id from public.serie sr join public.sedute s on s.id=sr.seduta_id
      where s.user_id=v_uid_vecchio and s.scheda_id=v_scheda
    ) and e.id not like 'ex-%';
    update public.schede set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where id=v_scheda and user_id=v_uid_vecchio;
    update public.versioni set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where scheda_id=v_scheda and user_id=v_uid_vecchio;
    update public.sedute set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where scheda_id=v_scheda and user_id=v_uid_vecchio;
    update public.serie set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now()
    where seduta_id in (select s.id from public.sedute s where s.scheda_id=v_scheda and s.user_id=v_uid);
    update public.note set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now()
    where user_id=v_uid_vecchio and seduta_id in (select s.id from public.sedute s where s.scheda_id=v_scheda and s.user_id=v_uid);
    update public.missioni set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;
    update public.ricompense set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;
    update public.pesi set user_id=v_uid,rev=coalesce(rev,1)+1,updated_at=now() where user_id=v_uid_vecchio and account_id=v_inv.claim_profile_id;

    update public.profili set user_id=v_uid,
      amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.creator_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now()
    where id=v_inv.claim_profile_id and user_id=v_uid_vecchio;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.claim_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now()
    where id=v_inv.creator_profile_id and user_id=v_inv.created_by;
    insert into public.amicizie_app(user_id,profile_id,friend_user_id,friend_profile_id) values
      (v_uid,v_inv.claim_profile_id,v_inv.created_by,v_inv.creator_profile_id),
      (v_inv.created_by,v_inv.creator_profile_id,v_uid,v_inv.claim_profile_id)
    on conflict do nothing;
  else
    select * into v_destinatario from public.profili p where p.id=p_profilo_id and p.user_id=v_uid for update;
    if not found then raise exception 'Prima completa la registrazione dell’account e riprova.'; end if;
    if p_profilo_id=v_inv.creator_profile_id then raise exception 'Questo è già il tuo profilo.'; end if;
    insert into public.amicizie_app(user_id,profile_id,friend_user_id,friend_profile_id) values
      (v_uid,p_profilo_id,v_inv.created_by,v_inv.creator_profile_id),
      (v_inv.created_by,v_inv.creator_profile_id,v_uid,p_profilo_id)
    on conflict do nothing;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(v_inv.creator_profile_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now() where id=p_profilo_id and user_id=v_uid;
    update public.profili set amici=coalesce(amici,'[]'::jsonb)||jsonb_build_array(p_profilo_id),
      privacy=jsonb_set(jsonb_set(coalesce(privacy,'{}'::jsonb),'{profilo}','"pubblico"'::jsonb,true),'{performance}','"pubblico"'::jsonb,true),
      rev=coalesce(rev,1)+1,updated_at=now() where id=v_inv.creator_profile_id and user_id=v_inv.created_by;
  end if;
  update public.inviti_amici_app set used_at=now(),accepted_by=v_uid,accepted_profile_id=p_profilo_id where token=v_inv.token;
  return jsonb_build_object('ok',true,'profilo',p_profilo_id,'amico',v_inv.creator_profile_id,'trasferito',v_inv.claim_profile_id is not null);
end;
$function$

