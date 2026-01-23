"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <PageContainer className="px-0">
      <div className="relative min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
        <div
          className={cn(
            "min-h-screen transition-[margin-left] duration-300 ease-in-out",
            collapsed ? "ml-28" : "ml-72"
          )}
        >
          {children}
        </div>
      </div>
    </PageContainer>
  );
}
