-- Run in Supabase SQL Editor (https://supabase.com/dashboard)

-- Setlist links
create table if not exists setlist (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  created_at timestamptz default now()
);

-- Jam sync session (singleton row — both listeners sync to this)
create table if not exists listen_session (
  id int primary key default 1 check (id = 1),
  video_id text not null,
  url text not null,
  started_at timestamptz not null default now(),
  is_paused boolean default false,
  pause_position float default 0
);

-- Allow public read/write for personal obscured app (no auth)
alter table setlist enable row level security;
alter table listen_session enable row level security;

create policy "setlist read" on setlist for select using (true);
create policy "setlist insert" on setlist for insert with check (true);

create policy "listen read" on listen_session for select using (true);
create policy "listen upsert" on listen_session for insert with check (true);
create policy "listen update" on listen_session for update using (true);

-- Enable Realtime for instant jam sync (required for Spotify Jam feel)
alter publication supabase_realtime add table listen_session;
