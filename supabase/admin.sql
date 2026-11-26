create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_username text not null,
  action text not null,
  target_type text not null check (target_type in ('user', 'listing', 'report')),
  target_id uuid,
  target_label text not null default '',
  status text not null default 'succeeded'
    check (status in ('pending', 'succeeded', 'failed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read admin audit log" on public.admin_audit_log;
drop policy if exists "Admins insert own audit entries" on public.admin_audit_log;

create policy "Admins read admin audit log"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin());
create policy "Admins insert own audit entries"
  on public.admin_audit_log for insert to authenticated
  with check (actor_id = (select auth.uid()) and public.is_admin());

revoke all on public.admin_audit_log from anon, authenticated;
grant select, insert on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;

create or replace function public.admin_activity_stats(p_period_days integer)
returns table (
  day date,
  users_created bigint,
  listings_created bigint,
  reports_created bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  last_day date := (pg_catalog.now() at time zone 'UTC')::date;
  first_day date;
begin
  if p_period_days is null or p_period_days not in (7, 30, 90) then
    raise exception 'Unsupported statistics period' using errcode = '22023';
  end if;
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  first_day := last_day - (p_period_days - 1);
  return query
    with dates as (
      select (first_day + series.day_offset)::date as day
      from pg_catalog.generate_series(0, p_period_days - 1) as series(day_offset)
    )
    select
      dates.day,
      (
        select pg_catalog.count(*)
        from public.profiles p
        where p.created_at >= (dates.day::timestamp at time zone 'UTC')
          and p.created_at < ((dates.day + 1)::timestamp at time zone 'UTC')
      ),
      (
        select pg_catalog.count(*)
        from public.items i
        where i.created_at >= (dates.day::timestamp at time zone 'UTC')
          and i.created_at < ((dates.day + 1)::timestamp at time zone 'UTC')
      ),
      (
        select pg_catalog.count(*)
        from public.reports r
        where r.created_at >= (dates.day::timestamp at time zone 'UTC')
          and r.created_at < ((dates.day + 1)::timestamp at time zone 'UTC')
      )
    from dates
    order by dates.day;
end;
$$;

revoke all on function public.admin_activity_stats(integer) from public, anon;
grant execute on function public.admin_activity_stats(integer) to authenticated;
