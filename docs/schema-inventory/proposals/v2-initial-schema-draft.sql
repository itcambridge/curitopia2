-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- Do not copy it into supabase/migrations. It has never been executed.
-- It centres explorations, Quickfire/Focus, focus images, and investigation thumbnails.
-- Those choices are withdrawn. The current persistence design is
-- v2-revised-schema-proposal.md. The original header follows.
--
-- Curitopia V2 initial schema.
-- UNAPPROVED DRAFT. This file has not been executed.
-- Do not copy it into supabase/migrations until it is approved.
-- Do not run it against the V1 Supabase project or any hosted database.
--
-- Apply the whole file as one Supabase migration. The CLI wraps one migration
-- file in a transaction. This file has no BEGIN, COMMIT, or
-- "pg-delta: transaction=false" marker. A failure rolls the file back and does
-- not record it in supabase_migrations.schema_migrations.
-- Do not paste this file into the SQL editor as the deployment method. An
-- editor that commits each statement can leave a partial schema. Recovery for
-- that case is commented at the bottom and described in
-- v2-initial-schema-proposal.md.
--
-- V2 is a separate Supabase project with its own auth.users.
-- This script does not read, backfill, or modify V1.
-- It does not create a stories table or a theme_investigations table.
--
-- Preserved product behaviour, adapted to V2 names:
--   explorations and questions, Quickfire/Focus, perspectives, priority, hiding
--   optional themes and theme/question membership
--   investigations linked to many questions through investigation_questions
--   investigation_items: concept, note, hypothesis, test, observation, discovery
--   private focus images and private item thumbnails
--
-- Ownership is explorations.user_id. Child tables do not copy it.
-- Trigger functions are security invoker. Firing uses the role that queued the
-- event. EXECUTE is granted so the migration role can create the triggers and
-- so authenticated can call create_exploration_with_first_question.

create table public.explorations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  mode text not null,
  status text not null,
  focus_image_path text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint explorations_mode_check check (mode in ('quickfire', 'focus')),
  constraint explorations_status_check check (status in ('active', 'completed')),
  constraint explorations_title_check check (
    title is null
    or (
      title = btrim(title)
      and char_length(title) between 1 and 120
    )
  ),
  constraint explorations_completion_check check (
    (status = 'active' and ended_at is null)
    or (status = 'completed' and ended_at is not null)
  ),
  constraint explorations_focus_image_path_check check (
    focus_image_path is null
    or (
      focus_image_path = btrim(focus_image_path)
      and split_part(focus_image_path, '/', 1) = user_id::text
      and split_part(focus_image_path, '/', 2) = id::text
      and focus_image_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpeg|webp)$'
    )
  )
);

comment on table public.explorations is
  'Private curiosity context for one owner. Deleting it deletes questions, themes, and investigations. V1 rows are not imported.';

create index explorations_user_updated_idx
  on public.explorations (user_id, updated_at desc);

create table public.questions (
  id uuid primary key,
  exploration_id uuid not null references public.explorations (id) on delete cascade,
  position integer not null,
  question_text text not null,
  role text not null,
  is_prioritised boolean not null default false,
  is_hidden boolean not null default false,
  perspective_origin text,
  created_at timestamptz not null default now(),
  constraint questions_id_exploration_key unique (id, exploration_id),
  constraint questions_position_check check (position >= 0),
  constraint questions_position_unique unique (exploration_id, position),
  constraint questions_text_check check (
    question_text = btrim(question_text)
    and char_length(question_text) between 1 and 2000
  ),
  constraint questions_role_check check (role in ('central', 'satellite')),
  constraint questions_central_stays_visible check (role <> 'central' or is_hidden = false),
  constraint questions_origin_check check (
    perspective_origin is null
    or perspective_origin in ('investigate', 'reframe', 'connect', 'challenge')
  )
);

create unique index questions_one_central
  on public.questions (exploration_id)
  where role = 'central';

comment on table public.questions is
  'One question belongs to one exploration. Hiding and priority do not delete theme or investigation links.';

create or replace function public.assign_question_position()
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

  select coalesce(max(questions.position) + 1, 0)
    into new.position
  from public.questions
  where questions.exploration_id = new.exploration_id;

  return new;
end;
$$;

