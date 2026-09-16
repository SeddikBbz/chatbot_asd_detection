-- =====================================================================
-- ASD Chatbot - Supabase (PostgreSQL) schema
-- Replaces the old MySQL/phpMyAdmin dump ("chatbot Db.sql").
-- Run this once inside: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- Needed for gen_random_uuid() / crypto helpers (Supabase enables this by default)
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create table if not exists users (
  user_id     bigint generated always as identity primary key,
  username    varchar(255) not null,
  email       varchar(255) not null unique,
  password    varchar(255) not null,      -- bcrypt hash, never plain text
  is_parent   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------
create table if not exists children (
  child_id    bigint generated always as identity primary key,
  parent_id   bigint references users(user_id) on delete cascade,
  child_name  varchar(255) not null,
  age         int
);

-- ---------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------
create table if not exists conversations (
  conversation_id bigint generated always as identity primary key,
  user_id         bigint references users(user_id) on delete cascade,
  child_id        bigint references children(child_id) on delete set null,
  start_time      timestamptz not null default now(),
  end_time        timestamptz,
  favorite        boolean
);

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create table if not exists messages (
  message_id      bigint generated always as identity primary key,
  conversation_id bigint references conversations(conversation_id) on delete cascade,
  sender          varchar(10) not null check (sender in ('user','bot')),
  message_content text,
  "timestamp"     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- asd_metrics  (answers to the ASD screening questionnaire)
-- ---------------------------------------------------------------------
create table if not exists asd_metrics (
  metric_id     bigint generated always as identity primary key,
  user_id       bigint references users(user_id) on delete cascade,
  child_id      bigint references children(child_id) on delete cascade,
  metric_name   varchar(255) not null,
  metric_value  double precision,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- asd_analysis (kept for compatibility with the original design)
-- ---------------------------------------------------------------------
create table if not exists asd_analysis (
  analysis_id  bigint generated always as identity primary key,
  user_id      bigint references users(user_id) on delete cascade,
  message_id   bigint references messages(message_id) on delete cascade,
  asd_score    double precision,
  asd_category varchar(10) default 'low' check (asd_category in ('low','medium','high'))
);

-- ---------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------
create index if not exists idx_children_parent_id        on children(parent_id);
create index if not exists idx_conversations_user_id      on conversations(user_id);
create index if not exists idx_conversations_child_id     on conversations(child_id);
create index if not exists idx_messages_conversation_id   on messages(conversation_id);
create index if not exists idx_asd_metrics_user_id        on asd_metrics(user_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- The Node backend talks to Supabase with the SERVICE ROLE key, which
-- bypasses RLS by design (that's what lets one backend serve every
-- user while keeping the anon/public key locked down). We still turn
-- RLS on and deny anonymous access, so nothing is reachable directly
-- from the browser with the public anon key.
-- ---------------------------------------------------------------------
alter table users        enable row level security;
alter table children     enable row level security;
alter table conversations enable row level security;
alter table messages     enable row level security;
alter table asd_metrics  enable row level security;
alter table asd_analysis enable row level security;

-- No policies are created on purpose: with RLS enabled and zero
-- policies, the anon/public key can read or write nothing. Only
-- requests authenticated with the service_role key (used exclusively
-- by server.js, never shipped to the browser) can access these tables.
