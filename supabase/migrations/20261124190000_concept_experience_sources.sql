-- Provenance for a concept saved from an Experience topic.
-- Do not apply this file to the production project dacfaoksxfqztnswmnfm.
-- Do not apply it by pushing the whole migration folder to production.
-- Apply it to the development project only after review, and only after
-- 20261113220000_experience_north_star_and_circles.sql.
-- PostgreSQL 15 or newer is required. ON DELETE SET NULL (column) is not
-- available on PostgreSQL 14 or earlier. The initial schema states the same.
-- This file does not alter Garden questions, concept_questions, concepts,
-- image files, or storage objects.
-- experiences_owner_key is unique (id, user_id) only. It does not satisfy a
-- foreign key on (id, user_id, curiosity_id). experience_circle_items_owner_key
-- is unique (id, user_id) only. The two unique keys below are new.
-- Referential actions are part of the foreign-key implementation. They do not
-- need UPDATE or DELETE on this table, and these row policies do not apply to
-- them. Deleting a concept therefore removes this row. Deleting a topic clears
-- only item_id. Deleting an experience clears both live ids through
-- clear_experience_visualisation_links. The wording and circle stay.
-- Authenticated users cannot update this row, and cannot delete it on their own.
-- They also cannot insert it directly. save_experience_visualisation_provenance
-- creates the concept and copies one experience_visualisation_sources row in
-- the same transaction. The caller supplies the concept id and its title,
-- creative direction, and image path. The wording and circle come only from
-- the captured row. One source can be copied onto only one concept. The same
-- pair can be retried after the temporary row is gone. A different concept is
-- rejected. The matching provenance, or the temporary source when it still
-- exists, is locked for the duration of that call.
-- Deleting an experience runs clear_experience_visualisation_links before the
-- row disappears. That trigger clears both live ids on the opening snapshot and
-- on the copied provenance. The wording, circle, and origin_source_id stay.
-- PostgreSQL names foreign-key actions from the constraint oid and fires those
-- names in text order, so creation order is not a reliable sequence. This file
-- does not depend on that order. A development PostgreSQL test must still
-- delete an experience and a topic and read the resulting ids.
-- The temporary source row can be deleted after a successful save.
-- concept_experience_sources.origin_source_id keeps that source id with no
-- foreign key, so a retry can find the saved provenance after the temporary
-- row is gone. source_id is only the live row, and it becomes null on delete.
-- Rows older than 7 days are removed when any signed-in user next opens
-- Visualise. The capture trigger sets that age. A caller cannot choose it.
-- This file does not install a scheduler.

alter table public.experiences
  add constraint experiences_owner_curiosity_key
  unique (id, user_id, curiosity_id);

alter table public.experience_circle_items
  add constraint experience_circle_items_owner_experience_key
  unique (id, user_id, experience_id);

-- The opening record. Insert is allowed only while the experience and topic
-- exist. The trigger below replaces the wording, circle, and timestamp sent by
-- the caller. Later deletion clears the live ids. The wording and circle stay.

create or replace function public.capture_experience_visualisation_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  topic public.experience_circle_items%rowtype;
  experience_curiosity uuid;
begin
  if new.experience_id is null or new.item_id is null then
    raise exception 'a visualisation source needs its experience and topic';
  end if;

  select item.* into topic
  from public.experience_circle_items as item
  where item.id = new.item_id
    and item.user_id = new.user_id
    and item.experience_id = new.experience_id;
  if not found then
    raise exception 'that topic is not in this experience';
  end if;

  select experience.curiosity_id into experience_curiosity
  from public.experiences as experience
  where experience.id = new.experience_id
    and experience.user_id = new.user_id
    and experience.curiosity_id = new.curiosity_id;
  if experience_curiosity is null then
    raise exception 'that experience is not in this curiosity';
  end if;

  new.circle := topic.circle;
  new.original_text_snapshot := topic.body;
  new.created_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.preserve_experience_visualisation_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.curiosity_id is distinct from old.curiosity_id
     or new.circle is distinct from old.circle
     or new.original_text_snapshot is distinct from old.original_text_snapshot
     or new.created_at is distinct from old.created_at
     or (new.experience_id is distinct from old.experience_id and new.experience_id is not null)
     or (new.item_id is distinct from old.item_id and new.item_id is not null)
  then
    raise exception 'visualisation source is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.capture_experience_visualisation_source() from public, anon, service_role;
