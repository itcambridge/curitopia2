-- North Star and circle notes for an existing Experience.
-- Do not apply this file to the production project dacfaoksxfqztnswmnfm.
-- Do not apply it by pushing the whole migration folder to production: the
-- cover-image and question-branch files are not in the production history and must not run.
-- Apply it to the development project only after review, and only after
-- 20261113200000_experiences.sql.
-- This file uses set_updated_at and prevent_user_id_change from the initial
-- schema, and experiences(id, user_id) from the experiences migration.
-- This file does not alter curiosities.stage, questions, concepts, or storage.
-- It does not generate, classify, or rewrite a person's words.

alter table public.experiences
  add column north_star text;

alter table public.experiences
  add constraint experiences_north_star_shape
  check (
    north_star is null
    or (
      char_length(north_star) between 1 and 400
      and north_star = btrim(north_star)
    )
  );

comment on column public.experiences.north_star is
  'The person''s optional direction for this experience. One current wording. They write, edit, and clear it.';

create or replace function public.prevent_experience_id_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.experience_id is distinct from old.experience_id then
    raise exception 'experience_id is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_experience_id_change() from public, anon, service_role;

grant execute on function public.prevent_experience_id_change() to authenticated;

create table public.experience_circle_items (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  experience_id uuid not null,
  circle text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_circle_items_owner_key unique (id, user_id),
  constraint experience_circle_items_circle_known
    check (circle in ('concern', 'influence', 'control')),
  constraint experience_circle_items_body_shape
    check (
      char_length(body) between 1 and 240
      and body = btrim(body)
    ),
  constraint experience_circle_items_experience_owner
    foreign key (experience_id, user_id)
    references public.experiences (id, user_id)
    on delete cascade
);

comment on table public.experience_circle_items is
  'A short note in one circle of an experience. It is not a task.';

comment on column public.experience_circle_items.experience_id is
  'The experience this note belongs to. Immutable after insert.';

comment on column public.experience_circle_items.circle is
  'Concern, influence, or control. The person can move the note by changing this.';

comment on column public.experience_circle_items.body is
  'The person''s own wording. The application does not rewrite it.';

create index experience_circle_items_user_id_idx
  on public.experience_circle_items (user_id);

create index experience_circle_items_experience_idx
  on public.experience_circle_items (experience_id, created_at);

create trigger experience_circle_items_set_updated_at
  before update on public.experience_circle_items
  for each row execute function public.set_updated_at();

create trigger experience_circle_items_user_id_immutable
  before update on public.experience_circle_items
  for each row execute function public.prevent_user_id_change();

create trigger experience_circle_items_experience_id_immutable
  before update on public.experience_circle_items
  for each row execute function public.prevent_experience_id_change();

revoke all on table public.experience_circle_items from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.experience_circle_items to authenticated;

alter table public.experience_circle_items enable row level security;

create policy experience_circle_items_select on public.experience_circle_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy experience_circle_items_insert on public.experience_circle_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy experience_circle_items_update on public.experience_circle_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy experience_circle_items_delete on public.experience_circle_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy experience_circle_items_experience_membership on public.experience_circle_items
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.experiences as experience
      where experience.id = experience_circle_items.experience_id
        and experience.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.experiences as experience
      where experience.id = experience_circle_items.experience_id
        and experience.user_id = (select auth.uid())
    )
  );
