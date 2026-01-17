import { supabaseAdmin } from "../../core/supabase";

interface MarketPrice {
  market_hash_name: string;
  price: number;
  currency: string;
  updated_at: string;
}

interface SteamApisItem {
  market_hash_name: string;
  price: number;
  median_price?: number;
  volume?: number;
  // ... other fields we don't care about
}

interface SteamApisResponse {
  items: SteamApisItem[];
}

const STEAM_APIS_KEY = process.env.STEAM_APIS_KEY;
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const MIN_UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes global debounce for concurrent reloads

// In-memory timestamp to prevent hammering the DB with checks/updates on every request if many users load at once
let lastUpdateAttempt = 0;

export const priceService = {
  async getPrices(marketHashNames: string[]): Promise<Map<string, number>> {
    if (marketHashNames.length === 0) {
      return new Map();
    }

    // Try to update prices if needed (fire and forget to not block UI)
    this.maybeUpdatePrices().catch((err) => {
      console.error("Failed to background update prices:", err);
    });

    // Fetch from DB
    const { data, error } = await supabaseAdmin
      .from("steam_market_prices")
      .select("market_hash_name, price")
      .in("market_hash_name", marketHashNames);

    if (error) {
      console.error("Failed to fetch prices from DB:", error);
      return new Map();
    }

    const priceMap = new Map<string, number>();
    for (const item of data || []) {
      priceMap.set(item.market_hash_name, item.price);
    }
    return priceMap;
  },

  async maybeUpdatePrices() {
    if (!STEAM_APIS_KEY) {
      console.warn("STEAM_APIS_KEY is not set, skipping price update");
      return;
    }

    const now = Date.now();
    if (now - lastUpdateAttempt < MIN_UPDATE_INTERVAL_MS) {
      return;
    }
    lastUpdateAttempt = now;

    // Check age of a reference item (e.g. 'AK-47 | Redline (Field-Tested)') or just check the most recently updated item
    // Actually, let's just check if ANY item was updated recently.
    const { data: latestProxy } = await supabaseAdmin
      .from("steam_market_prices")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (latestProxy) {
      const lastUpdate = new Date(latestProxy.updated_at).getTime();
      if (now - lastUpdate < CACHE_DURATION_MS) {
        console.log("Prices are fresh enough, skipping update");
        return;
      }
    }

    console.log("Prices are stale or missing, updating from SteamAPIs...");
    await this.performUpdate();
  },

  async performUpdate() {
    try {
      // NOTE: SteamAPIs format for all items: https://api.steamapis.com/market/items/730?api_key=...
      // Docs say it returns an object where keys are hash names, OR a list. Let's verify standard behavior.
      // Standard /market/items/730 usually returns: { "Market Hash Name": { price: ... }, ... } or list depending on query.
      // Let's assume the 'Compact' = false or default.
      // Actually, looking at docs or common usage, often it is GET https://api.steamapis.com/market/items/730?api_key=...&format=compact
      // resulting in { "hash_name": price_float, ... } is most efficient.
      // Let's try standard compact first as it's smallest.

      const response = await fetch(
        `https://api.steamapis.com/market/items/730?api_key=${STEAM_APIS_KEY}&format=compact`
      );

      if (!response.ok) {
        throw new Error(`SteamAPIs error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, number>;
      
      // Transform to DB rows
      // Batch upsert in chunks to avoid request size limits (Supabase limit is usually huge, but safe to chunk 1000s)
      const rows = Object.entries(data).map(([name, price]) => ({
        market_hash_name: name,
        price: price,
        currency: 'USD',
        updated_at: new Date().toISOString()
      }));

      console.log(`Fetched ${rows.length} prices from SteamAPIs. Upserting...`);

      // Upsert in batches of 3000
      const batchSize = 3000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabaseAdmin
          .from("steam_market_prices")
          .upsert(batch, { onConflict: "market_hash_name" });
        
        if (error) {
          console.error("Error upserting price batch:", error);
        }
      }
      
      console.log("Price update complete.");

    } catch (err) {
      console.error("Error performing price update:", err);
    }
  }
};
