alter table if exists claude_usage_logs
  add column if not exists cache_read_input_tokens integer default 0;

alter table if exists claude_usage_logs
  add column if not exists cache_creation_input_tokens integer default 0;

alter table if exists claude_usage_logs
  add column if not exists billed_input_estimate integer default 0;