revoke all on function public.preserve_experience_visualisation_source() from public, anon, service_role;

grant execute on function public.capture_experience_visualisation_source() to authenticated;
grant execute on function public.preserve_experience_visualisation_source() to authenticated;

create table public.experience_visualisation_sources (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  curiosity_id uuid not null,
  experience_id uuid,
  item_id uuid,
  circle text not null,
  original_text_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint experience_visualisation_sources_circle_known
    check (circle in ('concern', 'influence', 'control')),
  constraint experience_visualisation_sources_text_shape check (
    char_length(original_text_snapshot) between 1 and 240
    and original_text_snapshot = btrim(original_text_snapshot)
  ),
  constraint experience_visualisation_sources_curiosity_owner
    foreign key (curiosity_id, user_id)
    references public.curiosities (id, user_id)
    on delete cascade,
  constraint experience_visualisation_sources_experience_owner
    foreign key (experience_id, user_id, curiosity_id)
    references public.experiences (id, user_id, curiosity_id)
    on delete set null (experience_id),
  constraint experience_visualisation_sources_item_owner
    foreign key (item_id, user_id, experience_id)
    references public.experience_circle_items (id, user_id, experience_id)
    on delete set null (item_id)
);

comment on table public.experience_visualisation_sources is
  'The topic wording and circle captured when Visualise opened. It is not a concept and not a Garden question.';

comment on column public.experience_visualisation_sources.original_text_snapshot is
  'Copied from the live topic by capture_experience_visualisation_source. A caller cannot choose it.';

comment on column public.experience_visualisation_sources.created_at is
  'Set to the database clock by capture_experience_visualisation_source. A caller cannot choose it.';

comment on column public.experience_visualisation_sources.experience_id is
  'Required on insert. Null after the experience is removed. The wording and circle stay.';

comment on column public.experience_visualisation_sources.item_id is
  'Required on insert. Null after the topic is removed. The wording and circle stay.';

create index experience_visualisation_sources_user_id_idx
  on public.experience_visualisation_sources (user_id);

create trigger experience_visualisation_sources_capture
  before insert on public.experience_visualisation_sources
  for each row execute function public.capture_experience_visualisation_source();

create trigger experience_visualisation_sources_preserve
  before update on public.experience_visualisation_sources
  for each row execute function public.preserve_experience_visualisation_source();

create trigger experience_visualisation_sources_user_id_immutable
  before update on public.experience_visualisation_sources
  for each row execute function public.prevent_user_id_change();

create trigger experience_visualisation_sources_curiosity_id_immutable
  before update on public.experience_visualisation_sources
  for each row execute function public.prevent_curiosity_id_change();

revoke all on table public.experience_visualisation_sources from public, anon, authenticated, service_role;

grant select, insert, delete on table public.experience_visualisation_sources to authenticated;

alter table public.experience_visualisation_sources enable row level security;

create policy experience_visualisation_sources_select on public.experience_visualisation_sources
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy experience_visualisation_sources_insert on public.experience_visualisation_sources
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy experience_visualisation_sources_live_topic on public.experience_visualisation_sources
  as restrictive
  for insert to authenticated
  with check (experience_id is not null and item_id is not null);

create policy experience_visualisation_sources_delete on public.experience_visualisation_sources
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy experience_visualisation_sources_curiosity_membership on public.experience_visualisation_sources
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = experience_visualisation_sources.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = experience_visualisation_sources.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );

-- save_experience_visualisation_provenance is created after this table.
-- Its declared row type is concept_experience_sources, so the table must exist first.

