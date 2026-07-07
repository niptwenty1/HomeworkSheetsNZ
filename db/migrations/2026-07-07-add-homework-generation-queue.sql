create table if not exists homework_generation_queue (
  id bigint generated always as identity primary key,
  reference_date text not null,
  year_level text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  source_route text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(reference_date, year_level)
);

create index if not exists idx_homework_generation_queue_status_updated
  on homework_generation_queue (status, updated_at);
