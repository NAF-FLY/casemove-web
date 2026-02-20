-- Add inventory_snapshots table
CREATE TABLE public.inventory_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  steam_account_id uuid NOT NULL REFERENCES public.steam_accounts(id) ON DELETE CASCADE,
  storage_id text NULL,
  total_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_snapshots_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- Add RLS policy allowing users to select snapshots of their own steam accounts
CREATE POLICY "Users can view their own inventory snapshots" ON public.inventory_snapshots
  AS permissive FOR SELECT
  TO authenticated
  USING (
    steam_account_id IN (
      SELECT id FROM public.steam_accounts WHERE user_id = auth.uid()
    )
  );

-- Optimize with an index for looking up latest stats efficiently
CREATE INDEX idx_inventory_snapshots_account_storage_date 
ON public.inventory_snapshots (steam_account_id, storage_id, created_at DESC);