create trigger questions_assign_position
before insert on public.questions
for each row
execute function public.assign_question_position();

create or replace function public.validate_question_rules()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_mode text;
begin
  select explorations.mode
    into parent_mode
  from public.explorations
  where explorations.id = new.exploration_id;

  if parent_mode is null then
    raise exception 'exploration not found' using errcode = '23503';
  end if;

  if tg_op = 'UPDATE' and new.exploration_id is distinct from old.exploration_id then
    raise exception 'a question cannot move to another exploration' using errcode = '23514';
  end if;

  -- Quickfire questions are satellites with no perspective, on insert and update.
  if parent_mode = 'quickfire' and new.role is distinct from 'satellite' then
    raise exception 'quickfire questions are satellites' using errcode = '23514';
  end if;

  if parent_mode = 'quickfire' and new.perspective_origin is not null then
    raise exception 'quickfire questions cannot have a perspective origin' using errcode = '23514';
  end if;

  -- At most one central question. Whether Focus must always have exactly one
  -- central question is unresolved. This check does not demote or promote a
  -- question to produce that outcome.
  if parent_mode = 'focus' and exists (
    select 1
    from public.questions
    where questions.exploration_id = new.exploration_id
      and questions.role = 'central'
      and questions.id is distinct from new.id
  ) and new.role is distinct from 'satellite' then
    raise exception 'a focus exploration can have only one central question' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and parent_mode = 'focus' and not exists (
    select 1
    from public.questions
    where questions.exploration_id = new.exploration_id
      and questions.role = 'central'
      and questions.id is distinct from new.id
  ) and new.role is distinct from 'central' then
    raise exception 'the first focus question must be central' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and new.is_prioritised then
    raise exception 'new questions are not prioritised' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger questions_validate_rules
before insert or update on public.questions
for each row
execute function public.validate_question_rules();

create or replace function public.prevent_hiding_last_visible_question()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.is_hidden then
    return new;
  end if;

  if new.role = 'central' then
    return new;
  end if;

  perform 1
  from public.explorations
  where explorations.id = new.exploration_id
  for update;

  if not exists (
    select 1
    from public.questions
    where questions.exploration_id = new.exploration_id
      and questions.id is distinct from new.id
      and not questions.is_hidden
  ) then
    raise exception 'the last visible question cannot be hidden' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger questions_prevent_hiding_last_visible
before insert or update of is_hidden on public.questions
for each row
when (new.is_hidden)
execute function public.prevent_hiding_last_visible_question();

create or replace function public.protect_exploration_row()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'exploration owner cannot be changed' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' and new.status is distinct from 'completed' then
    raise exception 'a completed exploration stays completed' using errcode = '23514';
  end if;

  -- Mode changes do not rewrite question rows.
  -- Quickfire accepts the change only when every question is already a
  -- satellite with no perspective origin.
  -- Focus accepts the change without requiring a central question.
  -- UNRESOLVED: whether Focus must always contain exactly one central question.
  if tg_op = 'UPDATE' and new.mode is distinct from old.mode and new.mode = 'quickfire' then
    if exists (
      select 1
      from public.questions
      where questions.exploration_id = new.id
        and (
          questions.role is distinct from 'satellite'
          or questions.perspective_origin is not null
        )
    ) then
      raise exception 'quickfire requires every question to be a satellite without a perspective origin'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'active' and new.status = 'completed' then
    new.ended_at := now();
  elsif new.status = 'completed' and new.ended_at is null then
    new.ended_at := coalesce(old.ended_at, now());
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create trigger explorations_protect_row
before update on public.explorations
for each row
execute function public.protect_exploration_row();

create or replace function public.touch_exploration()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target uuid := coalesce(new.exploration_id, old.exploration_id);
begin
  update public.explorations
  set updated_at = now()
  where explorations.id = target;

  return coalesce(new, old);
end;
$$;

create trigger questions_touch_exploration
after insert or update or delete on public.questions
for each row
execute function public.touch_exploration();

create or replace function public.enforce_exploration_has_question()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_table_name = 'explorations' then
    target := coalesce(new.id, old.id);
  elsif tg_table_name = 'questions' then
    target := coalesce(new.exploration_id, old.exploration_id);
  else
    raise exception 'exploration check used on an unexpected table' using errcode = '55000';
  end if;

  if exists (select 1 from public.explorations where explorations.id = target)
     and not exists (
       select 1 from public.questions where questions.exploration_id = target
     ) then
    raise exception 'exploration must contain at least one question' using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger explorations_require_question
