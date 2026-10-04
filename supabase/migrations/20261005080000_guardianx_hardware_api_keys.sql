-- GUARDIAN X — Hardware API keys for ESP32/guardian palm devices
--
-- Stores hashed API keys so the real secret never reaches the database in
-- plaintext. The admin workflow generates a key, shows it once, hashes it, and
-- stores only the hash. Verification recomputes the hash and compares it.

create table public.hardware_api_keys (
  id          text primary key,
  -- SHA-256 hex digest of the API key. The actual key is shown once at creation
  -- time and never recovered from this column.
  key_hash    text not null unique,
  -- A short human-readable prefix so an admin can tell which key is which
  -- without exposing the secret itself.
  key_prefix  text not null,
  device_name text not null check (char_length(device_name) between 1 and 120),
  -- 'active' allows requests; 'revoked' blocks them immediately.
  status      text not null default 'active'
              check (status in ('active', 'revoked')),
  -- The admin profile that created this key.
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.hardware_api_keys enable row level security;

revoke all on public.hardware_api_keys from anon, authenticated;

-- Only admins can manage keys.
grant select, insert, update, delete on public.hardware_api_keys
  to authenticated
  with check option (public.is_admin());

create policy hardware_api_keys_admin
  on public.hardware_api_keys
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
