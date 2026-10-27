-- Historical read-only inventory for the superseded plan to reuse the V1 database.
-- V2 uses a separate Supabase project. Do not run this file as part of V2 setup.
-- The current persistence design is docs/schema-inventory/proposals/v2-revised-schema-proposal.md.
--
-- Curitopia hosted catalog inventory
--
-- Read-only. Paste this file into the Supabase SQL Editor and run it once.
-- It is one SELECT. The grid has three columns: section, item, detail.
-- Download the grid as CSV. Do not commit the CSV.
--
-- The statement reads PostgreSQL catalogs, information_schema, and storage.buckets.
-- It does not read exploration rows, question rows, experiment rows, auth users,
-- or storage objects. It does not change the database.
--
-- Compare the CSV with the migration files in E:\Curitopia\supabase\migrations.
-- ABSENT means that name is not in the catalog. It does not say why.
-- This file does not approve a V2 persistence choice.
--
-- Sections
--   00_session                  Role running the inventory. Not an RLS test.
--   01_tables                   V1 tables, plus names from the V2 proposal.
--   02_columns_expected         Columns named by the V1 migrations.
--   03_columns_other            Other columns on those four V1 tables.
--   04_constraints_expected     Names named by the V1 migrations.
--   05_constraints_actual       Live primary keys, foreign keys, unique and check constraints.
--   06_indexes_expected         Index names named by the V1 migrations.
--   07_indexes_actual           Live index definitions, including partial and unique indexes.
--   08_rls                      Whether RLS is enabled and forced.
--   09_policies_expected        Policy names named by the V1 migrations.
--   10_policies_actual          Live policy expressions for those tables and named storage policies.
--   11_policies_storage_other   Other storage policies. Expressions only if they name a Curitopia bucket.
--   12_buckets_expected         exploration-images and experiment-thumbnails.
--   13_buckets_other            Every other bucket name and whether it is public.
--   14_triggers_expected        Trigger names named by the V1 migrations.
--   15_triggers_actual          Live trigger definitions. Internal foreign-key triggers are omitted.
--   16_functions                Bodies are not returned. Checksum and a few source phrases are.
--   17_function_acl             Stored function privileges. null means the default ACL.
--   18_table_acl                Stored table privileges. null means no explicit grant list.
--   19_migration_history_catalog
--                               Whether supabase_migrations.schema_migrations exists, and its columns.
--                               This section does not read migration versions or statement text.
--   20_other_public_tables      Other public base tables, by name only.
--
-- Trigger enabled codes in section 15: O fires normally, D disabled, R replica, A always.
-- ACL letters: r select, w update, a insert, d delete, D truncate, x references,
-- t trigger, X execute. An empty grantee before "=" means PUBLIC.
-- A superuser or a role with bypassrls is not evidence that owner policies work.
--
-- If section 19 says the history table is present, the commented query at the
-- bottom can be run separately. Select version and name only.
-- If a function marker needs a line-by-line look, the other commented query
-- returns that function's catalog definition. Do not point either query at
-- application tables, auth.users, or storage.objects.
-- If this statement errors on storage.buckets, stop. Do not replace it with a
-- query that reads storage.objects.

