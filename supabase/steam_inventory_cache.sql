create table if not exists public.steam_inventory_cache (
  steam_account_id uuid primary key references public.steam_accounts(id) on delete cascade,
  items jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.steam_inventory_cache enable row level security;

create policy "Enable read access for own account"
  on public.steam_inventory_cache for select
  using (exists (
    select 1 from public.steam_accounts
    where steam_accounts.id = steam_inventory_cache.steam_account_id
    and steam_accounts.user_id = auth.uid()
  ));

create policy "Enable insert/update for service role only"
  on public.steam_inventory_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