create table public.concept_experience_sources (
  id uuid primary key,
  concept_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  curiosity_id uuid not null,
  experience_id uuid,
  item_id uuid,
  circle text not null,
  original_text_snapshot text not null,
  origin_source_id uuid not null,
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint concept_experience_sources_one_concept unique (concept_id),
  constraint concept_experience_sources_one_origin unique (origin_source_id),
  constraint concept_experience_sources_one_source unique (source_id),
  constraint concept_experience_sources_circle_known
    check (circle in ('concern', 'influence', 'control')),
  constraint concept_experience_sources_text_shape check (
    char_length(original_text_snapshot) between 1 and 240
    and original_text_snapshot = btrim(original_text_snapshot)
  ),
  constraint concept_experience_sources_concept_owner
    foreign key (concept_id, user_id, curiosity_id)
    references public.concepts (id, user_id, curiosity_id)
    on delete cascade,
  constraint concept_experience_sources_curiosity_owner
    foreign key (curiosity_id, user_id)
    references public.curiosities (id, user_id),
  constraint concept_experience_sources_experience_owner
    foreign key (experience_id, user_id, curiosity_id)
    references public.experiences (id, user_id, curiosity_id)
    on delete set null (experience_id),
  constraint concept_experience_sources_item_owner
    foreign key (item_id, user_id, experience_id)
    references public.experience_circle_items (id, user_id, experience_id)
    on delete set null (item_id),
  constraint concept_experience_sources_source_owner
    foreign key (source_id)
    references public.experience_visualisation_sources (id)
    on delete set null
);

comment on table public.concept_experience_sources is
  'Immutable snapshot of the Experience topic a concept was made from. It is not a Garden question and is not a row in concept_questions.';

comment on column public.concept_experience_sources.circle is
  'Concern, influence, or control when visualisation of this topic began.';

comment on column public.concept_experience_sources.original_text_snapshot is
  'The topic wording when visualisation began. Later edits to the live topic do not change it.';

comment on column public.concept_experience_sources.experience_id is
  'Copied from the visualisation source. Null when that experience is already gone. The wording and circle remain.';

comment on column public.concept_experience_sources.item_id is
  'Copied from the visualisation source. Null when that topic is already gone. The wording and circle remain.';

comment on column public.concept_experience_sources.origin_source_id is
  'The opening snapshot id. It stays after that temporary row is deleted. It is not a foreign key.';

comment on column public.concept_experience_sources.source_id is
  'The live temporary snapshot, when it still exists. Null after that row is deleted.';

create index concept_experience_sources_user_id_idx
  on public.concept_experience_sources (user_id);

create index concept_experience_sources_curiosity_id_idx
  on public.concept_experience_sources (curiosity_id);

create index concept_experience_sources_experience_id_idx
  on public.concept_experience_sources (experience_id)
  where experience_id is not null;

create index concept_experience_sources_item_id_idx
  on public.concept_experience_sources (item_id)
  where item_id is not null;

create trigger concept_experience_sources_user_id_immutable
  before update on public.concept_experience_sources
  for each row execute function public.prevent_user_id_change();

create trigger concept_experience_sources_curiosity_id_immutable
  before update on public.concept_experience_sources
  for each row execute function public.prevent_curiosity_id_change();

create or replace function public.preserve_concept_experience_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.concept_id is distinct from old.concept_id
     or new.user_id is distinct from old.user_id
     or new.curiosity_id is distinct from old.curiosity_id
     or new.circle is distinct from old.circle
     or new.original_text_snapshot is distinct from old.original_text_snapshot
     or new.origin_source_id is distinct from old.origin_source_id
     or new.created_at is distinct from old.created_at
     or (new.experience_id is distinct from old.experience_id and new.experience_id is not null)
     or (new.item_id is distinct from old.item_id and new.item_id is not null)
     or (new.source_id is distinct from old.source_id and new.source_id is not null)
  then
    raise exception 'concept provenance is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_concept_experience_source() from public, anon, service_role;

grant execute on function public.preserve_concept_experience_source() to authenticated;

create trigger concept_experience_sources_preserve
  before update on public.concept_experience_sources
  for each row execute function public.preserve_concept_experience_source();

revoke all on table public.concept_experience_sources from public, anon, authenticated, service_role;

grant select on table public.concept_experience_sources to authenticated;

alter table public.concept_experience_sources enable row level security;

