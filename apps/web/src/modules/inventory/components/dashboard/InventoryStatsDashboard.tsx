"use client";

import { useState, useEffect, useMemo } from "react";
import { ValueChart, type InventorySnapshot } from "./ValueChart";
import { Select, SelectItem, Alert } from "@heroui/react";
import { AlertCircle } from "lucide-react";

interface InventoryStatsDashboardProps {
  steamAccountId: string;
  storages: Array<{ id: string; name: string }>;
}

export function InventoryStatsDashboard({ steamAccountId, storages }: InventoryStatsDashboardProps) {
  const [selectedStorageId, setSelectedStorageId] = useState<string>("main");
  const [stats, setStats] = useState<InventorySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!steamAccountId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams({ steamAccountId });
        if (selectedStorageId !== "main") {
          queryParams.append("storageId", selectedStorageId);
        }
        
        // This assumes you have fetch wrapper or proxy set up for /api calls
        // In this project it often might go through trpc or custom fetch logic
        const response = await fetch(`/api/inventory/stats?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch inventory stats");
        }
        
        const data = await response.json();
        setStats(data.stats || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Could not load inventory statistics.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [steamAccountId, selectedStorageId]);

  const allOptions = useMemo(() => [
    { id: "main", name: "Main Inventory" },
    ...storages
  ], [storages]);

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Value History</h2>
            <p className="text-muted-foreground">
              Track the value of your items over time
            </p>
          </div>
          
          <div className="w-full sm:w-[250px]">
            <Select
              items={allOptions}
              selectedKeys={[selectedStorageId]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                if (selected) setSelectedStorageId(selected);
              }}
              isDisabled={isLoading}
              variant="bordered"
              aria-label="Select inventory scope"
            >
              {(storage) => (
                <SelectItem key={storage.id} textValue={storage.name}>
                  {storage.name}
                </SelectItem>
              )}
            </Select>
          </div>
       </div>

       {error && (
         <Alert color="danger" title={error} />
       )}

       {!error && (
         <div className="h-[400px]">
           <ValueChart 
             data={stats} 
             isLoading={isLoading} 
             title={selectedStorageId === "main" ? "Main Inventory Value" : "Storage Unit Value"}
             description={stats.length > 0 && stats[stats.length - 1] 
               ? `Latest value: $${Number(stats[stats.length - 1].total_value).toFixed(2)}`
               : "No data available yet"}
             height={350}
           />
         </div>
       )}
    </div>
  );
}
