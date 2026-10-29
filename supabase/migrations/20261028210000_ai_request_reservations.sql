-- Additive rate-limit reservations for paid AI routes.
-- Do not edit or rerun earlier migrations.
-- Do not apply this file until it has been reviewed.
-- It does not change questions, concepts, concept_questions, curiosities, or storage.
-- It does not grant anonymous write access and it does not add a service-role credential.

create table public.ai_rate_policies (
  endpoint text primary key,
  max_requests integer not null,
  window_seconds integer not null,
  constraint ai_rate_policies_endpoint_known check (endpoint in ('consider', 'images', 'titles')),
  constraint ai_rate_policies_positive check (max_requests > 0 and window_seconds > 0)
);

comment on table public.ai_rate_policies is
  'Server-owned quotas for paid AI routes. Callers cannot change these rows.';

insert into public.ai_rate_policies (endpoint, max_requests, window_seconds)
values
  ('consider', 30, 3600),
  ('titles', 20, 3600),
  ('images', 3, 3600);

create table public.ai_request_reservations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint ai_request_reservations_endpoint_known check (endpoint in ('consider', 'images', 'titles'))
);

comment on table public.ai_request_reservations is
  'One row is one accepted paid attempt. Rows are kept for the rolling window. Restarting the app does not remove them.';

create index ai_request_reservations_window_idx
  on public.ai_request_reservations (user_id, endpoint, created_at desc);

alter table public.ai_rate_policies enable row level security;
alter table public.ai_request_reservations enable row level security;

revoke all on table public.ai_rate_policies from public, anon, authenticated, service_role;
revoke all on table public.ai_request_reservations from public, anon, authenticated, service_role;
revoke all on sequence public.ai_request_reservations_id_seq from public, anon, authenticated, service_role;

-- The signed-in JWT supplies the user. The argument cannot name another account.
-- The advisory lock serializes one account and one endpoint so two concurrent
-- requests cannot both pass the count check.
create or replace function public.reserve_ai_request(p_endpoint text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  policy_max integer;
  policy_window integer;
  recent integer;
  oldest timestamptz;
  retry integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select max_requests, window_seconds
    into policy_max, policy_window
  from public.ai_rate_policies
  where endpoint = p_endpoint;

  if policy_max is null then
    raise exception 'unknown endpoint';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(uid::text OPERATOR(pg_catalog.||) pg_catalog.chr(31) OPERATOR(pg_catalog.||) p_endpoint, 0)
  );

  delete from public.ai_request_reservations
  where user_id = uid
    and endpoint = p_endpoint
    and created_at OPERATOR(pg_catalog.<=) (pg_catalog.now() OPERATOR(pg_catalog.-) pg_catalog.make_interval(secs => policy_window));

  select pg_catalog.count(*)::integer, pg_catalog.min(created_at)
    into recent, oldest
  from public.ai_request_reservations
  where user_id = uid
    and endpoint = p_endpoint;

  if recent >= policy_max then
    -- greatest() and extract(... from ...) are parser syntax, not pg_catalog functions.
    -- Schema-qualifying them fails to compile. They do not follow search_path.
    retry := greatest(
      1,
      pg_catalog.ceil(extract(epoch from (
        (oldest OPERATOR(pg_catalog.+) pg_catalog.make_interval(secs => policy_window))
        OPERATOR(pg_catalog.-) pg_catalog.now()
      )))::integer
    );
    return query select false, retry;
    return;
  end if;

  insert into public.ai_request_reservations (user_id, endpoint)
  values (uid, p_endpoint);

  return query select true, 0;
end;
$$;

revoke all on function public.reserve_ai_request(text) from public, anon, service_role;
grant execute on function public.reserve_ai_request(text) to authenticated;

comment on function public.reserve_ai_request(text) is
  'Reserves one paid AI attempt for auth.uid() and the named endpoint. Anonymous roles cannot execute it.';
