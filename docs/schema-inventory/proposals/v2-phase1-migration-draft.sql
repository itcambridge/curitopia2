-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- Historical draft for adding tables to the V1 database. V2 uses a separate project.
-- The clean-schema draft that replaced this file is also superseded.
-- The current persistence design is v2-revised-schema-proposal.md.
--
-- Curitopia V2 phase 1 draft.
-- DRAFT FOR REVIEW ONLY. NOT APPROVED. DO NOT RUN THIS FILE.
-- Do not move it to supabase/migrations until the proposal is approved.
-- Proposal: docs/schema-inventory/proposals/v2-phase1-migration-proposal.md
--
-- Adds public.themes, public.theme_questions, and public.investigation_questions.
-- Does not add theme_investigations or stories.
-- Does not drop or weaken experiments.question_id or experiments_one_question.
-- Does not read question text, titles, auth users, or storage objects.
--
-- This draft has not been executed. Do not treat it as proven SQL.
--
-- Question delete:
--   investigation_questions and theme_questions use ON DELETE CASCADE.
--   experiments.question_id stays ON DELETE RESTRICT, so the original question
--   still cannot be deleted. An additional linked question can be deleted;
--   the investigation row remains and only that association goes.
-- themes.description and relationship_note are omitted.
-- experiments_sync_question_link is security invoker. service_role is not granted.
-- EXECUTE on a trigger function is required to create the trigger, not to fire it.
-- The statements inside an invoker trigger use the privileges of the role that
-- queued the event. authenticated needs INSERT on investigation_questions,
-- and that insert must pass the table's row-level security policy.
--
-- Run only as one transaction. If a statement raises, run rollback.
-- A SQL Editor that commits each statement can leave a partial schema.

begin;

select pg_advisory_xact_lock(hashtext('curitopia-v2-phase1')::bigint);

do $$
begin
  if to_regclass('public.explorations') is null
     or to_regclass('public.questions') is null
     or to_regclass('public.experiments') is null
  then
    raise exception 'preflight: explorations, questions, or experiments is absent';
  end if;

  if to_regclass('public.themes') is not null
     or to_regclass('public.theme_questions') is not null
     or to_regclass('public.investigation_questions') is not null
     or to_regclass('public.theme_investigations') is not null
     or to_regclass('public.stories') is not null
  then
    raise exception 'preflight: a phase-1 or deferred V2 table already exists';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'experiments'
      and column_name = 'question_id'
      and udt_name = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception 'preflight: experiments.question_id must be a non-null uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'experiments'
      and column_name = 'exploration_id'
      and udt_name = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'experiments'
      and column_name = 'created_at'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'exploration_id'
      and udt_name = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception 'preflight: experiment or question exploration identity columns are missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'experiments'
      and c.conname = 'experiments_one_question'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%question_id%'
  ) then
    raise exception 'preflight: experiments_one_question must remain a unique constraint on question_id';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('explorations', 'questions', 'experiments')
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ) then
    raise exception 'preflight: explorations, questions, and experiments need row level security enabled and forced';
  end if;
end $$;

do $$
declare
  mismatched integer;
  orphans integer;
begin
  select count(*)
    into mismatched
  from public.experiments
  join public.questions
    on questions.id = experiments.question_id
  where questions.exploration_id is distinct from experiments.exploration_id;

  select count(*)
    into orphans
  from public.experiments
  left join public.questions
    on questions.id = experiments.question_id
  where questions.id is null;

  if mismatched <> 0 or orphans <> 0 then
    raise exception
      'preflight: % cross-exploration experiment questions and % missing questions; no rows were changed',
      mismatched,
      orphans;
  end if;
end $$;

alter table public.questions
  add constraint questions_id_exploration_key unique (id, exploration_id);

alter table public.experiments
  add constraint experiments_id_exploration_key unique (id, exploration_id);

create table public.themes (
  id uuid primary key,
  exploration_id uuid not null,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_exploration_fkey
    foreign key (exploration_id) references public.explorations (id) on delete cascade,
  constraint themes_id_exploration_key unique (id, exploration_id),
  constraint themes_position_check check (position >= 0),
  constraint themes_position_unique unique (exploration_id, position),
  constraint themes_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 120
  )
);

