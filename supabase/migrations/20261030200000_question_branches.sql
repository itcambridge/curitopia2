-- Additive branches between two questions in the same curiosity.
-- Do not edit or rerun earlier migrations.
-- Do not apply this file until it has been reviewed.
-- A branch does not merge, rewrite, replace, or delete either question.
-- Question wording, curation, and merge pointers are left untouched.

create table public.question_branches (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  curiosity_id uuid not null,
  question_low_id uuid not null,
  question_high_id uuid not null,
  created_at timestamptz not null default now(),
  constraint question_branches_ordered check (question_low_id < question_high_id),
  constraint question_branches_pair unique (question_low_id, question_high_id),
  constraint question_branches_curiosity_owner
    foreign key (curiosity_id, user_id)
    references public.curiosities (id, user_id)
    on delete cascade,
  constraint question_branches_low_question
    foreign key (question_low_id, user_id, curiosity_id)
    references public.questions (id, user_id, curiosity_id)
    on delete cascade,
  constraint question_branches_high_question
    foreign key (question_high_id, user_id, curiosity_id)
    references public.questions (id, user_id, curiosity_id)
    on delete cascade
);

comment on table public.question_branches is
  'An undirected branch between two questions. Both questions remain independent.';

create index question_branches_curiosity_idx
  on public.question_branches (curiosity_id, created_at);

revoke all on table public.question_branches from public, anon, service_role;

grant select, insert, delete on table public.question_branches to authenticated;

alter table public.question_branches enable row level security;

create policy question_branches_select on public.question_branches
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy question_branches_insert on public.question_branches
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy question_branches_delete on public.question_branches
  for delete to authenticated
  using ((select auth.uid()) = user_id);
