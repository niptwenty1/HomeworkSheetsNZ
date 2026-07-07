create table if not exists claude_usage_logs (
  id bigint generated always as identity primary key,
  source_route text not null,
  year_level text,
  reference_date text,
  generated_rows integer default 0,
  school_days_count integer default 0,
  status text,
  error_message text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  total_tokens integer default 0,
  model text,
  max_tokens integer,
  created_at timestamptz default now()
);

create index if not exists idx_claude_usage_logs_created_at
  on claude_usage_logs (created_at desc);

create index if not exists idx_claude_usage_logs_route_year
  on claude_usage_logs (source_route, year_level);
