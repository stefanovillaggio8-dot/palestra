-- Equipment persisted on each profile so inventory equip/unequip survives refreshes and devices.
begin;
alter table public.profili
  add column if not exists equipaggiamento_aura jsonb not null default '{}'::jsonb;
commit;
