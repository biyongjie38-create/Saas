-- ViralBrain.ai Supabase Schema (MVP)

create extension if not exists "pgcrypto";

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  video_id text unique not null,
  url text not null,
  title text not null,
  description text,
  channel_id text,
  channel_name text,
  published_at timestamptz,
  duration_sec int,
  stats jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  top_comments jsonb not null default '[]'::jsonb,
  data_source text,
  captions_text text,
  fetched_at timestamptz not null default now()
);

alter table videos add column if not exists description text;
alter table videos add column if not exists data_source text;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id text not null,
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  analysis_json jsonb,
  benchmarks_json jsonb,
  score_json jsonb,
  score_total int,
  model_trace jsonb,
  error_message text,
  share_token text,
  share_enabled_at timestamptz,
  share_expires_at timestamptz,
  share_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reports add column if not exists error_message text;
alter table reports add column if not exists share_token text;
alter table reports add column if not exists share_enabled_at timestamptz;
alter table reports add column if not exists share_expires_at timestamptz;
alter table reports add column if not exists share_revoked_at timestamptz;

update reports
set share_expires_at = coalesce(share_enabled_at, now()) + interval '7 days'
where share_token is not null
  and share_revoked_at is null
  and share_expires_at is null;

create index if not exists idx_reports_user_created on reports(user_id, created_at desc);
create index if not exists idx_reports_video_id on reports(video_id);
create index if not exists idx_reports_score_total on reports(score_total desc);
create unique index if not exists idx_reports_share_token on reports(share_token) where share_token is not null;
create index if not exists idx_reports_share_expires_at on reports(share_expires_at);
create index if not exists idx_reports_share_revoked_at on reports(share_revoked_at);

create table if not exists report_share_access_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  share_token text not null,
  accessed_at timestamptz not null default now(),
  user_agent text,
  referer text
);

create index if not exists idx_report_share_access_logs_report_accessed
  on report_share_access_logs(report_id, accessed_at desc);
create index if not exists idx_report_share_access_logs_token_accessed
  on report_share_access_logs(share_token, accessed_at desc);

create table if not exists viral_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  summary text not null,
  tags jsonb not null default '{}'::jsonb,
  embedding_key text unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table viral_library_items add column if not exists embedding_key text;
alter table viral_library_items add column if not exists deleted_at timestamptz;

