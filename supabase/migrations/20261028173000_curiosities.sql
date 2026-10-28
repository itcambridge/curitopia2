-- Additive curiosities for the hosted V2 project.
-- Do not edit or rerun 20261026000000_initial_v2_schema.sql.
-- Do not apply this file until it has been reviewed.
-- This migration inserts one Garden curiosity for each account that already
-- has questions or concepts, then points those rows at it.
-- It does not delete questions, concepts, concept_questions, or storage.objects.
-- It does not rewrite stored image object paths.
-- It does not import V1, and it does not add a completed state.

create or replace function public.prevent_curiosity_id_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.curiosity_id is distinct from old.curiosity_id then
    raise exception 'curiosity_id is immutable';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Curiosities
-- ---------------------------------------------------------------------------

create table public.curiosities (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  stage text not null default 'gather',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curiosities_owner_key unique (id, user_id),
  constraint curiosities_name_shape check (
    char_length(name) between 1 and 80
    and name = btrim(name)
  ),
  constraint curiosities_stage_known check (
    stage in ('gather', 'curate', 'visualise', 'distil', 'library')
  )
);

comment on table public.curiosities is
  'One named garden. Questions and concepts belong to exactly one curiosity. There is no completed state.';

comment on column public.curiosities.stage is
  'Last opened stage. Candidate images are not stored here.';

create unique index curiosities_name_per_user_idx
  on public.curiosities (user_id, lower(btrim(name)));

create index curiosities_user_updated_idx
  on public.curiosities (user_id, updated_at desc);

create trigger curiosities_set_updated_at
  before update on public.curiosities
  for each row execute function public.set_updated_at();

create trigger curiosities_user_id_immutable
  before update on public.curiosities
  for each row execute function public.prevent_user_id_change();

-- One editable Garden for every account that already has saved work.
insert into public.curiosities (id, user_id, name)
select gen_random_uuid(), owners.user_id, 'Garden'
from (
  select user_id from public.questions
  union
  select user_id from public.concepts
) owners;

-- ---------------------------------------------------------------------------
-- Questions belong to one curiosity
-- ---------------------------------------------------------------------------

alter table public.questions
  add column curiosity_id uuid;

update public.questions as question
set curiosity_id = curiosity.id
from public.curiosities as curiosity
where curiosity.user_id = question.user_id;

alter table public.questions
  alter column curiosity_id set not null;

alter table public.questions
  add constraint questions_curiosity_key unique (id, user_id, curiosity_id);

alter table public.questions
  add constraint questions_curiosity_owner
  foreign key (curiosity_id, user_id)
  references public.curiosities (id, user_id)
  on delete cascade;

alter table public.questions
  add constraint questions_merge_same_curiosity
  foreign key (merged_into_id, user_id, curiosity_id)
  references public.questions (id, user_id, curiosity_id)
  on delete no action
  deferrable initially deferred;

create index questions_curiosity_id_idx on public.questions (curiosity_id);

create trigger questions_curiosity_id_immutable
  before update on public.questions
  for each row execute function public.prevent_curiosity_id_change();

-- ---------------------------------------------------------------------------
-- Concepts belong to the same curiosity as their sources
-- ---------------------------------------------------------------------------

alter table public.concepts
  add column curiosity_id uuid;

update public.concepts as concept
set curiosity_id = curiosity.id
from public.curiosities as curiosity
where curiosity.user_id = concept.user_id;

alter table public.concepts
  alter column curiosity_id set not null;

alter table public.concepts
  add constraint concepts_curiosity_key unique (id, user_id, curiosity_id);

alter table public.concepts
  add constraint concepts_curiosity_owner
  foreign key (curiosity_id, user_id)
  references public.curiosities (id, user_id)
  on delete cascade;

create index concepts_curiosity_id_idx on public.concepts (curiosity_id);

create trigger concepts_curiosity_id_immutable
  before update on public.concepts
  for each row execute function public.prevent_curiosity_id_change();

alter table public.concept_questions
  add column curiosity_id uuid;

update public.concept_questions as link
set curiosity_id = concept.curiosity_id
from public.concepts as concept
where concept.id = link.concept_id
  and concept.user_id = link.user_id;

alter table public.concept_questions
  alter column curiosity_id set not null;

alter table public.concept_questions
  add constraint concept_questions_concept_curiosity
  foreign key (concept_id, user_id, curiosity_id)
  references public.concepts (id, user_id, curiosity_id)
  on delete cascade;

alter table public.concept_questions
  add constraint concept_questions_question_curiosity
  foreign key (question_id, user_id, curiosity_id)
  references public.questions (id, user_id, curiosity_id)
  on delete set null (question_id);

create index concept_questions_curiosity_id_idx on public.concept_questions (curiosity_id);

create trigger concept_questions_curiosity_id_immutable
  before update on public.concept_questions
  for each row execute function public.prevent_curiosity_id_change();

comment on column public.questions.curiosity_id is
  'Garden this question belongs to. Immutable. A merge must stay inside it.';

comment on column public.concepts.curiosity_id is
  'Garden this concept belongs to. Immutable. The stored image object path is not rewritten.';

comment on column public.concept_questions.curiosity_id is
  'Same garden as the concept. A live question link must use that garden too.';

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on table public.curiosities from public, anon, service_role;

grant select, insert, update, delete on table public.curiosities to authenticated;

revoke all on function public.prevent_curiosity_id_change() from public, anon, service_role;

grant execute on function public.prevent_curiosity_id_change() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.curiosities enable row level security;

create policy curiosities_select on public.curiosities
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy curiosities_insert on public.curiosities
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy curiosities_update on public.curiosities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy curiosities_delete on public.curiosities
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Restrictive policies AND with the existing owner policies.
-- A matching user_id is not enough when the curiosity belongs to someone else.

create policy questions_curiosity_membership on public.questions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = questions.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = questions.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );

create policy concepts_curiosity_membership on public.concepts
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concepts.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concepts.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );

create policy concept_questions_curiosity_membership on public.concept_questions
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concept_questions.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = concept_questions.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );
