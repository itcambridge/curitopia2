-- Initial Curitopia V2 schema for a new, empty Supabase project.
-- Minimum server version: PostgreSQL 15.
-- ON DELETE SET NULL (question_id) is not available on PostgreSQL 14 or earlier.
-- Not applied. Do not run this file against V1 or a project that already has data.
-- Do not add BEGIN/COMMIT. The migration runner is expected to apply this file
-- in one transaction. Re-running it over real rows is not recovery.
-- This migration does not import V1 rows, create investigations, stories,
-- explorations, or a completed state, and it does not delete storage.objects.

-- ---------------------------------------------------------------------------
-- Shared guards
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$$;

-- One transaction-scoped lock per owner. A second call in the same transaction
-- does not wait. Two owners share a lock only if hashtext collides, which
-- still serializes them safely.
create or replace function public.questions_merge_lock(target_user uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  if target_user is null then
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtext('curitopia.questions_merge_guard'),
    hashtext(target_user::text)
  );
end;
$$;

-- Runs before any row of this statement is locked. Waiting here, instead of
-- inside the row trigger, keeps two merges for one person in one lock order.
create or replace function public.questions_merge_statement_lock()
returns trigger
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  perform public.questions_merge_lock((select auth.uid()));
  return null;
end;
$$;

-- A merge points at another question owned by the same person.
-- The composite foreign key enforces the owner. This trigger blocks a self-merge,
-- a retarget of an existing merge, and a cycle if a later update points a survivor
-- back at a question that already leads to it.
-- Volatile on purpose: after the advisory lock waits, the walk's select takes a
-- new snapshot and sees the merge that committed while this transaction waited.
create or replace function public.questions_merge_guard()
returns trigger
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  walk uuid;
  depth integer := 0;
begin
  if tg_op = 'UPDATE'
     and old.merged_into_id is not null
     and new.merged_into_id is not null
     and new.merged_into_id is distinct from old.merged_into_id then
    raise exception 'restore a merged question before merging it elsewhere';
  end if;

  if new.merged_into_id is null then
    return new;
  end if;

  perform public.questions_merge_lock(new.user_id);

  if new.merged_into_id = new.id then
    raise exception 'a question cannot merge into itself';
  end if;

  walk := new.merged_into_id;
  while walk is not null loop
    if walk = new.id then
      raise exception 'merge would create a cycle';
    end if;
    depth := depth + 1;
    if depth > 64 then
      raise exception 'merge chain is too deep';
    end if;
    select merged_into_id into walk
    from public.questions
    where id = walk;
  end loop;

  return new;
end;
$$;

-- Snapshots stay as they were written. A live question reference may only
-- become null. It cannot be pointed at a different question.
-- Same-owner is enforced by the composite foreign keys, not by this function.
create or replace function public.concept_questions_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.concept_id is distinct from old.concept_id
       or new.original_text_snapshot is distinct from old.original_text_snapshot
       or new.considered_text_snapshot is distinct from old.considered_text_snapshot then
      raise exception 'concept provenance is immutable';
    end if;
    if old.question_id is distinct from new.question_id and new.question_id is not null then
      raise exception 'a concept link can be detached, not retargeted';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------

create table public.questions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  original_text text not null,
  considered_text text,
  disposition text not null default 'gathered',
  merged_into_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_owner_key unique (id, user_id),
  constraint questions_disposition_known check (
    disposition in ('gathered', 'retained', 'parked', 'discarded')
  ),
  constraint questions_original_text_shape check (
    char_length(original_text) between 1 and 2000
    and original_text = btrim(original_text)
  ),
  constraint questions_considered_text_shape check (
    considered_text is null
    or (
      char_length(considered_text) between 1 and 2000
      and considered_text = btrim(considered_text)
    )
  ),
  constraint questions_not_self_merged check (
    merged_into_id is null or merged_into_id <> id
  ),
  constraint questions_merge_same_owner
    foreign key (merged_into_id, user_id)
    references public.questions (id, user_id)
    on delete no action
    deferrable initially deferred
);

comment on table public.questions is
  'Live questions for Gather and Curate. Merge is merged_into_id, not a disposition. There is no completed state.';

