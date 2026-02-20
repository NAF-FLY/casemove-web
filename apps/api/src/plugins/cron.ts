import cron from "node-cron";
import { supabaseAdmin } from "../core/supabase";
import { takeInventorySnapshot } from "../modules/inventory/service";

export function registerCronJobs() {
  console.log("[Cron] Registering scheduled jobs...");

  // Run every 12 hours
  cron.schedule("0 */12 * * *", async () => {
    console.log("[Cron] Starting 12h inventory snapshot job...");
    try {
      // 1. Fetch all active steam accounts
      const { data: accounts, error } = await supabaseAdmin
        .from("steam_accounts")
        .select("id")
        // Optionally, you might want to filter active accounts only
        // .eq("status", "active")
        ;

      if (error) {
        console.error("[Cron] Failed to fetch steam accounts:", error);
        return;
      }

      if (!accounts || accounts.length === 0) {
        console.log("[Cron] No steam accounts found for snapshot.");
        return;
      }

      console.log(`[Cron] Found ${accounts.length} accounts to process.`);

      // 2. Process each account sequentially to avoid overwhelming Steam/Rate limits
      for (const account of accounts) {
        console.log(`[Cron] Processing account: ${account.id}`);
        await takeInventorySnapshot(account.id);
        
        // Add a small delay between accounts to be polite to Steam API
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      console.log("[Cron] Finished 12h inventory snapshot job successfully.");
    } catch (err) {
      console.error("[Cron] Error during snapshot job execution:", err);
    }
  });

  console.log("[Cron] 12h inventory snapshot job registered.");
}
