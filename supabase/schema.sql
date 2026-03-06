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

create index if not exists idx_videos_fetched_at on videos(fetched_at desc);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reports add column if not exists error_message text;

create index if not exists idx_reports_user_created on reports(user_id, created_at desc);
create index if not exists idx_reports_video_id on reports(video_id);
create index if not exists idx_reports_score_total on reports(score_total desc);

create table if not exists viral_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  summary text not null,
  tags jsonb not null default '{}'::jsonb,
  embedding_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_viral_library_created on viral_library_items(created_at desc);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  cost_tokens int not null default 0,
  cost_usd numeric(10,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_logs_user_created on usage_logs(user_id, created_at desc);

-- RLS
alter table videos enable row level security;
alter table reports enable row level security;
alter table viral_library_items enable row level security;
alter table usage_logs enable row level security;

-- Videos policies (shared cache, authenticated users can read/write)
drop policy if exists videos_select_authenticated on videos;
drop policy if exists videos_insert_authenticated on videos;
drop policy if exists videos_update_authenticated on videos;

create policy videos_select_authenticated on videos
for select
using (auth.role() = 'authenticated');

create policy videos_insert_authenticated on videos
for insert
with check (auth.role() = 'authenticated');

create policy videos_update_authenticated on videos
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Reports policies (strictly user-owned)
drop policy if exists reports_select_own on reports;
drop policy if exists reports_insert_own on reports;
drop policy if exists reports_update_own on reports;

create policy reports_select_own on reports
for select
using (auth.uid() = user_id);

create policy reports_insert_own on reports
for insert
with check (auth.uid() = user_id);

create policy reports_update_own on reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Viral library policies (read-only for authenticated users)
drop policy if exists viral_library_select_authenticated on viral_library_items;

create policy viral_library_select_authenticated on viral_library_items
for select
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

-- Hard quota intercept for analyze usage (DB-level, concurrency-safe)
create or replace function resolve_auth_plan()
returns text
language sql
stable
as $$
  select coalesce(
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

  -- Serialize inserts per user/day to prevent concurrent bypass.
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