comment on table public.themes is
  'Optional grouping inside one exploration. Deleting a theme does not delete its questions.';

create table public.theme_questions (
  theme_id uuid not null,
  question_id uuid not null,
  exploration_id uuid not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (theme_id, question_id),
  constraint theme_questions_theme_exploration_fkey
    foreign key (theme_id, exploration_id)
    references public.themes (id, exploration_id) on delete cascade,
  constraint theme_questions_question_exploration_fkey
    foreign key (question_id, exploration_id)
    references public.questions (id, exploration_id) on delete cascade,
  constraint theme_questions_position_check check (position >= 0),
  constraint theme_questions_position_unique unique (theme_id, position)
);

comment on table public.theme_questions is
  'Questions grouped by a theme. Both parents must share exploration_id. A question may have no row.';

create index theme_questions_question_idx
  on public.theme_questions (question_id);

create table public.investigation_questions (
  experiment_id uuid not null,
  question_id uuid not null,
  exploration_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (experiment_id, question_id),
  constraint investigation_questions_experiment_exploration_fkey
    foreign key (experiment_id, exploration_id)
    references public.experiments (id, exploration_id) on delete cascade,
  -- CASCADE removes an additional association when that question is deleted.
  -- The original question remains protected by experiments.question_id ON DELETE RESTRICT.
  constraint investigation_questions_question_exploration_fkey
    foreign key (question_id, exploration_id)
    references public.questions (id, exploration_id) on delete cascade
);

comment on table public.investigation_questions is
  'Questions investigated by an experiment. experiment_id is the investigation. '
  'The original experiments.question_id link is required; further questions are allowed. '
  'Deleting an additional question removes its link and leaves the experiment.';

create index investigation_questions_question_idx
  on public.investigation_questions (question_id);

create index investigation_questions_exploration_idx
  on public.investigation_questions (exploration_id);

create or replace function public.themes_assign_position()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform 1
  from public.explorations
  where explorations.id = new.exploration_id
  for update;

  select coalesce(max(themes.position) + 1, 0)
    into new.position
  from public.themes
  where themes.exploration_id = new.exploration_id;

  return new;
end;
$$;

create trigger themes_assign_position
before insert on public.themes
for each row
execute function public.themes_assign_position();

create or replace function public.themes_protect_row()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.exploration_id is distinct from old.exploration_id then
    raise exception 'a theme cannot move to another exploration' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger themes_protect_row
before update on public.themes
for each row
execute function public.themes_protect_row();

create or replace function public.theme_questions_assign_position()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform 1
  from public.themes
  where themes.id = new.theme_id
  for update;

  select coalesce(max(theme_questions.position) + 1, 0)
    into new.position
  from public.theme_questions
  where theme_questions.theme_id = new.theme_id;

  return new;
end;
$$;

create trigger theme_questions_assign_position
before insert on public.theme_questions
for each row
execute function public.theme_questions_assign_position();

create or replace function public.theme_questions_protect_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.theme_id is distinct from old.theme_id
     or new.question_id is distinct from old.question_id
     or new.exploration_id is distinct from old.exploration_id
  then
    raise exception 'a theme membership cannot be moved; remove it and add another'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger theme_questions_protect_link
before update on public.theme_questions
for each row
execute function public.theme_questions_protect_link();

create or replace function public.investigation_questions_protect_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.experiment_id is distinct from old.experiment_id
     or new.question_id is distinct from old.question_id
     or new.exploration_id is distinct from old.exploration_id
  then
    raise exception 'an investigation link cannot be moved; remove it and add another'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger investigation_questions_protect_link
before update on public.investigation_questions
for each row
execute function public.investigation_questions_protect_link();

create or replace function public.experiments_sync_question_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.investigation_questions (
    exploration_id,
    experiment_id,
    question_id,
    created_at
  )
  values (new.exploration_id, new.id, new.question_id, new.created_at)
  on conflict (experiment_id, question_id) do nothing;

  return null;
end;
$$;

create trigger experiments_sync_question_link
after insert on public.experiments
for each row
execute function public.experiments_sync_question_link();

