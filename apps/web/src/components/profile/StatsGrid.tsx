import { BadgeDollarSign, Clock, Package } from "lucide-react";
import { Card, CardBody } from "@heroui/react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  icon: typeof Package;
  accentClass: string;
};

function StatCard({ label, value, change, icon: Icon, accentClass }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card/80">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 12% 10%, rgba(45,212,191,0.16), transparent 55%), radial-gradient(circle at 88% 90%, rgba(99,102,241,0.14), transparent 60%), linear-gradient(135deg, rgba(12,18,28,0.92), rgba(16,22,34,0.96))"
        }}
      />
      <CardBody className="relative p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{change}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background/40",
              accentClass
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function StatsGrid() {
  const stats = [
    {
      accentClass: "text-cyan-300",
      change: "+32 this week",
      icon: Package,
      label: "Total Items",
      value: "1,247"
    },
    {
      accentClass: "text-violet-300",
      change: "+124 this week",
      icon: BadgeDollarSign,
      label: "Total Value",
      value: "$8,492"
    },
    {
      accentClass: "text-emerald-300",
      change: "2m ago",
      icon: Clock,
      label: "Last Sync",
      value: "2m"
    }
  ];

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          accentClass={stat.accentClass}
          change={stat.change}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
        />
      ))}
    </div>
  );
}
