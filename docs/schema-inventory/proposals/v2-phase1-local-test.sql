-- SUPERSEDED. NOT FOR V2 DEPLOYMENT. DO NOT RUN THIS FILE.
-- It belonged to the withdrawn plan to test additive changes on a copy of the V1 schema.
-- The current persistence design is v2-revised-schema-proposal.md.
--
-- Local behaviour test for the phase-1 draft.
-- Run after the draft is applied on a disposable Supabase database.
-- The transaction rolls back, including the temporary revoke of execute.
-- Deferred checks are set immediate before that rollback so they actually run.
-- This file does not connect to a hosted database.
-- It has not passed until this file has been executed successfully.

begin;

do $test$
declare
  owner uuid := '20000000-0000-4000-8000-000000000001';
  other uuid := '20000000-0000-4000-8000-000000000002';
  exploration uuid := '20000000-0000-4000-8000-000000000011';
  exploration_b uuid := '20000000-0000-4000-8000-000000000012';
  other_exploration uuid := '20000000-0000-4000-8000-000000000013';
  q_central uuid := '20000000-0000-4000-8000-000000000021';
  q_extra uuid := '20000000-0000-4000-8000-000000000022';
  q_third uuid := '20000000-0000-4000-8000-000000000023';
  q_b uuid := '20000000-0000-4000-8000-000000000024';
  q_other uuid := '20000000-0000-4000-8000-000000000025';
  experiment uuid := '20000000-0000-4000-8000-000000000031';
  experiment_third uuid := '20000000-0000-4000-8000-000000000032';
  experiment_dup uuid := '20000000-0000-4000-8000-000000000033';
  theme uuid := '20000000-0000-4000-8000-000000000041';
  theme_extra uuid := '20000000-0000-4000-8000-000000000042';
  theme_same_name uuid := '20000000-0000-4000-8000-000000000043';
  item uuid := '20000000-0000-4000-8000-000000000051';
  seen integer;
  affected integer;
