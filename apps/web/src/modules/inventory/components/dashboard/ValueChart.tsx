"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";

export interface InventorySnapshot {
  id: string;
  steam_account_id: string;
  storage_id: string | null;
  total_value: number;
  created_at: string;
}

interface ValueChartProps {
  data: InventorySnapshot[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-2 border-b pb-2 text-sm font-medium text-foreground">
          {label}
        </p>
        <div className="flex flex-col gap-1">
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex items-center gap-2">
                <div 
                   className="h-2 w-2 rounded-full" 
                   style={{ backgroundColor: entry.color }} 
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {entry.name}: 
                </span>
                <span className="text-sm font-bold text-foreground">
                  ${Number(entry.value).toFixed(2)}
                </span>
             </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export function ValueChart({ 
  data, 
  isLoading,
  title = "Inventory Value",
  description = "Value over time",
  height = 350
}: ValueChartProps) {

  const chartData = useMemo(() => {
    if (!data?.length) return [];
    
    return data.map(snapshot => {
      const date = new Date(snapshot.created_at);
      return {
        id: snapshot.id,
        date: format(date, "MMM dd, HH:mm"),
        rawDate: date,
        value: Number(snapshot.total_value)
      };
    });
  }, [data]);

  // Determine standard min-max for better chart scaling
  const [minVal, maxVal] = useMemo(() => {
    if (!chartData.length) return [0, 0];
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Expand Y axis slightly so lines don't hug the very top/bottom
    const padding = (max - min) * 0.1 || max * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);


  if (isLoading) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-col gap-2 items-start">
           <Skeleton className="h-6 w-[200px] rounded-lg" />
           <Skeleton className="h-4 w-[300px] rounded-lg" />
        </CardHeader>
        <CardBody className="flex-1">
           <Skeleton className="h-full min-h-[300px] w-full rounded-lg" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
         <h4 className="text-xl font-bold">{title}</h4>
         <p className="text-sm text-default-500">{description}</p>
      </CardHeader>
      <CardBody className="flex-1 overflow-visible">
        {chartData.length > 0 ? (
          <div style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  minTickGap={30}
                />
                <YAxis 
                   domain={[minVal, maxVal]}
                   tickLine={false}
                   axisLine={false}
                   tickFormatter={(value) => `$${value.toFixed(0)}`}
                   tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                   width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
             <p>No historical data available.</p>
             <p className="text-sm">Snapshots are taken automatically over time.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