create or replace function public.experiments_require_question_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
       select 1
       from public.experiments
       where experiments.id = new.id
     )
     and not exists (
       select 1
       from public.investigation_questions
       where investigation_questions.experiment_id = new.id
         and investigation_questions.question_id = new.question_id
         and investigation_questions.exploration_id = new.exploration_id
     )
  then
    raise exception 'experiment is missing its original question link' using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger experiments_require_question_link
after insert on public.experiments
deferrable initially deferred
for each row
execute function public.experiments_require_question_link();

create or replace function public.investigation_questions_keep_legacy_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
       select 1
       from public.experiments
       where experiments.id = old.experiment_id
         and experiments.question_id = old.question_id
     )
     and not exists (
       select 1
       from public.investigation_questions
       where investigation_questions.experiment_id = old.experiment_id
         and investigation_questions.question_id = old.question_id
     )
  then
    raise exception 'the original question link cannot be removed while the experiment still points at that question'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger investigation_questions_keep_legacy_link
after delete on public.investigation_questions
deferrable initially deferred
for each row
execute function public.investigation_questions_keep_legacy_link();

alter table public.themes enable row level security;
alter table public.themes force row level security;
alter table public.theme_questions enable row level security;
alter table public.theme_questions force row level security;
alter table public.investigation_questions enable row level security;
alter table public.investigation_questions force row level security;

create policy themes_select
on public.themes
for select
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = themes.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy themes_insert
on public.themes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = themes.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy themes_update
on public.themes
for update
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = themes.exploration_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = themes.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy themes_delete
on public.themes
for delete
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = themes.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy theme_questions_select
on public.theme_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.themes
    join public.explorations on explorations.id = themes.exploration_id
    where themes.id = theme_questions.theme_id
      and themes.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = theme_questions.question_id
      and questions.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy theme_questions_insert
on public.theme_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.themes
    join public.explorations on explorations.id = themes.exploration_id
    where themes.id = theme_questions.theme_id
      and themes.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = theme_questions.question_id
      and questions.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy theme_questions_update
on public.theme_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.themes
    join public.explorations on explorations.id = themes.exploration_id
    where themes.id = theme_questions.theme_id
      and themes.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = theme_questions.question_id
      and questions.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.themes
    join public.explorations on explorations.id = themes.exploration_id
    where themes.id = theme_questions.theme_id
      and themes.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = theme_questions.question_id
      and questions.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy theme_questions_delete
on public.theme_questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.themes
    join public.explorations on explorations.id = themes.exploration_id
    where themes.id = theme_questions.theme_id
      and themes.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = theme_questions.question_id
      and questions.exploration_id = theme_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_questions_select
on public.investigation_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.experiments
    where experiments.id = investigation_questions.experiment_id
      and experiments.exploration_id = investigation_questions.exploration_id
      and experiments.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = investigation_questions.question_id
      and questions.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_questions_insert
on public.investigation_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.experiments
    where experiments.id = investigation_questions.experiment_id
      and experiments.exploration_id = investigation_questions.exploration_id
      and experiments.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = investigation_questions.question_id
      and questions.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_questions_update
on public.investigation_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.experiments
    where experiments.id = investigation_questions.experiment_id
      and experiments.exploration_id = investigation_questions.exploration_id
      and experiments.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = investigation_questions.question_id
      and questions.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.experiments
    where experiments.id = investigation_questions.experiment_id
      and experiments.exploration_id = investigation_questions.exploration_id
      and experiments.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = investigation_questions.question_id
      and questions.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_questions_delete
on public.investigation_questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.experiments
    where experiments.id = investigation_questions.experiment_id
      and experiments.exploration_id = investigation_questions.exploration_id
      and experiments.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.questions
    join public.explorations on explorations.id = questions.exploration_id
    where questions.id = investigation_questions.question_id
      and questions.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

revoke all on table public.themes from public, anon, service_role;
revoke all on table public.theme_questions from public, anon, service_role;
revoke all on table public.investigation_questions from public, anon, service_role;

grant select, insert, update, delete on public.themes to authenticated;
grant select, insert, update, delete on public.theme_questions to authenticated;
grant select, insert, update, delete on public.investigation_questions to authenticated;

