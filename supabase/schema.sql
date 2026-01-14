create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_steam_account_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.steam_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  steam_login text not null,
  persona_name text null,
  status text not null default 'idle',
  proxy_socks5 text null,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, steam_login),
  constraint steam_accounts_status_check
    check (status in ('idle', 'connected', 'pending', 'error'))
);

create table if not exists public.steam_credentials (
  steam_account_id uuid primary key
    references public.steam_accounts(id) on delete cascade,
  payload_enc text not null,
  payload_iv text not null,
  payload_tag text not null,
  key_version int not null default 1,
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null
);

alter table public.user_profiles
  add constraint user_profiles_active_steam_account_id_fkey
  foreign key (active_steam_account_id)
  references public.steam_accounts(id)
  on delete set null;

create index if not exists steam_accounts_user_id_idx
  on public.steam_accounts (user_id);

alter table public.user_profiles enable row level security;
alter table public.steam_accounts enable row level security;
alter table public.steam_credentials enable row level security;

create policy "profiles_owner"
  on public.user_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "steam_accounts_deny_client"
  on public.steam_accounts for all
  using (false);

create policy "steam_credentials_deny_client"
  on public.steam_credentials for select
  using (false);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
