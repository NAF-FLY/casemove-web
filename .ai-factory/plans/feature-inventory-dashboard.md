# Plan: Inventory Value Dashboard

**Branch:** `feature/inventory-dashboard`
**Created At:** 2026-02-20

## Settings

- **Testing:** No
- **Logging:** Standard (INFO level, key events only)
- **Docs:** Update `/aif-docs` after implementation

## Requirements Analysis

- Track value of Steam inventories over time.
- Re-check and snapshot value every 12 hours.
- Support tracking overall inventory vs individual storages.
- Build a beautiful graphical dashboard in the Next.js frontend to display the statistics.

## Tasks

### Phase 1: Database Setup
- [x] **Task 1: Migration for Snapshots Table**
  - Create Supabase migration to add `inventory_snapshots` table.
  - Columns: `id` (uuid pk), `steam_account_id` (uuid, fk), `storage_id` (text, nullable, for tracking specific storage), `total_value` (numeric), `created_at` (timestamptz default now).
  - Add Row Level Security (RLS) policies allowing users to read their own accounts' snapshots.
  - Apply the migration locally.

### Phase 2: Backend Cron & Snapshot Logic
- [x] **Task 2: Snapshot Business Logic**
  - In `apps/api/src/modules/inventory/service.ts`, implement `takeInventorySnapshot(steamAccountId)`:
    - Call `getInventory` to re-fetch and price the main inventory.
    - Sum up item prices for `total_value`.
    - Insert a record into `inventory_snapshots` with `storage_id = null`.
    - Fetch storages for the account, and for each storage, insert a record into `inventory_snapshots` with the storage's `total_value` and `storage_id`.
  - Add standard `console.info` logging for snapshot events.
- [x] **Task 3: Backend Cron Scheduler**
  - Install `node-cron` package in `apps/api`.
  - Create `apps/api/src/plugins/cron.ts` (or modify composition root).
  - Set up a cron schedule (`0 */12 * * *` - every 12 hours) to query all active `steam_accounts` and execute `takeInventorySnapshot` for each.
  - Add basic error handling and standard logging.

### Phase 3: Backend API Endpoint
- [x] **Task 4: Historical Stats Endpoint**
  - Create `GET /api/inventory/stats` endpoint in `apps/api/src/modules/inventory/routes.ts` (or a dedicated stats module).
  - Accept query params: `steamAccountId` and optional `storageId`.
  - Fetch ordered snapshots from `inventory_snapshots` to serve to the frontend.

### Phase 4: Frontend UI
- [x] **Task 5: Chart Library Setup**
  - Install `recharts` package in `apps/web`.
- [x] **Task 6: Dashboard Component**
  - Create a new `ValueChart` component using `recharts` to render a beautiful Area/Line chart for historical value.
  - Create a new `InventoryStatsDashboard` layout that displays the chart.
  - Implement a selector (Dropdown/Tabs) to switch between "Main Inventory" and specific "Storages".
  - Integrate data fetching to call the new `/api/inventory/stats` endpoint.

## Commit Plan

- **Commit 1:** feat(db): add inventory snapshots table and RLS policies (Completes Task 1)
- **Commit 2:** feat(api): implement snapshot logic and cron scheduler every 12h (Completes Task 2, 3)
- **Commit 3:** feat(api): add endpoint for historical inventory stats (Completes Task 4)
- **Commit 4:** feat(web): setup chart library and build value dashboard UI (Completes Task 5, 6)
