-- ROOMS: one per Drop session
create table if not exists rooms (
  id text primary key,
  decision text not null,
  location text,
  status text default 'waiting',
  current_speaker_role text,
  reasoning_stream text,
  final_decision text,
  final_reason text,
  host_id text,
  created_at timestamptz default now()
);

-- PLAYERS: one per person in the room
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  room_id text references rooms(id) on delete cascade,
  name text not null,
  role text not null,
  role_emoji text not null,
  role_label text not null,
  transcript text,
  has_spoken boolean default false,
  joined_at timestamptz default now()
);

-- Enable Realtime on both tables
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- Indexes
create index if not exists players_room_id_idx on players(room_id);
create index if not exists rooms_status_idx on rooms(status);
