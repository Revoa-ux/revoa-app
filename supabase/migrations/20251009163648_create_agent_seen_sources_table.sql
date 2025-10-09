/*
  # Create agent_seen_sources table for deduplication

  1. New Table
    - `agent_seen_sources`
      - `reel_id_hash` (text, primary key) - SHA1 hash of reel IDs
      - `first_seen_at` (timestamptz) - When the reel was first evaluated
  
  2. Purpose
    - Tracks reels the agent has already evaluated
    - Prevents re-evaluating reels that failed pricing rules
    - Saves time and API rate limits
    - Works alongside external_id UPSERT for complete deduplication
  
  3. Security
    - Enable RLS
    - Only authenticated users can read/write
*/

create table if not exists agent_seen_sources (
  reel_id_hash text primary key,
  first_seen_at timestamptz default now()
);

alter table agent_seen_sources enable row level security;

create policy "Authenticated users can read seen sources"
  on agent_seen_sources
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert seen sources"
  on agent_seen_sources
  for insert
  to authenticated
  with check (true);
