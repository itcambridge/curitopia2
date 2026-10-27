-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- It belonged to the withdrawn plan to backfill the V1 database.
-- The current persistence design is v2-revised-schema-proposal.md.
--
-- Local seed for the phase-1 backfill check.
-- Run on a disposable Supabase database after the V1 migrations and before the draft.
-- Fixed ids make a repeat safe. This file does not touch a hosted database.
-- One transaction: an exploration cannot commit without its first question.

begin;

insert into auth.users (
  id,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  'phase1-seed@curitopia.test',
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.explorations (id, user_id, title, mode, status)
values (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Seed',
  'focus',
  'active'
)
on conflict (id) do nothing;

insert into public.questions (id, exploration_id, question_text, role)
values (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  'Seed central question',
  'central'
)
on conflict (id) do nothing;

insert into public.questions (id, exploration_id, question_text, role)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000002',
  'Seed second question',
  'satellite'
)
on conflict (id) do nothing;

insert into public.experiments (id, user_id, exploration_id, question_id)
values
  (
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004'
  )
on conflict (id) do nothing;

commit;
