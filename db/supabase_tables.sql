-- Supabase / Postgres table definitions for HomeWorksheets

create table if not exists signups (
  id bigint generated always as identity primary key,
  child_name text not null,
  year_level text not null,
  email text not null,
  parent_name text not null,
  referrer_name text,
  days text,
  resend boolean default false,
  resend_date text,
  resend_reason text,
  resend_requested_at timestamptz,
  signature text,
  created_at timestamptz default now()
);

create table if not exists completions (
  id bigint generated always as identity primary key,
  email text not null,
  name text not null,
  year text not null,
  date text not null,
  created_at timestamptz default now()
);

create table if not exists homework_entries (
  id bigint generated always as identity primary key,
  date text not null,
  day text,
  maths_topic text,
  maths_instructions text,
  maths_questions text[],
  maths_word_problem text,
  reading_title text,
  reading_text text,
  reading_questions text[],
  writing_type text,
  writing_prompt text,
  writing_word_count text,
  grammar_topic text,
  grammar_instruction text,
  grammar_exercise text,
  year_level text not null,
  generated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(date, year_level)
);

create table if not exists sent_emails (
  id bigint generated always as identity primary key,
  email text not null,
  name text,
  year text,
  date text,
  status text,
  provider_response jsonb,
  created_at timestamptz default now()
);

-- resend_requests removed; resends are now flagged on signups table

create table if not exists curriculum_items (
  id bigint generated always as identity primary key,
  year_level text not null,
  subject text not null,
  topic text,
  subtopic text,
  skill text,
  difficulty text,
  question_type text,
  example_prompt text,
  created_at timestamptz default now()
);