after insert on public.explorations
deferrable initially deferred
for each row
execute function public.enforce_exploration_has_question();

create constraint trigger questions_keep_exploration_nonempty
after delete on public.questions
deferrable initially deferred
for each row
execute function public.enforce_exploration_has_question();

create or replace function public.create_exploration_with_first_question(
  p_exploration_id uuid,
  p_question_id uuid,
  p_mode text,
  p_question_text text,
  p_role text,
  p_title text default null,
  p_perspective_origin text default null
)
returns public.explorations
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  clean_title text;
  clean_text text;
  created public.explorations;
begin
  if owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_mode is null or p_mode not in ('quickfire', 'focus') then
    raise exception 'invalid mode' using errcode = '23514';
  end if;

  if p_role is null or p_role not in ('central', 'satellite') then
    raise exception 'invalid role' using errcode = '23514';
  end if;

  if p_mode = 'focus' and p_role is distinct from 'central' then
    raise exception 'the first focus question must be central' using errcode = '23514';
  end if;

  if p_mode = 'quickfire' and p_role is distinct from 'satellite' then
    raise exception 'quickfire questions are satellites' using errcode = '23514';
  end if;

  if p_perspective_origin is not null
     and p_perspective_origin not in ('investigate', 'reframe', 'connect', 'challenge') then
    raise exception 'invalid perspective origin' using errcode = '23514';
  end if;

  if p_mode = 'quickfire' and p_perspective_origin is not null then
    raise exception 'quickfire questions cannot have a perspective origin' using errcode = '23514';
  end if;

  clean_text := btrim(p_question_text);
  if clean_text is null or char_length(clean_text) < 1 or char_length(clean_text) > 2000 then
    raise exception 'invalid question text' using errcode = '23514';
  end if;

  if p_title is null or btrim(p_title) = '' then
    clean_title := null;
  else
    clean_title := btrim(p_title);
    if char_length(clean_title) > 120 then
      raise exception 'invalid title' using errcode = '23514';
    end if;
  end if;

  insert into public.explorations (id, user_id, title, mode, status)
  values (p_exploration_id, owner, clean_title, p_mode, 'active');

  insert into public.questions (
    id,
    exploration_id,
    question_text,
    role,
    perspective_origin,
    is_prioritised
  )
  values (
    p_question_id,
    p_exploration_id,
    clean_text,
    p_role,
    p_perspective_origin,
    false
  );

  select explorations.*
    into created
  from public.explorations
  where explorations.id = p_exploration_id;

  return created;
end;
$$;

create table public.themes (
  id uuid primary key,
  exploration_id uuid not null references public.explorations (id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_id_exploration_key unique (id, exploration_id),
  constraint themes_position_check check (position >= 0),
  constraint themes_position_unique unique (exploration_id, position),
  constraint themes_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 120
  )
);

comment on table public.themes is
  'Optional grouping inside one exploration. A theme may contain no questions. Deleting a theme does not delete questions.';

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

create trigger themes_touch_exploration
after insert or update or delete on public.themes
for each row
execute function public.touch_exploration();

create table public.theme_questions (
  theme_id uuid not null,
  question_id uuid not null,
  exploration_id uuid not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (theme_id, question_id),
  constraint theme_questions_position_check check (position >= 0),
  constraint theme_questions_position_unique unique (theme_id, position),
  constraint theme_questions_theme_exploration_fkey
    foreign key (theme_id, exploration_id)
    references public.themes (id, exploration_id) on delete cascade,
  constraint theme_questions_question_exploration_fkey
    foreign key (question_id, exploration_id)
    references public.questions (id, exploration_id) on delete cascade
);

comment on table public.theme_questions is
  'Optional many-to-many membership. Both rows must belong to the same exploration.';

create index theme_questions_question_idx
  on public.theme_questions (question_id);

create index theme_questions_exploration_idx
  on public.theme_questions (exploration_id);

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

create trigger theme_questions_touch_exploration
after insert or update or delete on public.theme_questions
for each row
execute function public.touch_exploration();

