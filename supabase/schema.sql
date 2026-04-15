create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  full_name text not null,
  company text not null,
  email text not null,
  phone text not null,
  cnpj text,
  annual_revenue text not null,
  main_challenge text not null,
  source text not null default 'landing_page',
  qualification text not null default 'priority_icp',
  status text not null default 'new',
  page_path text,
  page_url text,
  referrer text,
  session_id text,
  user_agent text,
  consent_version text,
  consent_analytics boolean not null default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_qualification_idx on public.leads (qualification);
create index if not exists leads_email_idx on public.leads (email);

alter table public.leads enable row level security;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  page text,
  page_path text,
  page_url text,
  referrer text,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb not null default '{}'::jsonb,
  lead_id uuid references public.leads (id) on delete set null
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;

create table if not exists public.sessions (
  id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  page_path text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  user_agent text,
  converted boolean not null default false,
  lead_id uuid references public.leads (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists sessions_created_at_idx on public.sessions (created_at desc);
create index if not exists sessions_converted_idx on public.sessions (converted);

alter table public.sessions enable row level security;

drop policy if exists "service_role_all_leads" on public.leads;
create policy "service_role_all_leads"
  on public.leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "authenticated_read_leads" on public.leads;
create policy "authenticated_read_leads"
  on public.leads
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_events" on public.analytics_events;
create policy "service_role_all_events"
  on public.analytics_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "authenticated_read_events" on public.analytics_events;
create policy "authenticated_read_events"
  on public.analytics_events
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_sessions" on public.sessions;
create policy "service_role_all_sessions"
  on public.sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "authenticated_read_sessions" on public.sessions;
create policy "authenticated_read_sessions"
  on public.sessions
  for select
  using (auth.role() = 'authenticated');
