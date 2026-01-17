create table if not exists public.steam_market_prices (
  market_hash_name text primary key,
  price float not null,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

alter table public.steam_market_prices enable row level security;

create policy "Enable read access for all users"
  on public.steam_market_prices for select
  using (true);

create policy "Enable insert/update for service role only"
  on public.steam_market_prices for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