create table public.investigations (
  id uuid primary key,
  exploration_id uuid not null references public.explorations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investigations_id_exploration_key unique (id, exploration_id)
);

comment on table public.investigations is
  'Deliberate investigation inside one exploration. Questions are linked separately and are not required by this table.';

create index investigations_exploration_idx
  on public.investigations (exploration_id);

create or replace function public.investigations_protect_row()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.exploration_id is distinct from old.exploration_id then
    raise exception 'an investigation cannot move to another exploration' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger investigations_protect_row
before update on public.investigations
for each row
execute function public.investigations_protect_row();

create trigger investigations_touch_exploration
after insert or update or delete on public.investigations
for each row
execute function public.touch_exploration();

create table public.investigation_questions (
  investigation_id uuid not null,
  question_id uuid not null,
  exploration_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (investigation_id, question_id),
  constraint investigation_questions_investigation_exploration_fkey
    foreign key (investigation_id, exploration_id)
    references public.investigations (id, exploration_id) on delete cascade,
  constraint investigation_questions_question_exploration_fkey
    foreign key (question_id, exploration_id)
    references public.questions (id, exploration_id) on delete cascade
);

comment on table public.investigation_questions is
  'Many-to-many link. Deleting a question removes the link and leaves the investigation. There is no single original question.';

create index investigation_questions_question_idx
  on public.investigation_questions (question_id);

create index investigation_questions_exploration_idx
  on public.investigation_questions (exploration_id);

create or replace function public.investigation_questions_protect_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.investigation_id is distinct from old.investigation_id
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

create trigger investigation_questions_touch_exploration
after insert or update or delete on public.investigation_questions
for each row
execute function public.touch_exploration();

create table public.investigation_items (
  id uuid primary key,
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  position integer not null,
  kind text not null,
  body text not null,
  related_item_id uuid,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investigation_items_position_check check (position >= 0),
  constraint investigation_items_position_unique unique (investigation_id, position),
  constraint investigation_items_kind_check check (
    kind in ('concept', 'note', 'hypothesis', 'test', 'observation', 'discovery')
  ),
  constraint investigation_items_body_check check (
    body = btrim(body)
    and char_length(body) between 1 and 2000
  ),
  constraint investigation_items_not_self check (
    related_item_id is null or related_item_id <> id
  ),
  -- NO ACTION is the delete action that can wait until commit.
  -- RESTRICT is checked as soon as the referenced row disappears, so a
  -- deferrable mark would not let an investigation cascade through this set.
  -- At commit, no remaining row may point at a deleted item. Deleting the
  -- investigation removes the whole set before that check. Deleting one
  -- referenced item while another item still points at it fails the check.
  constraint investigation_items_related_fkey
    foreign key (related_item_id)
    references public.investigation_items (id)
    on delete no action
    deferrable initially deferred,
  constraint investigation_items_image_path_check check (
    image_path is null
    or (
      kind in ('concept', 'note', 'hypothesis', 'test', 'observation', 'discovery')
      and image_path = btrim(image_path)
      and split_part(image_path, '/', 2) = investigation_id::text
      and split_part(image_path, '/', 3) = id::text
      and image_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
    )
  )
);

comment on table public.investigation_items is
  'Typed items belonging to one investigation. related_item_id stays in that investigation. '
  'investigation_items_related_fkey is ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED.';

create index investigation_items_investigation_idx
  on public.investigation_items (investigation_id, position);

create or replace function public.investigation_items_assign_position()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform 1
  from public.investigations
  where investigations.id = new.investigation_id
  for update;

  select coalesce(max(investigation_items.position) + 1, 0)
    into new.position
  from public.investigation_items
  where investigation_items.investigation_id = new.investigation_id;

  return new;
end;
$$;

create trigger investigation_items_assign_position
before insert on public.investigation_items
for each row
execute function public.investigation_items_assign_position();

create or replace function public.investigation_items_match_parent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_investigation uuid;
  cursor_id uuid;
  depth integer := 0;