with expected_tables as (
  select *
  from (
    values
      ('v1'::text, 'public'::text, 'explorations'::text),
      ('v1', 'public', 'questions'),
      ('v1', 'public', 'experiments'),
      ('v1', 'public', 'experiment_items'),
      ('proposed', 'public', 'themes'),
      ('proposed', 'public', 'theme_questions'),
      ('proposed', 'public', 'investigation_questions'),
      ('proposed', 'public', 'theme_investigations'),
      ('check', 'public', 'stories')
  ) as v(group_name, schema_name, table_name)
),
expected_columns as (
  select *
  from (
    values
      ('explorations'::text, 'id'::text),
      ('explorations', 'user_id'),
      ('explorations', 'title'),
      ('explorations', 'mode'),
      ('explorations', 'status'),
      ('explorations', 'started_at'),
      ('explorations', 'ended_at'),
      ('explorations', 'created_at'),
      ('explorations', 'updated_at'),
      ('explorations', 'focus_image_path'),
      ('questions', 'id'),
      ('questions', 'exploration_id'),
      ('questions', 'position'),
      ('questions', 'question_text'),
      ('questions', 'role'),
      ('questions', 'is_prioritised'),
      ('questions', 'perspective_origin'),
      ('questions', 'created_at'),
      ('questions', 'is_hidden'),
      ('experiments', 'id'),
      ('experiments', 'user_id'),
      ('experiments', 'exploration_id'),
      ('experiments', 'question_id'),
      ('experiments', 'created_at'),
      ('experiments', 'updated_at'),
      ('experiment_items', 'id'),
      ('experiment_items', 'experiment_id'),
      ('experiment_items', 'position'),
      ('experiment_items', 'kind'),
      ('experiment_items', 'body'),
      ('experiment_items', 'related_item_id'),
      ('experiment_items', 'created_at'),
      ('experiment_items', 'updated_at'),
      ('experiment_items', 'image_path')
  ) as v(table_name, column_name)
),
v1_tables as (
  select table_name
  from expected_tables
  where group_name = 'v1'
),
expected_constraints as (
  select *
  from (
    values
      ('explorations'::text, 'explorations_pkey'::text),
      ('explorations', 'explorations_user_id_fkey'),
      ('explorations', 'explorations_mode_check'),
      ('explorations', 'explorations_status_check'),
      ('explorations', 'explorations_title_check'),
      ('explorations', 'explorations_completion_check'),
      ('explorations', 'explorations_focus_image_path_check'),
      ('questions', 'questions_pkey'),
      ('questions', 'questions_exploration_id_fkey'),
      ('questions', 'questions_position_check'),
      ('questions', 'questions_position_unique'),
      ('questions', 'questions_text_check'),
      ('questions', 'questions_role_check'),
      ('questions', 'questions_origin_check'),
      ('questions', 'questions_central_stays_visible'),
      ('experiments', 'experiments_pkey'),
      ('experiments', 'experiments_user_id_fkey'),
      ('experiments', 'experiments_exploration_id_fkey'),
      ('experiments', 'experiments_question_id_fkey'),
      ('experiments', 'experiments_one_question'),
      ('experiment_items', 'experiment_items_pkey'),
      ('experiment_items', 'experiment_items_experiment_id_fkey'),
      ('experiment_items', 'experiment_items_related_item_id_fkey'),
      ('experiment_items', 'experiment_items_position_check'),
      ('experiment_items', 'experiment_items_position_unique'),
      ('experiment_items', 'experiment_items_kind_check'),
      ('experiment_items', 'experiment_items_body_check'),
      ('experiment_items', 'experiment_items_not_self'),
      ('experiment_items', 'experiment_items_image_path_check')
  ) as v(table_name, constraint_name)
),
expected_indexes as (
  select *
  from (
    values
      ('explorations'::text, 'explorations_pkey'::text),
      ('explorations', 'explorations_user_updated_idx'),
      ('questions', 'questions_pkey'),
      ('questions', 'questions_position_unique'),
      ('questions', 'questions_one_central'),
      ('experiments', 'experiments_pkey'),
      ('experiments', 'experiments_one_question'),
      ('experiments', 'experiments_exploration_idx'),
      ('experiments', 'experiments_user_idx'),
      ('experiment_items', 'experiment_items_pkey'),
      ('experiment_items', 'experiment_items_position_unique'),
      ('experiment_items', 'experiment_items_experiment_idx')
  ) as v(table_name, index_name)
),
expected_policies as (
  select *
  from (
    values
      ('public'::text, 'explorations'::text, 'explorations_select'::text),
      ('public', 'explorations', 'explorations_insert'),
      ('public', 'explorations', 'explorations_update'),
      ('public', 'explorations', 'explorations_delete'),
      ('public', 'questions', 'questions_select'),
      ('public', 'questions', 'questions_insert'),
      ('public', 'questions', 'questions_update'),
      ('public', 'questions', 'questions_delete'),
      ('public', 'experiments', 'experiments_select'),
      ('public', 'experiments', 'experiments_insert'),
      ('public', 'experiments', 'experiments_update'),
      ('public', 'experiments', 'experiments_delete'),
      ('public', 'experiment_items', 'experiment_items_select'),
      ('public', 'experiment_items', 'experiment_items_insert'),
      ('public', 'experiment_items', 'experiment_items_update'),
      ('public', 'experiment_items', 'experiment_items_delete'),
      ('storage', 'objects', 'exploration_images_select'),
      ('storage', 'objects', 'exploration_images_insert'),
      ('storage', 'objects', 'exploration_images_update'),
      ('storage', 'objects', 'exploration_images_delete'),
      ('storage', 'objects', 'experiment_thumbnails_select'),
      ('storage', 'objects', 'experiment_thumbnails_insert'),
      ('storage', 'objects', 'experiment_thumbnails_update'),
      ('storage', 'objects', 'experiment_thumbnails_delete')
  ) as v(schema_name, table_name, policy_name)
),
expected_buckets as (
  select *
  from (
    values
      ('exploration-images'::text),
      ('experiment-thumbnails')
  ) as v(bucket_id)
),
expected_triggers as (
  select *
  from (
    values
      ('explorations'::text, 'explorations_protect_row'::text),
      ('explorations', 'explorations_require_question'),
      ('questions', 'questions_assign_position'),
      ('questions', 'questions_validate_rules'),
      ('questions', 'questions_touch_exploration'),
      ('questions', 'questions_keep_exploration_nonempty'),
      ('questions', 'questions_prevent_hiding_last_visible'),
      ('experiments', 'experiments_match_origin'),
      ('experiment_items', 'experiment_items_assign_position'),
      ('experiment_items', 'experiment_items_match_parent'),
      ('experiment_items', 'experiment_items_image_owner')
  ) as v(table_name, trigger_name)
),
expected_functions as (
  select *
  from (
    values
      ('assign_question_position'::text, 'assign_question_position()'::text),
      ('validate_question_rules', 'validate_question_rules()'),
      ('protect_exploration_row', 'protect_exploration_row()'),
      ('touch_exploration_from_question', 'touch_exploration_from_question()'),
      ('enforce_exploration_has_question', 'enforce_exploration_has_question()'),
      ('create_exploration_with_first_question', 'create_exploration_with_first_question(uuid, uuid, text, text, text, text, text)'),
      ('prevent_hiding_last_visible_question', 'prevent_hiding_last_visible_question()'),
      ('exploration_image_owner', 'exploration_image_owner(text)'),
      ('experiments_match_origin', 'experiments_match_origin()'),
      ('assign_experiment_item_position', 'assign_experiment_item_position()'),
      ('experiment_items_match_parent', 'experiment_items_match_parent()'),
      ('experiment_item_image_owner', 'experiment_item_image_owner()'),
      ('experiment_thumbnail_owner', 'experiment_thumbnail_owner(text)')
  ) as v(function_name, identity)
),
public_namespace as (
  select oid
  from pg_namespace
  where nspname = 'public'
),
named_functions as (
  select
    e.function_name,
    e.identity,
    p.oid,
    p.prosrc,
    p.prosecdef,
    p.proconfig,
    p.prokind,
    p.proacl,
    l.lanname
  from expected_functions e
  left join public_namespace n on true
  left join pg_proc p
    on p.pronamespace = n.oid
   and p.proname = e.function_name
   and (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')') = e.identity
  left join pg_language l on l.oid = p.prolang
),
session_rows as (
  select '00_session'::text as section, 'current_user'::text as item, current_user::text as detail
  union all
  select '00_session', 'current_database', current_database()::text
  union all
  select '00_session', 'server_version', current_setting('server_version')
  union all
  select '00_session', 'row_security', current_setting('row_security')
  union all
  select '00_session', 'rolsuper', r.rolsuper::text
  from pg_roles r
  where r.rolname = current_user
  union all
  select '00_session', 'rolbypassrls', r.rolbypassrls::text
  from pg_roles r
  where r.rolname = current_user
),
table_rows as (
  select
    '01_tables'::text as section,
    e.group_name || '.' || e.schema_name || '.' || e.table_name as item,
    case
      when c.oid is null then 'ABSENT'
      else 'present | relkind=' || c.relkind::text || ' | owner=' || coalesce(r.rolname, 'unknown')
    end as detail
  from expected_tables e
  left join pg_namespace n on n.nspname = e.schema_name
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = e.table_name
   and c.relkind in ('r', 'p', 'v', 'm', 'f')
  left join pg_roles r on r.oid = c.relowner
),
column_rows as (
  select
    '02_columns_expected'::text as section,
    e.table_name || '.' || e.column_name as item,
    case
      when c.column_name is null then 'ABSENT'
      else c.data_type
        || ' | nullable=' || c.is_nullable
        || ' | default=' || coalesce(c.column_default, 'none')
    end as detail
  from expected_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
),
other_column_rows as (
  select
    '03_columns_other'::text as section,
    c.table_name || '.' || c.column_name as item,
    c.data_type
      || ' | nullable=' || c.is_nullable
      || ' | default=' || coalesce(c.column_default, 'none') as detail
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in (select table_name from v1_tables)
    and not exists (
      select 1
      from expected_columns e
      where e.table_name = c.table_name
        and e.column_name = c.column_name
    )
  union all
  select
    '03_columns_other',
    '(none)',
    'no extra columns visible; section 02 shows whether each expected column exists'
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name in (select table_name from v1_tables)
      and not exists (
        select 1
        from expected_columns e
        where e.table_name = c.table_name
          and e.column_name = c.column_name
      )
  )
),
constraint_expected_rows as (
  select
    '04_constraints_expected'::text as section,
    e.table_name || '.' || e.constraint_name as item,
    case when c.oid is null then 'ABSENT' else 'present' end as detail
  from expected_constraints e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class tbl
    on tbl.relnamespace = n.oid
   and tbl.relname = e.table_name
  left join pg_constraint c
    on c.conrelid = tbl.oid
   and c.conname = e.constraint_name
),
constraint_actual_rows as (
  select
    '05_constraints_actual'::text as section,
    tbl.relname || '.' || c.conname as item,
    case c.contype
      when 'p' then 'primary key'
      when 'f' then 'foreign key'
      when 'u' then 'unique'
      when 'c' then 'check'
      when 'n' then 'not null'
      else c.contype::text
    end
      || ' | ' || pg_get_constraintdef(c.oid, true)
      || ' | validated=' || c.convalidated::text
      || case
        when c.contype = 'f' then
          ' | on_delete=' || case c.confdeltype::text
            when 'a' then 'NO ACTION'
            when 'r' then 'RESTRICT'
            when 'c' then 'CASCADE'
            when 'n' then 'SET NULL'
            when 'd' then 'SET DEFAULT'
            else c.confdeltype::text
          end
          || ' | on_update=' || case c.confupdtype::text
            when 'a' then 'NO ACTION'
            when 'r' then 'RESTRICT'
            when 'c' then 'CASCADE'
            when 'n' then 'SET NULL'
            when 'd' then 'SET DEFAULT'
            else c.confupdtype::text
          end
          || ' | references=' || coalesce(refn.nspname, '?') || '.' || coalesce(refc.relname, '?')
        else ''
      end as detail
  from pg_constraint c
  join pg_class tbl on tbl.oid = c.conrelid
  join pg_namespace n on n.oid = tbl.relnamespace
  left join pg_class refc on refc.oid = c.confrelid
  left join pg_namespace refn on refn.oid = refc.relnamespace
  where n.nspname = 'public'
    and tbl.relname in (select table_name from v1_tables)
),
index_expected_rows as (
  select
    '06_indexes_expected'::text as section,
    e.table_name || '.' || e.index_name as item,
    case when i.indexrelid is null then 'ABSENT' else 'present' end as detail
  from expected_indexes e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class tbl
    on tbl.relnamespace = n.oid
   and tbl.relname = e.table_name
   and tbl.relkind in ('r', 'p')
  left join pg_class idx
    on idx.relnamespace = n.oid
   and idx.relname = e.index_name
   and idx.relkind = 'i'
  left join pg_index i
    on i.indexrelid = idx.oid
   and i.indrelid = tbl.oid
),
index_actual_rows as (
  select
    '07_indexes_actual'::text as section,
    tbl.relname || '.' || idx.relname as item,
    pg_get_indexdef(i.indexrelid)
      || ' | unique=' || i.indisunique::text
      || ' | valid=' || i.indisvalid::text as detail
  from pg_index i
  join pg_class tbl on tbl.oid = i.indrelid
  join pg_namespace n on n.oid = tbl.relnamespace
  join pg_class idx on idx.oid = i.indexrelid
  where n.nspname = 'public'
    and tbl.relname in (select table_name from v1_tables)
),
rls_targets as (
  select *
  from (
    values
      ('public'::text, 'explorations'::text),
      ('public', 'questions'),
      ('public', 'experiments'),
      ('public', 'experiment_items'),
      ('storage', 'objects'),
      ('storage', 'buckets')
  ) as v(schema_name, table_name)
),
rls_rows as (
  select
    '08_rls'::text as section,
    e.schema_name || '.' || e.table_name as item,
    case
      when c.oid is null then 'ABSENT'
      else 'enabled=' || c.relrowsecurity::text
        || ' | forced=' || c.relforcerowsecurity::text
        || ' | relkind=' || c.relkind::text
    end as detail
  from rls_targets e
  left join pg_namespace n on n.nspname = e.schema_name
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = e.table_name
   and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
policy_expected_rows as (
  select
    '09_policies_expected'::text as section,
    e.schema_name || '.' || e.table_name || '.' || e.policy_name as item,
    case
      when p.policyname is null then 'ABSENT'
      else 'present | cmd=' || p.cmd
    end as detail
  from expected_policies e
  left join pg_policies p
    on p.schemaname = e.schema_name
   and p.tablename = e.table_name
   and p.policyname = e.policy_name
),
policy_actual_rows as (
  select
    '10_policies_actual'::text as section,
    p.schemaname || '.' || p.tablename || '.' || p.policyname as item,
    'permissive=' || p.permissive::text
      || ' | cmd=' || p.cmd
      || ' | roles=' || p.roles::text
      || ' | using=' || coalesce(p.qual, 'none')
      || ' | check=' || coalesce(p.with_check, 'none') as detail
  from pg_policies p
  where (
      p.schemaname = 'public'
      and p.tablename in (select table_name from v1_tables)
    )
    or (
      p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname in (select policy_name from expected_policies)
    )
),
storage_policy_other_rows as (
  select
    '11_policies_storage_other'::text as section,
    p.schemaname || '.' || p.tablename || '.' || p.policyname as item,
    'cmd=' || p.cmd
      || ' | roles=' || p.roles::text
      || case
        when coalesce(p.qual, '') || coalesce(p.with_check, '') ilike '%exploration-images%'
          or coalesce(p.qual, '') || coalesce(p.with_check, '') ilike '%experiment-thumbnails%'
        then ' | using=' || coalesce(p.qual, 'none')
          || ' | check=' || coalesce(p.with_check, 'none')
        else ' | expression omitted because it does not name exploration-images or experiment-thumbnails'
      end as detail
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename in ('objects', 'buckets')
    and p.policyname not in (select policy_name from expected_policies)
  union all
  select
    '11_policies_storage_other',
    '(none)',
    'no other policies on storage.objects or storage.buckets'
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename in ('objects', 'buckets')
      and p.policyname not in (select policy_name from expected_policies)
  )
),
bucket_expected_rows as (
  select
    '12_buckets_expected'::text as section,
    e.bucket_id as item,
    case
      when b.id is null then 'ABSENT'
      else 'name=' || b.name
        || ' | public=' || b.public::text
        || ' | file_size_limit=' || coalesce(b.file_size_limit::text, 'none')
        || ' | mime=' || coalesce(array_to_string(b.allowed_mime_types, ','), 'none')
    end as detail
  from expected_buckets e
  left join storage.buckets b on b.id = e.bucket_id
),
bucket_other_rows as (
  select
    '13_buckets_other'::text as section,
    b.id as item,
    'name=' || b.name
      || ' | public=' || b.public::text
      || ' | file_size_limit=' || coalesce(b.file_size_limit::text, 'none')
      || ' | mime=' || coalesce(array_to_string(b.allowed_mime_types, ','), 'none') as detail
  from storage.buckets b
  where b.id not in (select bucket_id from expected_buckets)
  union all
  select
    '13_buckets_other',
    '(none)',
    'no other storage buckets'
  where not exists (
    select 1
    from storage.buckets b
    where b.id not in (select bucket_id from expected_buckets)
  )
),
trigger_expected_rows as (
  select
    '14_triggers_expected'::text as section,
    e.table_name || '.' || e.trigger_name as item,
    case when t.oid is null then 'ABSENT' else 'present' end as detail
  from expected_triggers e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class tbl
    on tbl.relnamespace = n.oid
   and tbl.relname = e.table_name
  left join pg_trigger t
    on t.tgrelid = tbl.oid
   and t.tgname = e.trigger_name
   and not t.tgisinternal
),
trigger_actual_rows as (
  select
    '15_triggers_actual'::text as section,
    tbl.relname || '.' || t.tgname as item,
    pg_get_triggerdef(t.oid, true)
      || ' | enabled=' || t.tgenabled::text as detail
  from pg_trigger t
  join pg_class tbl on tbl.oid = t.tgrelid
  join pg_namespace n on n.oid = tbl.relnamespace
  where n.nspname = 'public'
    and tbl.relname in (select table_name from v1_tables)
    and not t.tgisinternal
),
function_rows as (
  select
    '16_functions'::text as section,
    f.identity as item,
    case
      when f.oid is null then 'ABSENT'
      else 'language=' || coalesce(f.lanname, 'unknown')
        || ' | prokind=' || f.prokind::text
        || ' | security_definer=' || f.prosecdef::text
        || ' | config=' || coalesce(array_to_string(f.proconfig, ','), 'none')
        || ' | source_md5=' || md5(f.prosrc)
        || ' | source_length=' || length(f.prosrc)::text
        || case f.function_name
          when 'validate_question_rules' then
            ' | ' || case
              when position('priority can change only after the exploration is completed' in f.prosrc) > 0
              then 'marker=priority_requires_completed'
              else 'marker=priority_phrase_absent'
            end
          when 'experiment_thumbnail_owner' then
            ' | ' || coalesce(
              concat_ws(
                ', ',
                case
                  when position('kind = ''concept''' in f.prosrc) > 0 then 'marker=concept_only'
                end,
                case
                  when position('hypothesis' in f.prosrc) > 0
                   and position('discovery' in f.prosrc) > 0
                  then 'marker=mentions_hypothesis_and_discovery'
                end
              ),
              'marker=no_known_kind_phrase'
            )
          when 'experiment_items_match_parent' then
            ' | cycle_phrase=' || (position('experiment items cannot form a cycle' in f.prosrc) > 0)::text
            || ' | depth_phrase=' || (position('experiment item link is too deep' in f.prosrc) > 0)::text
          when 'prevent_hiding_last_visible_question' then
            ' | last_visible_phrase=' || (position('the last visible question cannot be hidden' in f.prosrc) > 0)::text
          when 'enforce_exploration_has_question' then
            ' | nonempty_phrase=' || (position('exploration must contain at least one question' in f.prosrc) > 0)::text
          else ''
        end
    end as detail
  from named_functions f
),
function_overload_rows as (
  select
    '16_functions'::text as section,
    'overload.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as item,
    'present signature differs from the V1 migration signature' as detail
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (select function_name from expected_functions)
    and (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')
      not in (select identity from expected_functions)
),
function_acl_rows as (
  select
    '17_function_acl'::text as section,
    f.identity as item,
    case
      when f.oid is null then 'ABSENT'
      else coalesce(f.proacl::text, 'null')
    end as detail
  from named_functions f
),
table_acl_rows as (
  select
    '18_table_acl'::text as section,
    'public.' || e.table_name as item,
    case
      when c.oid is null then 'ABSENT'
      else coalesce(c.relacl::text, 'null')
    end as detail
  from v1_tables e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = e.table_name
   and c.relkind in ('r', 'p')
),
migration_history_rows as (
  select
    '19_migration_history_catalog'::text as section,
    'supabase_migrations.schema_migrations'::text as item,
    case
      when to_regclass('supabase_migrations.schema_migrations') is null then 'ABSENT'
      else 'present'
    end as detail
  union all
  select
    '19_migration_history_catalog',
    'column.' || c.column_name,
    c.data_type || ' | nullable=' || c.is_nullable
  from information_schema.columns c
  where c.table_schema = 'supabase_migrations'
    and c.table_name = 'schema_migrations'
),
other_table_rows as (
  select
    '20_other_public_tables'::text as section,
    c.relname as item,
    'relkind=' || c.relkind::text as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname not in (select table_name from expected_tables)
  union all
  select
    '20_other_public_tables',
    '(none)',
    'no other public base tables'
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not in (select table_name from expected_tables)
  )
)
select section, item, detail
from (
  select * from session_rows
  union all
  select * from table_rows
  union all
  select * from column_rows
  union all
  select * from other_column_rows
  union all
  select * from constraint_expected_rows
  union all
  select * from constraint_actual_rows
  union all
  select * from index_expected_rows
  union all
  select * from index_actual_rows
  union all
  select * from rls_rows
  union all
  select * from policy_expected_rows
  union all
  select * from policy_actual_rows
  union all
  select * from storage_policy_other_rows
  union all
  select * from bucket_expected_rows
  union all
  select * from bucket_other_rows
  union all
  select * from trigger_expected_rows
  union all
  select * from trigger_actual_rows
  union all
  select * from function_rows
  union all
  select * from function_overload_rows
  union all
  select * from function_acl_rows
  union all
  select * from table_acl_rows
  union all
  select * from migration_history_rows
  union all
  select * from other_table_rows
) inventory
order by section, item;

-- Optional second run, only if section 19 says schema_migrations is present.
-- Do not select the statements column.
-- select version, name
-- from supabase_migrations.schema_migrations
-- order by version;
--
-- If that errors because name is not a column, run this instead:
-- select version
-- from supabase_migrations.schema_migrations
-- order by version;
--
-- Optional catalog definition for one function. Still not application data.
-- select pg_get_functiondef('public.validate_question_rules()'::regprocedure);