begin
  if has_function_privilege('authenticated', 'public.experiments_match_origin()', 'execute') then
    raise exception 'authenticated still has execute on experiments_match_origin';
  end if;
  if has_table_privilege('service_role', 'public.investigation_questions', 'insert')
     or has_table_privilege('service_role', 'public.themes', 'select')
     or has_table_privilege('anon', 'public.investigation_questions', 'select')
     or has_table_privilege('anon', 'public.theme_questions', 'select')
  then
    raise exception 'anon or service_role has a privilege on a phase-1 table';
  end if;

  insert into auth.users (
    id, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  )
  values
    (owner, 'phase1-owner@curitopia.test', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (other, 'phase1-other@curitopia.test', '{}'::jsonb, '{}'::jsonb, now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', owner::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';

  perform public.create_exploration_with_first_question(
    exploration, q_central, 'focus', 'Behaviour central question', 'central', 'Behaviour', null
  );
  insert into public.questions (id, exploration_id, question_text, role)
  values (q_extra, exploration, 'Behaviour extra question', 'satellite');
  insert into public.questions (id, exploration_id, question_text, role)
  values (q_third, exploration, 'Behaviour third question', 'satellite');
  perform public.create_exploration_with_first_question(
    exploration_b, q_b, 'focus', 'Behaviour other exploration question', 'central', 'Behaviour B', null
  );

  insert into public.experiments (id, user_id, exploration_id, question_id)
  values (experiment, owner, exploration, q_central);
  if not exists (
    select 1 from public.investigation_questions
    where experiment_id = experiment and question_id = q_central and exploration_id = exploration
  ) then
    raise exception 'original link was not created for the first experiment';
  end if;

  reset role;
  revoke execute on function public.experiments_sync_question_link() from authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', owner::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';

  insert into public.experiments (id, user_id, exploration_id, question_id)
  values (experiment_third, owner, exploration, q_third);
  if not exists (
    select 1 from public.investigation_questions
    where experiment_id = experiment_third and question_id = q_third
  ) then
    raise exception 'sync trigger did not fire after execute was revoked';
  end if;

  reset role;
  grant execute on function public.experiments_sync_question_link() to authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', owner::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.experiments (id, user_id, exploration_id, question_id)
    values (experiment_dup, owner, exploration, q_central);
    raise exception 'second experiment for the same question was allowed';
  exception
    when unique_violation then
      null;
  end;

  insert into public.investigation_questions (experiment_id, question_id, exploration_id)
  values (experiment, q_extra, exploration);
  insert into public.experiment_items (id, experiment_id, kind, body)
  values (item, experiment, 'concept', 'One copy');

  select count(*) into seen from public.experiment_items where experiment_id = experiment;
  if seen <> 1 then
    raise exception 'expected one experiment item, found %', seen;
  end if;

  begin
    insert into public.investigation_questions (experiment_id, question_id, exploration_id)
    values (experiment, q_b, exploration);
    raise exception 'cross-exploration link was allowed for the owner';
  exception
    when foreign_key_violation then
      null;
  end;

  insert into public.themes (id, exploration_id, name)
  values (theme, exploration, 'Repeated');
  insert into public.themes (id, exploration_id, name)
  values (theme_same_name, exploration, 'Repeated');
  insert into public.theme_questions (theme_id, question_id, exploration_id)
  values (theme, q_central, exploration);
  insert into public.theme_questions (theme_id, question_id, exploration_id)
  values (theme, q_extra, exploration);

  begin
    insert into public.theme_questions (theme_id, question_id, exploration_id)
    values (theme, q_b, exploration);
    raise exception 'cross-exploration theme membership was allowed for the owner';
  exception
    when foreign_key_violation then
      null;
  end;

  reset role;
  begin
    insert into public.investigation_questions (experiment_id, question_id, exploration_id)
    values (experiment, q_b, exploration);
    raise exception 'cross-exploration link was allowed for the migration role';
  exception
    when foreign_key_violation then
      null;
  end;
  begin
    insert into public.theme_questions (theme_id, question_id, exploration_id)
    values (theme, q_b, exploration);
    raise exception 'cross-exploration theme membership was allowed for the migration role';
  exception
    when foreign_key_violation then
      null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', other::text, true);
  execute 'set local role authenticated';
  perform public.create_exploration_with_first_question(
    other_exploration, q_other, 'focus', 'Other owner question', 'central', 'Other', null
  );

  select count(*) into seen from public.investigation_questions where experiment_id = experiment;
  if seen <> 0 then
    raise exception 'second user can see % investigation links', seen;
  end if;
  select count(*) into seen from public.themes where exploration_id = exploration;
  if seen <> 0 then
    raise exception 'second user can see % themes', seen;
  end if;
  select count(*) into seen from public.theme_questions where theme_id = theme;
  if seen <> 0 then
    raise exception 'second user can see % theme memberships', seen;
  end if;

  update public.themes set name = 'Stolen' where id = theme;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'second user updated % themes', affected;
  end if;
  delete from public.investigation_questions where experiment_id = experiment;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'second user deleted % investigation links', affected;
  end if;

  begin
    insert into public.themes (id, exploration_id, name)
    values ('20000000-0000-4000-8000-000000000099', exploration, 'Stolen');
    raise exception 'second user inserted a theme into the first exploration';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    insert into public.theme_questions (theme_id, question_id, exploration_id)
    values (theme, q_central, exploration);
    raise exception 'second user attached the first user''s question';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    insert into public.investigation_questions (experiment_id, question_id, exploration_id)
    values (experiment, q_extra, exploration);
    raise exception 'second user added a link on the first user''s experiment';
  exception
    when insufficient_privilege then
      null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', owner::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';

  delete from public.theme_questions where theme_id = theme and question_id = q_central;
  if not exists (select 1 from public.questions where id = q_central)
     or not exists (select 1 from public.themes where id = theme)
     or exists (select 1 from public.theme_questions where theme_id = theme and question_id = q_central)
  then
    raise exception 'membership delete changed the theme or the question';
  end if;

  delete from public.themes where id = theme;
  if exists (select 1 from public.questions where id = q_central)
     and exists (select 1 from public.experiments where id = experiment)
     and not exists (select 1 from public.theme_questions where theme_id = theme)
  then
    null;
  else
    raise exception 'theme delete changed a question or experiment, or left a membership';
  end if;

  delete from public.investigation_questions
  where experiment_id = experiment and question_id = q_extra;
  if not exists (select 1 from public.experiments where id = experiment)
     or not exists (
       select 1 from public.investigation_questions
       where experiment_id = experiment and question_id = q_central
     )
     or exists (
       select 1 from public.investigation_questions
       where experiment_id = experiment and question_id = q_extra
     )
     or not exists (select 1 from public.experiment_items where id = item)
  then
    raise exception 'deleting an additional link changed the investigation or its original link';
  end if;

  insert into public.themes (id, exploration_id, name)
  values (theme_extra, exploration, 'Extra only');
  insert into public.theme_questions (theme_id, question_id, exploration_id)
  values (theme_extra, q_extra, exploration);
  insert into public.investigation_questions (experiment_id, question_id, exploration_id)
  values (experiment, q_extra, exploration);

  select count(*) into seen from public.theme_questions where question_id = q_extra;
  update public.questions set is_hidden = true where id = q_extra;
  if (select count(*) from public.theme_questions where question_id = q_extra) <> seen
     or not exists (
       select 1 from public.investigation_questions
       where experiment_id = experiment and question_id = q_extra
     )
  then
    raise exception 'hiding a question removed a relationship';
  end if;

  delete from public.questions where id = q_extra;
  if exists (select 1 from public.questions where id = q_extra)
     or exists (select 1 from public.theme_questions where question_id = q_extra)
     or exists (select 1 from public.investigation_questions where question_id = q_extra)
     or not exists (select 1 from public.experiments where id = experiment)
     or not exists (select 1 from public.experiment_items where id = item)
     or not exists (
       select 1 from public.investigation_questions
       where experiment_id = experiment and question_id = q_central
     )
  then
    raise exception 'deleting an additional question did not leave the investigation and its original link';
  end if;

  begin
    delete from public.investigation_questions
    where experiment_id = experiment and question_id = q_central;
    set constraints investigation_questions_keep_legacy_link immediate;
    raise exception 'original link delete was allowed';
  exception
    when check_violation then
      null;
  end;
  if not exists (
    select 1 from public.investigation_questions
    where experiment_id = experiment and question_id = q_central
  ) then
    raise exception 'original link is missing after the rejected delete';
  end if;

  begin
    delete from public.questions where id = q_central;
    raise exception 'original question delete was allowed';
  exception
    when foreign_key_violation then
      null;
  end;

  delete from public.experiments where id = experiment;
  if exists (select 1 from public.investigation_questions where experiment_id = experiment)
     or exists (select 1 from public.experiment_items where experiment_id = experiment)
     or not exists (select 1 from public.questions where id = q_central)
  then
    raise exception 'experiment delete removed the question or left a link or item';
  end if;

  set constraints all immediate;

  reset role;
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
    raise exception 'experiments_one_question is absent or no longer unique on question_id';
  end if;
end;
$test$;

rollback;
