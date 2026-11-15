-- One Experience for each curiosity.
-- Do not apply this file to the production project dacfaoksxfqztnswmnfm.
-- Leave it unapplied until a separate development Supabase project exists.
-- On a fresh development project, apply the earlier Curitopia migrations first.
-- This file then uses set_updated_at and prevent_user_id_change from the
-- initial schema, and prevent_curiosity_id_change plus curiosities(id, user_id)
-- from the curiosities migration. It does not read question branches or cover images.
-- Do not apply it by pushing the whole migration folder to production: the
-- cover-image and question-branch files are not in the production history and must not run.
-- This file does not alter curiosities.stage, questions, concepts, or storage.

create table public.experiences (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  curiosity_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_owner_key unique (id, user_id),
  constraint experiences_one_curiosity unique (curiosity_id),
  constraint experiences_curiosity_owner
    foreign key (curiosity_id, user_id)
    references public.curiosities (id, user_id)
    on delete cascade
);

comment on table public.experiences is
  'One evolving experience for a curiosity. It is not a workspace stage and does not change curiosities.stage.';

comment on column public.experiences.curiosity_id is
  'The curiosity this experience belongs to. Immutable after insert.';

create index experiences_user_id_idx on public.experiences (user_id);

create trigger experiences_set_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();

create trigger experiences_user_id_immutable
  before update on public.experiences
  for each row execute function public.prevent_user_id_change();

create trigger experiences_curiosity_id_immutable
  before update on public.experiences
  for each row execute function public.prevent_curiosity_id_change();

revoke all on table public.experiences from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.experiences to authenticated;

alter table public.experiences enable row level security;

create policy experiences_select on public.experiences
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy experiences_insert on public.experiences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy experiences_update on public.experiences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy experiences_delete on public.experiences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy experiences_curiosity_membership on public.experiences
  as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = experiences.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.curiosities as curiosity
      where curiosity.id = experiences.curiosity_id
        and curiosity.user_id = (select auth.uid())
    )
  );