create index if not exists idx_viral_library_created on viral_library_items(created_at desc);
create index if not exists idx_viral_library_deleted_at on viral_library_items(deleted_at);
create unique index if not exists idx_viral_library_embedding_key on viral_library_items(embedding_key);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  cost_tokens int not null default 0,
  cost_usd numeric(10,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_logs_user_created on usage_logs(user_id, created_at desc);

create table if not exists user_profiles (
  user_id uuid primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  subscription_status text not null default 'none' check (subscription_status in ('none', 'active', 'canceled')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_plan on user_profiles(plan);

create table if not exists membership_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan text not null check (plan in ('free', 'pro')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null check (status in ('pending', 'paid', 'failed', 'canceled')),
  amount_cny int not null default 0,
  payment_provider text not null default 'demo_checkout',
  provider_session_id text,
  provider_customer_id text,
  provider_subscription_id text,
  provider_payment_intent_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table membership_orders add column if not exists provider_session_id text;
alter table membership_orders add column if not exists provider_customer_id text;
alter table membership_orders add column if not exists provider_subscription_id text;
alter table membership_orders add column if not exists provider_payment_intent_id text;
alter table membership_orders add column if not exists failure_reason text;
alter table membership_orders add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_membership_orders_user_created on membership_orders(user_id, created_at desc);
create unique index if not exists idx_membership_orders_provider_session_id on membership_orders(provider_session_id) where provider_session_id is not null;
create index if not exists idx_membership_orders_provider_subscription_id on membership_orders(provider_subscription_id) where provider_subscription_id is not null;

-- RLS
alter table videos enable row level security;
alter table reports enable row level security;
alter table report_share_access_logs enable row level security;
alter table viral_library_items enable row level security;
alter table usage_logs enable row level security;
alter table user_profiles enable row level security;
alter table membership_orders enable row level security;

-- Videos policies (shared public cache; authenticated users can write)
drop policy if exists videos_select_authenticated on videos;
drop policy if exists videos_select_public on videos;
drop policy if exists videos_insert_authenticated on videos;
drop policy if exists videos_update_authenticated on videos;

create policy videos_select_public on videos
for select
using (true);

create policy videos_insert_authenticated on videos
for insert
with check (auth.role() = 'authenticated');

create policy videos_update_authenticated on videos
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Reports policies (strictly owner-managed, with optional public share)
drop policy if exists reports_select_own on reports;
drop policy if exists reports_select_shared on reports;
drop policy if exists reports_insert_own on reports;
drop policy if exists reports_update_own on reports;

create policy reports_select_own on reports
for select
using (auth.uid() = user_id);

create policy reports_select_shared on reports
for select
using (
  share_token is not null
  and share_enabled_at is not null
  and share_revoked_at is null
  and share_expires_at is not null
  and share_expires_at > now()
);

create policy reports_insert_own on reports
for insert
with check (auth.uid() = user_id);

create policy reports_update_own on reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists report_share_access_logs_select_own on report_share_access_logs;

create policy report_share_access_logs_select_own on report_share_access_logs
for select
using (
  exists (
    select 1
    from reports
    where reports.id = report_share_access_logs.report_id
      and reports.user_id = auth.uid()
  )
);

-- Viral library policies (authenticated users can read/import/update/delete)
drop policy if exists viral_library_select_authenticated on viral_library_items;
drop policy if exists viral_library_insert_authenticated on viral_library_items;
drop policy if exists viral_library_update_authenticated on viral_library_items;
drop policy if exists viral_library_delete_authenticated on viral_library_items;

create policy viral_library_select_authenticated on viral_library_items
for select
using (auth.role() = 'authenticated');

create policy viral_library_insert_authenticated on viral_library_items
for insert
with check (auth.role() = 'authenticated');

create policy viral_library_update_authenticated on viral_library_items
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy viral_library_delete_authenticated on viral_library_items
for delete
using (auth.role() = 'authenticated');

-- Usage policies (strictly user-owned)
drop policy if exists usage_select_own on usage_logs;
drop policy if exists usage_insert_own on usage_logs;

create policy usage_select_own on usage_logs
for select
using (auth.uid() = user_id);

create policy usage_insert_own on usage_logs
for insert
with check (auth.uid() = user_id);

-- User profile policies
drop policy if exists user_profiles_select_own on user_profiles;
drop policy if exists user_profiles_insert_own on user_profiles;
drop policy if exists user_profiles_update_own on user_profiles;

create policy user_profiles_select_own on user_profiles
for select
using (auth.uid() = user_id);

create policy user_profiles_insert_own on user_profiles
for insert
with check (auth.uid() = user_id);

create policy user_profiles_update_own on user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Membership order policies
drop policy if exists membership_orders_select_own on membership_orders;
drop policy if exists membership_orders_insert_own on membership_orders;
drop policy if exists membership_orders_update_own on membership_orders;

create policy membership_orders_select_own on membership_orders
for select
using (auth.uid() = user_id);

create policy membership_orders_insert_own on membership_orders
for insert
with check (auth.uid() = user_id);

create policy membership_orders_update_own on membership_orders
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Hard quota intercept for analyze usage (DB-level, concurrency-safe)
create or replace function resolve_auth_plan()
returns text
language sql
stable
as $$
  select coalesce(
    (
      select up.plan
      from user_profiles up
      where up.user_id = auth.uid()
      limit 1
    ),
    nullif(auth.jwt() -> 'app_metadata' ->> 'plan', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'plan', ''),
    'free'
  );
$$;

create or replace function enforce_usage_logs_daily_limit()
returns trigger
language plpgsql
as $$
declare
  request_plan text;
  limit_per_day int;
  used_today int;
  day_start timestamptz;
  day_end timestamptz;
begin
  if new.action <> 'analyze' then
    return new;
  end if;

  request_plan := resolve_auth_plan();
  limit_per_day := case when request_plan = 'pro' then 200 else 5 end;

  day_start := date_trunc('day', timezone('utc', now())) at time zone 'utc';
  day_end := day_start + interval '1 day';

  perform pg_advisory_xact_lock(hashtext(new.user_id::text || ':' || day_start::text));

  select count(*)
    into used_today
    from usage_logs
   where user_id = new.user_id
     and action = 'analyze'
     and created_at >= day_start
     and created_at < day_end;

  if used_today >= limit_per_day then
    raise exception 'USAGE_LIMIT_EXCEEDED'
      using
        errcode = 'P0001',
        detail = json_build_object(
          'plan', request_plan,
          'used_today', used_today,
          'limit_per_day', limit_per_day
        )::text;
  end if;

  return new;
end;
$$;

drop trigger if exists usage_logs_daily_limit_guard on usage_logs;
create trigger usage_logs_daily_limit_guard
before insert on usage_logs
for each row execute function enforce_usage_logs_daily_limit();

