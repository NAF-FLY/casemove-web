"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import PageContainer from "@/shared/components/layout/PageContainer";
import Sidebar from "@/shared/components/layout/Sidebar";
import { cn } from "@/shared/utils/utils";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <PageContainer className="px-0">
      <div className="relative min-h-screen bg-background">
        <header className="fixed left-0 top-0 z-50 flex h-20 w-full items-center border-b border-border/60 bg-[#151A25] px-6">
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setCollapsed((prev) => !prev)}
              type="button"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#8b5cf6] text-white">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  focusable="false"
                  role="img"
                  viewBox="0 0 512 512"
                >
                  <path
                    d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6V377.4c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4V134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1v-188L288 246.6v188z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold text-foreground">
                  CS2 Vault
                </div>
                <div className="text-xs text-muted-foreground">
                  Inventory Manager
                </div>
              </div>
            </div>
          </div>
        </header>
        <Sidebar
          collapsed={collapsed}
        />
        <div
          className={cn(
            "min-h-screen pt-20 transition-[margin-left] duration-500 ease-out",
            collapsed ? "ml-24" : "ml-72"
          )}
        >
          {children}
        </div>
      </div>
    </PageContainer>
  );
}