revoke all on function public.themes_assign_position() from public, anon, service_role;
revoke all on function public.themes_protect_row() from public, anon, service_role;
revoke all on function public.theme_questions_assign_position() from public, anon, service_role;
revoke all on function public.theme_questions_protect_link() from public, anon, service_role;
revoke all on function public.investigation_questions_protect_link() from public, anon, service_role;
revoke all on function public.experiments_sync_question_link() from public, anon, service_role;
revoke all on function public.experiments_require_question_link() from public, anon, service_role;
revoke all on function public.investigation_questions_keep_legacy_link() from public, anon, service_role;

grant execute on function public.themes_assign_position() to authenticated;
grant execute on function public.themes_protect_row() to authenticated;
grant execute on function public.theme_questions_assign_position() to authenticated;
grant execute on function public.theme_questions_protect_link() to authenticated;
grant execute on function public.investigation_questions_protect_link() to authenticated;
grant execute on function public.experiments_sync_question_link() to authenticated;
grant execute on function public.experiments_require_question_link() to authenticated;
grant execute on function public.investigation_questions_keep_legacy_link() to authenticated;

-- Historical links. Inserts into experiments are synced separately by the trigger above.
insert into public.investigation_questions (
  exploration_id,
  experiment_id,
  question_id,
  created_at
)
select
  experiments.exploration_id,
  experiments.id,
  experiments.question_id,
  experiments.created_at
from public.experiments
on conflict (experiment_id, question_id) do nothing;

do $$
declare
  experiments_n integer;
  legacy_links_n integer;
  extra_links_n integer;
  theme_n integer;
  membership_n integer;
begin
  select count(*) into experiments_n from public.experiments;

  select count(*)
    into legacy_links_n
  from public.investigation_questions
  join public.experiments
    on experiments.id = investigation_questions.experiment_id
   and experiments.question_id = investigation_questions.question_id
   and experiments.exploration_id = investigation_questions.exploration_id;

  select count(*)
    into extra_links_n
  from public.investigation_questions
  join public.experiments
    on experiments.id = investigation_questions.experiment_id
  where investigation_questions.question_id is distinct from experiments.question_id;

  select count(*) into theme_n from public.themes;
  select count(*) into membership_n from public.theme_questions;

  if legacy_links_n <> experiments_n then
    raise exception
      'backfill check failed: % experiments and % original links',
      experiments_n,
      legacy_links_n;
  end if;

  if extra_links_n <> 0 or theme_n <> 0 or membership_n <> 0 then
    raise exception
      'backfill check failed: % extra links, % themes, % memberships',
      extra_links_n,
      theme_n,
      membership_n;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'experiments'
      and c.conname = 'experiments_one_question'
      and c.contype = 'u'
  ) then
    raise exception 'backfill check failed: experiments_one_question is no longer present';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('themes', 'theme_questions', 'investigation_questions')
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ) then
    raise exception 'backfill check failed: new tables need row level security enabled and forced';
  end if;

  raise notice
    'phase 1 draft checks passed with % original investigation links',
    legacy_links_n;
end $$;

commit;

-- Reviewed rollback. Keep this commented during the forward run.
-- It removes phase-1 objects and backfilled links. It does not drop V1 tables
-- or experiments_one_question.
--
-- begin;
-- drop trigger if exists experiments_sync_question_link on public.experiments;
-- drop trigger if exists experiments_require_question_link on public.experiments;
-- drop table if exists public.investigation_questions;
-- drop table if exists public.theme_questions;
-- drop table if exists public.themes;
-- drop function if exists public.experiments_sync_question_link();
-- drop function if exists public.experiments_require_question_link();
-- drop function if exists public.investigation_questions_protect_link();
-- drop function if exists public.investigation_questions_keep_legacy_link();
-- drop function if exists public.theme_questions_assign_position();
-- drop function if exists public.theme_questions_protect_link();
-- drop function if exists public.themes_assign_position();
-- drop function if exists public.themes_protect_row();
-- alter table public.questions drop constraint if exists questions_id_exploration_key;
-- alter table public.experiments drop constraint if exists experiments_id_exploration_key;
-- commit;
