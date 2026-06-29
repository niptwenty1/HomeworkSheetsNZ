-- Supabase / Postgres table definitions for HomeWorksheets

create table if not exists signups (
  id bigint generated always as identity primary key,
  child_name text not null,
  year_level text not null,
  email text not null,
  parent_name text not null,
  referrer_name text,
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
