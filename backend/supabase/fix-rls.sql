-- Run this in Supabase SQL Editor if tables already exist and you're getting 406 errors.
-- Disables Row Level Security so the anon key can read/write freely.

alter table rooms disable row level security;
alter table players disable row level security;