begin
  if tg_op = 'UPDATE' and new.investigation_id is distinct from old.investigation_id then
    raise exception 'an investigation item cannot move between investigations' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  if new.related_item_id is null then
    return new;
  end if;

  select investigation_items.investigation_id
    into parent_investigation
  from public.investigation_items
  where investigation_items.id = new.related_item_id;

  if parent_investigation is null or parent_investigation <> new.investigation_id then
    raise exception 'related item must belong to the same investigation' using errcode = '23514';
  end if;

  cursor_id := new.related_item_id;
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'investigation items cannot form a cycle' using errcode = '23514';
    end if;
    depth := depth + 1;
    if depth > 32 then
      raise exception 'investigation item link is too deep' using errcode = '23514';
    end if;
    select investigation_items.related_item_id
      into cursor_id
    from public.investigation_items
    where investigation_items.id = cursor_id;
  end loop;

  return new;
end;
$$;

create trigger investigation_items_match_parent
before insert or update on public.investigation_items
for each row
execute function public.investigation_items_match_parent();

create or replace function public.investigation_items_image_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner uuid;
begin
  if new.image_path is null then
    return new;
  end if;

  select explorations.user_id
    into owner
  from public.investigations
  join public.explorations on explorations.id = investigations.exploration_id
  where investigations.id = new.investigation_id;

  if owner is null or split_part(new.image_path, '/', 1) <> owner::text then
    raise exception 'thumbnail path must belong to the exploration owner' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger investigation_items_image_owner
before insert or update on public.investigation_items
for each row
execute function public.investigation_items_image_owner();

create or replace function public.touch_investigation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.investigations
  set updated_at = now()
  where investigations.id = coalesce(new.investigation_id, old.investigation_id);

  return coalesce(new, old);
end;
$$;

create trigger investigation_items_touch_investigation
after insert or update or delete on public.investigation_items
for each row
execute function public.touch_investigation();

alter table public.explorations enable row level security;
alter table public.explorations force row level security;
alter table public.questions enable row level security;
alter table public.questions force row level security;
alter table public.themes enable row level security;
alter table public.themes force row level security;
alter table public.theme_questions enable row level security;
alter table public.theme_questions force row level security;
alter table public.investigations enable row level security;
alter table public.investigations force row level security;
alter table public.investigation_questions enable row level security;
alter table public.investigation_questions force row level security;
alter table public.investigation_items enable row level security;
alter table public.investigation_items force row level security;

create policy explorations_select
on public.explorations
for select
to authenticated
using (user_id = (select auth.uid()));

create policy explorations_insert
on public.explorations
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy explorations_update
on public.explorations
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy explorations_delete
on public.explorations
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy questions_select
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy questions_insert
on public.questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy questions_update
on public.questions
for update
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy questions_delete
on public.questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = questions.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

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

create policy investigations_select
on public.investigations
for select
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = investigations.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigations_insert
on public.investigations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = investigations.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigations_update
on public.investigations
for update
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = investigations.exploration_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.explorations
    where explorations.id = investigations.exploration_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigations_delete
on public.investigations
for delete
to authenticated
using (
  exists (
    select 1
    from public.explorations
    where explorations.id = investigations.exploration_id
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
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_questions.investigation_id
      and investigations.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
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
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_questions.investigation_id
      and investigations.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
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
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_questions.investigation_id
      and investigations.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
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
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_questions.investigation_id
      and investigations.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
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
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_questions.investigation_id
      and investigations.exploration_id = investigation_questions.exploration_id
      and explorations.user_id = (select auth.uid())
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

create policy investigation_items_select
on public.investigation_items
for select
to authenticated
using (
  exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_items.investigation_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_items_insert
on public.investigation_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_items.investigation_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_items_update
on public.investigation_items
for update
to authenticated
using (
  exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_items.investigation_id
      and explorations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_items.investigation_id
      and explorations.user_id = (select auth.uid())
  )
);

create policy investigation_items_delete
on public.investigation_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where investigations.id = investigation_items.investigation_id
      and explorations.user_id = (select auth.uid())
  )
);

revoke all on table public.explorations from public, anon, service_role;
revoke all on table public.questions from public, anon, service_role;
revoke all on table public.themes from public, anon, service_role;
revoke all on table public.theme_questions from public, anon, service_role;
revoke all on table public.investigations from public, anon, service_role;
revoke all on table public.investigation_questions from public, anon, service_role;
revoke all on table public.investigation_items from public, anon, service_role;

