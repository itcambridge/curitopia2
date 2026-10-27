-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- It validates the withdrawn clean-schema draft, which is not the V2 model.
-- The current persistence design is v2-revised-schema-proposal.md.
-- A new validation file belongs with a later investigation migration, if one is written.
--
-- Validation case for investigation_items_related_fkey.
-- UNAPPROVED. This file has not been executed.
-- Run it only after v2-initial-schema-draft.sql on a disposable local database.
-- It rolls back. It does not belong in supabase/migrations.
-- Do not run it against V1 or a hosted project.
--
-- Expected:
--   Deleting one item while another item still points at it raises 23503
--   when the deferred NO ACTION check runs.
--   Deleting the investigation then removes the related set, and the same
--   check passes because no remaining row points at a deleted item.

begin;

do $case$
declare
  owner uuid := '30000000-0000-4000-8000-000000000001';
  exploration uuid := '30000000-0000-4000-8000-000000000002';
  question uuid := '30000000-0000-4000-8000-000000000003';
  investigation uuid := '30000000-0000-4000-8000-000000000004';
  parent_item uuid := '30000000-0000-4000-8000-000000000005';
  child_item uuid := '30000000-0000-4000-8000-000000000006';
begin
  insert into auth.users (
    id, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  )
  values (
    owner,
    'related-item-case@curitopia.test',
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  insert into public.explorations (id, user_id, title, mode, status)
  values (exploration, owner, 'Related item case', 'focus', 'active');

  insert into public.questions (id, exploration_id, question_text, role)
  values (question, exploration, 'Related item case question', 'central');

  insert into public.investigations (id, exploration_id)
  values (investigation, exploration);

  insert into public.investigation_items (id, investigation_id, kind, body)
  values (parent_item, investigation, 'concept', 'Parent item');

  insert into public.investigation_items (id, investigation_id, kind, body, related_item_id)
  values (child_item, investigation, 'note', 'Child item', parent_item);

  begin
    delete from public.investigation_items where id = parent_item;
    set constraints investigation_items_related_fkey immediate;
    raise exception 'referenced item delete was allowed';
  exception
    when foreign_key_violation then
      null;
  end;

  if not exists (
    select 1
    from public.investigation_items
    where id = parent_item
      and investigation_id = investigation
  ) then
    raise exception 'referenced item is missing after the rejected delete';
  end if;

  delete from public.investigations where id = investigation;
  set constraints investigation_items_related_fkey immediate;

  if exists (
    select 1
    from public.investigation_items
    where investigation_id = investigation
  ) then
    raise exception 'investigation delete left a related item';
  end if;
end;
$case$;

rollback;