comment on column public.questions.merged_into_id is
  'Question this wording was merged into. Null means it is not merged. Original text is never rewritten by a merge. ON DELETE NO ACTION is deferred: deleting a survivor while sources still point at it fails at commit and leaves those wordings in place. Deleting every question for one person in the same transaction, as account removal does, can succeed.';

create index questions_user_id_idx on public.questions (user_id);
create index questions_merged_into_id_idx on public.questions (merged_into_id) where merged_into_id is not null;

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create trigger questions_user_id_immutable
  before update on public.questions
  for each row execute function public.prevent_user_id_change();

create trigger questions_merge_statement_lock
  before insert or update on public.questions
  for each statement execute function public.questions_merge_statement_lock();

create trigger questions_merge_guard
  before insert or update on public.questions
  for each row execute function public.questions_merge_guard();

-- ---------------------------------------------------------------------------
-- Themes
-- ---------------------------------------------------------------------------

create table public.themes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_owner_key unique (id, user_id),
  constraint themes_name_shape check (
    char_length(name) between 1 and 120
    and name = btrim(name)
  ),
  constraint themes_position_nonnegative check (position >= 0)
);

comment on table public.themes is
  'Optional labels. A theme may contain no questions. No description column. Names are unique per owner, ignoring case and surrounding spaces.';

create unique index themes_name_per_user_idx
  on public.themes (user_id, lower(btrim(name)));

comment on index public.themes_name_per_user_idx is
  'One stored theme name per owner. A conflict should be shown as: You already have a theme with this name.';

create trigger themes_set_updated_at
  before update on public.themes
  for each row execute function public.set_updated_at();

create trigger themes_user_id_immutable
  before update on public.themes
  for each row execute function public.prevent_user_id_change();

create table public.theme_questions (
  theme_id uuid not null,
  question_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (theme_id, question_id),
  constraint theme_questions_position_nonnegative check (position >= 0),
  constraint theme_questions_theme_owner
    foreign key (theme_id, user_id)
    references public.themes (id, user_id)
    on delete cascade,
  constraint theme_questions_question_owner
    foreign key (question_id, user_id)
    references public.questions (id, user_id)
    on delete cascade
);

comment on table public.theme_questions is
  'Optional many-to-many theme membership. Both parents must share user_id. Deleting either parent removes the membership only.';

create index theme_questions_question_id_idx on public.theme_questions (question_id);
create index theme_questions_user_id_idx on public.theme_questions (user_id);

create trigger theme_questions_user_id_immutable
  before update on public.theme_questions
  for each row execute function public.prevent_user_id_change();

-- ---------------------------------------------------------------------------
-- Concepts
-- ---------------------------------------------------------------------------

create table public.concepts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  for_considered_text text not null,
  image_path text not null,
  image_model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concepts_owner_key unique (id, user_id),
  constraint concepts_title_one_or_two_words check (
    char_length(title) between 1 and 40
    and title ~ '^[^[:space:]]+( [^[:space:]]+)?$'
  ),
  constraint concepts_for_considered_text_shape check (
    char_length(for_considered_text) between 1 and 2000
    and for_considered_text = btrim(for_considered_text)
  ),
  constraint concepts_image_model_shape check (
    char_length(image_model) between 1 and 80
    and image_model = btrim(image_model)
  ),
  constraint concepts_prompt_version_shape check (
    char_length(prompt_version) between 1 and 40
    and prompt_version = btrim(prompt_version)
  ),
  constraint concepts_image_path_shape check (
    image_path ~ (
      '^' || user_id::text || '/' || id::text || '/[^/]+\.(png|jpeg|jpg|webp)$'
    )
  )
);

comment on table public.concepts is
  'Library of Curiosities. One selected image and an open title. No completed state. Candidate images are not rows.';

comment on column public.concepts.title is
  'One word, or two words joined by exactly one ordinary space. At most 40 characters.';

comment on column public.concepts.for_considered_text is
  'Considered wording the selected image was made for. It is a snapshot, not a live pointer.';

comment on column public.concepts.image_path is
  'Private object path in the concept-images bucket: {user_id}/{concept_id}/{filename}.';

create index concepts_user_id_idx on public.concepts (user_id);

create trigger concepts_set_updated_at
  before update on public.concepts
  for each row execute function public.set_updated_at();

create trigger concepts_user_id_immutable
  before update on public.concepts
  for each row execute function public.prevent_user_id_change();