grant select, insert, update, delete on public.explorations to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.themes to authenticated;
grant select, insert, update, delete on public.theme_questions to authenticated;
grant select, insert, update, delete on public.investigations to authenticated;
grant select, insert, update, delete on public.investigation_questions to authenticated;
grant select, insert, update, delete on public.investigation_items to authenticated;

revoke all on function public.assign_question_position() from public, anon, service_role;
revoke all on function public.validate_question_rules() from public, anon, service_role;
revoke all on function public.prevent_hiding_last_visible_question() from public, anon, service_role;
revoke all on function public.protect_exploration_row() from public, anon, service_role;
revoke all on function public.touch_exploration() from public, anon, service_role;
revoke all on function public.enforce_exploration_has_question() from public, anon, service_role;
revoke all on function public.create_exploration_with_first_question(uuid, uuid, text, text, text, text, text) from public, anon, service_role;
revoke all on function public.themes_assign_position() from public, anon, service_role;
revoke all on function public.themes_protect_row() from public, anon, service_role;
revoke all on function public.theme_questions_assign_position() from public, anon, service_role;
revoke all on function public.theme_questions_protect_link() from public, anon, service_role;
revoke all on function public.investigations_protect_row() from public, anon, service_role;
revoke all on function public.investigation_questions_protect_link() from public, anon, service_role;
revoke all on function public.investigation_items_assign_position() from public, anon, service_role;
revoke all on function public.investigation_items_match_parent() from public, anon, service_role;
revoke all on function public.investigation_items_image_owner() from public, anon, service_role;
revoke all on function public.touch_investigation() from public, anon, service_role;

grant execute on function public.assign_question_position() to authenticated;
grant execute on function public.validate_question_rules() to authenticated;
grant execute on function public.prevent_hiding_last_visible_question() to authenticated;
grant execute on function public.protect_exploration_row() to authenticated;
grant execute on function public.touch_exploration() to authenticated;
grant execute on function public.enforce_exploration_has_question() to authenticated;
grant execute on function public.create_exploration_with_first_question(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.themes_assign_position() to authenticated;
grant execute on function public.themes_protect_row() to authenticated;
grant execute on function public.theme_questions_assign_position() to authenticated;
grant execute on function public.theme_questions_protect_link() to authenticated;
grant execute on function public.investigations_protect_row() to authenticated;
grant execute on function public.investigation_questions_protect_link() to authenticated;
grant execute on function public.investigation_items_assign_position() to authenticated;
grant execute on function public.investigation_items_match_parent() to authenticated;
grant execute on function public.investigation_items_image_owner() to authenticated;
grant execute on function public.touch_investigation() to authenticated;

-- Private storage for the separate project. Objects are not copied from V1.
-- Paths store object names, not image bytes.
-- exploration-images: {user_id}/{exploration_id}/{file}.png|jpeg|webp, 5 MiB.
-- investigation-thumbnails: {user_id}/{investigation_id}/{item_id}/{file}.webp, 150 KiB.
-- Story artwork and video have no bucket.
--
-- This schema does not delete files. The application reads focus_image_path and
-- image_path, commits the row delete or path change, then calls the Storage
-- API as the signed-in user. Do not DELETE FROM storage.objects. That edits
-- metadata and is not a substitute for removing the file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'exploration-images', 'exploration-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']
where not exists (select 1 from storage.buckets where id = 'exploration-images');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'investigation-thumbnails', 'investigation-thumbnails', false, 153600, array['image/webp']
where not exists (select 1 from storage.buckets where id = 'investigation-thumbnails');

