begin;

set local role authenticated;

-- User A context
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'app_metadata', json_build_object('plan', 'free')
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into reports (
  id,
  user_id,
  video_id,
  status,
  analysis_json,
  benchmarks_json,
  score_json,
  score_total,
  model_trace,
  created_at,
  updated_at
) values (
  'aaaa1111-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'qa-rls-video-20260306',
  'queued',
  null,
  null,
  null,
  null,
  null,
  now(),
  now()
);

insert into usage_logs (
  id,
  user_id,
  action,
  cost_tokens,
  cost_usd,
  created_at
) values (
  'bbbb1111-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'analyze',
  0,
  null,
  now()
);

insert into videos (
  video_id,
  url,
  title,
  description,
  channel_id,
  channel_name,
  published_at,
  duration_sec,
  stats,
  thumbnail_url,
  top_comments,
  data_source,
  fetched_at
) values (
  'qa-shared-video-20260306',
  'https://www.youtube.com/watch?v=qa-shared-video-20260306',
  'QA Shared Video',
  'Shared cache smoke test row.',
  'qa-channel',
  'QA Channel',
  now(),
  120,
  '{"viewCount": 1000, "likeCount": 120, "commentCount": 12}'::jsonb,
  'https://example.com/thumb.jpg',
  '[]'::jsonb,
  'mock_demo',
  now()
);

insert into viral_library_items (
  id,
  title,
  source_url,
  summary,
  tags,
  embedding_key,
  created_at
) values (
  'cccc1111-1111-4111-8111-111111111111',
  'QA Shared Library Item',
  'https://example.com/qa-shared-library-item',
  'RLS smoke test library item.',
  '{"hook_type":"outcome-first","topic":"qa","duration_bucket":"5-10m"}'::jsonb,
  'qa-rls-embedding-20260306',
  now()
);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from reports
  where id = 'aaaa1111-1111-4111-8111-111111111111';

  if visible_count <> 1 then
    raise exception 'User A should see own report, got % rows', visible_count;
  end if;

  select count(*) into visible_count
  from usage_logs
  where id = 'bbbb1111-1111-4111-8111-111111111111';

  if visible_count <> 1 then
    raise exception 'User A should see own usage log, got % rows', visible_count;
  end if;
end $$;

-- User B context
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '22222222-2222-2222-2222-222222222222',
    'role', 'authenticated',
    'app_metadata', json_build_object('plan', 'free')
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  visible_count integer;
  touched_count integer;
begin
  select count(*) into visible_count
  from reports
  where id = 'aaaa1111-1111-4111-8111-111111111111';

  if visible_count <> 0 then
    raise exception 'User B should not see User A report, got % rows', visible_count;
  end if;

  select count(*) into visible_count
  from usage_logs
  where id = 'bbbb1111-1111-4111-8111-111111111111';

  if visible_count <> 0 then
    raise exception 'User B should not see User A usage log, got % rows', visible_count;
  end if;

  update reports
     set status = 'done'
   where id = 'aaaa1111-1111-4111-8111-111111111111';

  get diagnostics touched_count = row_count;
  if touched_count <> 0 then
    raise exception 'User B should not update User A report, touched % rows', touched_count;
  end if;

  select count(*) into visible_count
  from videos
  where video_id = 'qa-shared-video-20260306';

  if visible_count <> 1 then
    raise exception 'Authenticated user should see shared video cache row, got % rows', visible_count;
  end if;

  select count(*) into visible_count
  from viral_library_items
  where id = 'cccc1111-1111-4111-8111-111111111111';

  if visible_count <> 1 then
    raise exception 'Authenticated user should see shared library row, got % rows', visible_count;
  end if;

  update viral_library_items
     set summary = 'Updated by second authenticated user.'
   where id = 'cccc1111-1111-4111-8111-111111111111';

  get diagnostics touched_count = row_count;
  if touched_count <> 1 then
    raise exception 'Authenticated user should update shared library row, touched % rows', touched_count;
  end if;
end $$;

rollback;