create table public.concept_questions (
  id uuid primary key,
  concept_id uuid not null,
  question_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  original_text_snapshot text not null,
  considered_text_snapshot text,
  created_at timestamptz not null default now(),
  constraint concept_questions_original_snapshot_shape check (
    char_length(original_text_snapshot) between 1 and 2000
    and original_text_snapshot = btrim(original_text_snapshot)
  ),
  constraint concept_questions_considered_snapshot_shape check (
    considered_text_snapshot is null
    or (
      char_length(considered_text_snapshot) between 1 and 2000
      and considered_text_snapshot = btrim(considered_text_snapshot)
    )
  ),
  constraint concept_questions_concept_owner
    foreign key (concept_id, user_id)
    references public.concepts (id, user_id)
    on delete cascade,
  constraint concept_questions_question_owner
    foreign key (question_id, user_id)
    references public.questions (id, user_id)
    on delete set null (question_id)
);

comment on table public.concept_questions is
  'Many-to-many provenance. question_id becomes null when the source question is deleted. The text snapshots remain.';

create unique index concept_questions_live_link_idx
  on public.concept_questions (concept_id, question_id)
  where question_id is not null;

create index concept_questions_concept_id_idx on public.concept_questions (concept_id);
create index concept_questions_question_id_idx on public.concept_questions (question_id) where question_id is not null;
create index concept_questions_user_id_idx on public.concept_questions (user_id);

create trigger concept_questions_guard
  before update on public.concept_questions
  for each row execute function public.concept_questions_guard();

create trigger concept_questions_user_id_immutable
  before update on public.concept_questions
  for each row execute function public.prevent_user_id_change();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on table
  public.questions,
  public.themes,
  public.theme_questions,
  public.concepts,
  public.concept_questions
from public, anon, service_role;

grant select, insert, update, delete on table
  public.questions,
  public.themes,
  public.theme_questions,
  public.concepts,
  public.concept_questions
to authenticated;

revoke all on function
  public.set_updated_at(),
  public.prevent_user_id_change(),
  public.questions_merge_lock(uuid),
  public.questions_merge_statement_lock(),
  public.questions_merge_guard(),
  public.concept_questions_guard()
from public, anon, service_role;

grant execute on function
  public.set_updated_at(),
  public.prevent_user_id_change(),
  public.questions_merge_lock(uuid),
  public.questions_merge_statement_lock(),
  public.questions_merge_guard(),
  public.concept_questions_guard()
to authenticated;

-- Routine browser CRUD uses the signed-in JWT. service_role is revoked here,
-- including grants Supabase may attach through default privileges at CREATE.
-- Do not ship a service-role credential to the client. A later account-cleanup
-- operation, if built, is a separate explicit grant and still must not delete
-- storage.objects with SQL.

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;
alter table public.themes enable row level security;
alter table public.theme_questions enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_questions enable row level security;

create policy questions_select on public.questions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy questions_insert on public.questions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy questions_update on public.questions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy questions_delete on public.questions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy themes_select on public.themes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy themes_insert on public.themes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy themes_update on public.themes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy themes_delete on public.themes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy theme_questions_select on public.theme_questions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy theme_questions_insert on public.theme_questions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy theme_questions_update on public.theme_questions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy theme_questions_delete on public.theme_questions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy concepts_select on public.concepts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy concepts_insert on public.concepts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy concepts_update on public.concepts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy concepts_delete on public.concepts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy concept_questions_select on public.concept_questions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy concept_questions_insert on public.concept_questions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy concept_questions_update on public.concept_questions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy concept_questions_delete on public.concept_questions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Private concept images
-- ---------------------------------------------------------------------------
-- Agreed ceiling: 8 MiB (8388608 bytes). Private bucket.
-- MIME types: PNG, JPEG, WebP. A JPEG object may use a .jpg or .jpeg name.
-- concepts.image_path must be {user_id}/{concept_id}/{filename}.
-- Storage policies allow any object under the owner's first folder, so the
-- owner can delete an object through the Storage API after the concept row
-- is gone. They do not grant another person's prefix.
-- Do not DELETE FROM storage.objects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'concept-images',
  'concept-images',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
);

create policy concept_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'concept-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy concept_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'concept-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy concept_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'concept-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'concept-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy concept_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'concept-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