create or replace function public.exploration_image_owner(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select
    (storage.foldername(object_name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.explorations
      where explorations.user_id = (select auth.uid())
        and explorations.id::text = (storage.foldername(object_name))[2]
    );
$$;

create or replace function public.investigation_thumbnail_owner(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select
    (storage.foldername(object_name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.investigations
      join public.explorations on explorations.id = investigations.exploration_id
      where explorations.user_id = (select auth.uid())
        and investigations.id::text = (storage.foldername(object_name))[2]
    )
    and exists (
      select 1
      from public.investigation_items
      join public.investigations on investigations.id = investigation_items.investigation_id
      join public.explorations on explorations.id = investigations.exploration_id
      where explorations.user_id = (select auth.uid())
        and investigation_items.investigation_id::text = (storage.foldername(object_name))[2]
        and investigation_items.id::text = (storage.foldername(object_name))[3]
    );
$$;

revoke all on function public.exploration_image_owner(text) from public, anon, service_role;
revoke all on function public.investigation_thumbnail_owner(text) from public, anon, service_role;
grant execute on function public.exploration_image_owner(text) to authenticated;
grant execute on function public.investigation_thumbnail_owner(text) to authenticated;

create policy exploration_images_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'exploration-images'
  and public.exploration_image_owner(name)
);

create policy exploration_images_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'exploration-images'
  and public.exploration_image_owner(name)
);

create policy exploration_images_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'exploration-images'
  and public.exploration_image_owner(name)
)
with check (
  bucket_id = 'exploration-images'
  and public.exploration_image_owner(name)
);

create policy exploration_images_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'exploration-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.explorations
    where explorations.user_id = (select auth.uid())
      and explorations.id::text = (storage.foldername(name))[2]
  )
);

create policy investigation_thumbnails_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'investigation-thumbnails'
  and public.investigation_thumbnail_owner(name)
);

create policy investigation_thumbnails_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'investigation-thumbnails'
  and public.investigation_thumbnail_owner(name)
);

create policy investigation_thumbnails_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'investigation-thumbnails'
  and public.investigation_thumbnail_owner(name)
)
with check (
  bucket_id = 'investigation-thumbnails'
  and public.investigation_thumbnail_owner(name)
);

create policy investigation_thumbnails_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'investigation-thumbnails'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.investigations
    join public.explorations on explorations.id = investigations.exploration_id
    where explorations.user_id = (select auth.uid())
      and investigations.id::text = (storage.foldername(name))[2]
  )
);

-- Recovery is not part of the forward migration. Leave these lines commented.
-- Use them only when this file was applied outside the CLI transaction and
-- stopped partway, on a database that should not keep a partial V2 schema.
-- On a disposable local stack, supabase db reset from that scratch project
-- is the recovery instead. Never point it at V1 or a hosted project.
--
-- Do not delete storage.objects here. If either bucket contains a file,
-- remove that file with the Storage API first. Dropping an empty bucket row
-- is only for a failed apply that created no files:
--
-- drop policy if exists investigation_thumbnails_delete on storage.objects;
-- drop policy if exists investigation_thumbnails_update on storage.objects;
-- drop policy if exists investigation_thumbnails_insert on storage.objects;
-- drop policy if exists investigation_thumbnails_select on storage.objects;
-- drop policy if exists exploration_images_delete on storage.objects;
-- drop policy if exists exploration_images_update on storage.objects;
-- drop policy if exists exploration_images_insert on storage.objects;
-- drop policy if exists exploration_images_select on storage.objects;
-- drop function if exists public.investigation_thumbnail_owner(text);
-- drop function if exists public.exploration_image_owner(text);
-- delete from storage.buckets
-- where id in ('exploration-images', 'investigation-thumbnails')
--   and not exists (
--     select 1 from storage.objects
--     where objects.bucket_id = buckets.id
--   );
-- drop table if exists public.investigation_items;
-- drop table if exists public.investigation_questions;
-- drop table if exists public.investigations;
-- drop table if exists public.theme_questions;
-- drop table if exists public.themes;
-- drop table if exists public.questions;
-- drop table if exists public.explorations;
-- drop function if exists public.touch_investigation();
-- drop function if exists public.investigation_items_image_owner();
-- drop function if exists public.investigation_items_match_parent();
-- drop function if exists public.investigation_items_assign_position();
-- drop function if exists public.investigation_questions_protect_link();
-- drop function if exists public.investigations_protect_row();
-- drop function if exists public.theme_questions_protect_link();
-- drop function if exists public.theme_questions_assign_position();
-- drop function if exists public.themes_protect_row();
-- drop function if exists public.themes_assign_position();
-- drop function if exists public.create_exploration_with_first_question(uuid, uuid, text, text, text, text, text);
-- drop function if exists public.enforce_exploration_has_question();
-- drop function if exists public.touch_exploration();
-- drop function if exists public.protect_exploration_row();
-- drop function if exists public.prevent_hiding_last_visible_question();
-- drop function if exists public.validate_question_rules();
-- drop function if exists public.assign_question_position();