create policy concept_experience_sources_select on public.concept_experience_sources
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy concept_experience_sources_curiosity_membership on public.concept_experience_sources
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concept_experience_sources.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concept_experience_sources.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );

-- Creates the concept and its provenance together. The permanent source id is
-- checked before the temporary row is required, so a retry still resolves after
-- that row is deleted. A missing temporary row is checked again before it is
-- rejected: another save may have committed, and the temporary row may already
-- be gone. search_path is empty. Every relation and function is
-- schema-qualified. The migration role owns this function and bypasses row
-- security, so the checks are repeated here. Authenticated users can execute
-- it and cannot write the provenance table themselves. Garden saves continue
-- through the concepts table policies.
--
-- Lock order, outermost parent first: user, curiosity, experience, topic,
-- then the temporary source. Parent locks are FOR KEY SHARE. That conflicts
-- with DELETE, which takes FOR UPDATE on the parent, and it does not conflict
-- with an ordinary update of topic wording or circle. The source is locked
-- only after those parents. A delete therefore cannot hold a parent and wait
-- for the source while this function holds the source and waits for the
-- parent. The source row is read again after the parent locks. Live ids that
-- became null are stored as null. The wording and circle come from that
-- locked row.

create or replace function public.save_experience_visualisation_provenance(
  p_concept_id uuid,
  p_source_id uuid,
  p_title text,
  p_considered_text text,
  p_image_path text,
  p_image_model text,
  p_prompt_version text
)
returns table (
  circle text,
  original_text_snapshot text,
  experience_id uuid,
  item_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  source public.experience_visualisation_sources%rowtype;
  existing public.concept_experience_sources%rowtype;
  concept_user uuid;
  concept_curiosity uuid;
  seen_experience uuid;
  seen_item uuid;
  seen_curiosity uuid;
begin
  if actor is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_concept_id is null or p_source_id is null then
    raise exception 'a concept and its visualisation source are required';
  end if;

  select saved.* into existing
  from public.concept_experience_sources as saved
  where saved.origin_source_id = p_source_id
    and saved.user_id = actor
  for update;
  if found then
    if existing.concept_id = p_concept_id then
      return query
      select existing.circle, existing.original_text_snapshot, existing.experience_id, existing.item_id;
      return;
    end if;
    raise exception 'that visualisation has already been saved';
  end if;

  select captured.experience_id, captured.item_id, captured.curiosity_id
    into seen_experience, seen_item, seen_curiosity
  from public.experience_visualisation_sources as captured
  where captured.id = p_source_id
    and captured.user_id = actor;
  if not found then
    select saved.* into existing
    from public.concept_experience_sources as saved
    where saved.origin_source_id = p_source_id
      and saved.user_id = actor
    for update;
    if found then
      if existing.concept_id = p_concept_id then
        return query
        select existing.circle, existing.original_text_snapshot, existing.experience_id, existing.item_id;
        return;
      end if;
      raise exception 'that visualisation has already been saved';
    end if;
    raise exception 'that visualisation source is not available';
  end if;

  perform 1
  from auth.users as account
  where account.id = actor
  for key share;

  perform 1
  from public.curiosities as curiosity
  where curiosity.id = seen_curiosity
    and curiosity.user_id = actor
  for key share;

  if seen_experience is not null then
    perform 1
    from public.experiences as experience
    where experience.id = seen_experience
      and experience.user_id = actor
    for key share;
  end if;

  if seen_item is not null then
    perform 1
    from public.experience_circle_items as item
    where item.id = seen_item
      and item.user_id = actor
    for key share;
  end if;

  select captured.* into source
  from public.experience_visualisation_sources as captured
  where captured.id = p_source_id
    and captured.user_id = actor
  for update;
  if not found then
    select saved.* into existing
    from public.concept_experience_sources as saved
    where saved.origin_source_id = p_source_id
      and saved.user_id = actor
    for update;
    if found then
      if existing.concept_id = p_concept_id then
        return query
        select existing.circle, existing.original_text_snapshot, existing.experience_id, existing.item_id;
        return;
      end if;
      raise exception 'that visualisation has already been saved';
    end if;
    raise exception 'that visualisation source is not available';
  end if;

  select saved.* into existing
  from public.concept_experience_sources as saved
  where saved.origin_source_id = p_source_id
    and saved.user_id = actor
  for update;
  if found then
    if existing.concept_id = p_concept_id then
      return query
      select existing.circle, existing.original_text_snapshot, existing.experience_id, existing.item_id;
      return;
    end if;
    raise exception 'that visualisation has already been saved';
  end if;

  if source.created_at < pg_catalog.now() - pg_catalog.make_interval(days => 7) then
    raise exception 'that visualisation has expired';
  end if;

  select concepts.user_id, concepts.curiosity_id
    into concept_user, concept_curiosity
  from public.concepts
  where concepts.id = p_concept_id
  for update;
  if found then
    if concept_user <> actor or concept_curiosity is distinct from source.curiosity_id then
      raise exception 'that concept is not in this curiosity';
    end if;
    raise exception 'that concept is not available for this visualisation';
  end if;

  insert into public.concepts (
    id,
    user_id,
    curiosity_id,
    title,
    for_considered_text,
    image_path,
    image_model,
    prompt_version
  ) values (
    p_concept_id,
    actor,
    source.curiosity_id,
    p_title,
    p_considered_text,
    p_image_path,
    p_image_model,
    p_prompt_version
  );

  insert into public.concept_experience_sources (
    id,
    concept_id,
    user_id,
    curiosity_id,
    experience_id,
    item_id,
    circle,
    original_text_snapshot,
    origin_source_id,
    source_id
  ) values (
    pg_catalog.gen_random_uuid(),
    p_concept_id,
    actor,
    source.curiosity_id,
    source.experience_id,
    source.item_id,
    source.circle,
    source.original_text_snapshot,
    source.id,
    source.id
  );

  return query
  select source.circle, source.original_text_snapshot, source.experience_id, source.item_id;
exception
  when unique_violation then
    select saved.* into existing
    from public.concept_experience_sources as saved
    where saved.user_id = actor
      and (saved.origin_source_id = p_source_id or saved.concept_id = p_concept_id)
    order by saved.created_at
    limit 1;
    if found and existing.concept_id = p_concept_id and existing.origin_source_id = p_source_id then
      return query
      select existing.circle, existing.original_text_snapshot, existing.experience_id, existing.item_id;
      return;
    end if;
    raise exception 'that visualisation has already been saved';
end;
$$;

revoke all on function public.save_experience_visualisation_provenance(uuid, uuid, text, text, text, text, text) from public, anon, service_role;

grant execute on function public.save_experience_visualisation_provenance(uuid, uuid, text, text, text, text, text) to authenticated;

-- Runs before an experience row is removed. Both live ids are cleared here, so
-- the later foreign-key actions do not have to run in a particular order.
-- The migration role owns this function. Its update is not limited by the
-- caller's table grants or row policies. Trigger execution does not require
-- the caller to hold EXECUTE, and authenticated users are not granted it.

create or replace function public.clear_experience_visualisation_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.id is null then
    return old;
  end if;
  update public.experience_visualisation_sources
  set experience_id = null,
      item_id = null
  where experience_id = old.id;
  update public.concept_experience_sources
  set experience_id = null,
      item_id = null
  where experience_id = old.id;
  return old;
end;
$$;

revoke all on function public.clear_experience_visualisation_links() from public, anon, authenticated, service_role;

create trigger experiences_clear_visualisation_links
  before delete on public.experiences
  for each row execute function public.clear_experience_visualisation_links();

-- Removes snapshots older than the seven-day token lifetime. A saved concept
-- keeps its copied provenance when its source row disappears. Any signed-in
-- user may run this. It returns nothing. It does not shorten an open session.
-- The migration role owns this function, so the delete is not blocked by the
-- caller's missing update grant or by row policies.

create or replace function public.purge_abandoned_experience_visualisation_sources()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from public.experience_visualisation_sources as source
  where source.created_at < pg_catalog.now() - pg_catalog.make_interval(days => 7);
end;
$$;

revoke all on function public.purge_abandoned_experience_visualisation_sources() from public, anon, service_role;

grant execute on function public.purge_abandoned_experience_visualisation_sources() to authenticated;
