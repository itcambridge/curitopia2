-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- It belonged to the withdrawn plan to roll back additive changes on a copy of the V1 schema.
-- The current persistence design is v2-revised-schema-proposal.md.
--
-- Local backfill check and phase-1 rollback.
-- Run after v2-phase1-local-seed.sql and the first apply of the draft.
-- Re-apply the draft before the behaviour test. Do not run this on a hosted database.

do $$
declare
  experiments_n integer;
  legacy_links_n integer;
  theme_n integer;
begin
  if to_regclass('public.investigation_questions') is null then
    raise exception 'rollback check: investigation_questions is absent; apply the draft first';
  end if;

  select count(*) into experiments_n from public.experiments;
  select count(*) into legacy_links_n
  from public.investigation_questions iq
  join public.experiments e
    on e.id = iq.experiment_id
   and e.question_id = iq.question_id
   and e.exploration_id = iq.exploration_id;
  select count(*) into theme_n from public.themes;

  if experiments_n < 2 or legacy_links_n <> experiments_n or theme_n <> 0 then
    raise exception
      'rollback check: % experiments, % original links, % themes',
      experiments_n, legacy_links_n, theme_n;
  end if;
end $$;

begin;
drop trigger if exists experiments_sync_question_link on public.experiments;
drop trigger if exists experiments_require_question_link on public.experiments;
drop table if exists public.investigation_questions;
drop table if exists public.theme_questions;
drop table if exists public.themes;
drop function if exists public.experiments_sync_question_link();
drop function if exists public.experiments_require_question_link();
drop function if exists public.investigation_questions_protect_link();
drop function if exists public.investigation_questions_keep_legacy_link();
drop function if exists public.theme_questions_assign_position();
drop function if exists public.theme_questions_protect_link();
drop function if exists public.themes_assign_position();
drop function if exists public.themes_protect_row();
alter table public.questions drop constraint if exists questions_id_exploration_key;
alter table public.experiments drop constraint if exists experiments_id_exploration_key;
commit;

do $$
declare
  experiments_n integer;
begin
  if to_regclass('public.themes') is not null
     or to_regclass('public.theme_questions') is not null
     or to_regclass('public.investigation_questions') is not null
  then
    raise exception 'rollback check: a phase-1 table is still present';
  end if;

  select count(*) into experiments_n from public.experiments;
  if experiments_n < 2 then
    raise exception 'rollback check: experiments were removed';
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
    raise exception 'rollback check: experiments_one_question is absent';
  end if;
end $$;
