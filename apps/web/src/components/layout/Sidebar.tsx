"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ChevronLeft, ChevronRight, Home, Package } from "lucide-react";

import LogoutButton from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const statusStyles = {
  connected: "text-primary",
  error: "text-destructive",
  idle: "text-muted-foreground",
  pending: "text-muted-foreground"
} as const;

const navigation = [
  { label: "Профиль", icon: Home, href: "/profile" },
  { label: "Инвентарь", icon: Package, href: "/inventory" },
  { label: "Хранилища", icon: Archive, href: "/storage" }
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const steamStatus = useAuthStore((state) => state.steamStatus);
  const userEmail = useAuthStore((state) => state.userEmail);

  const statusText =
    steamStatus === "connected"
      ? "Steam: Connected"
      : steamStatus === "error"
        ? "Steam: Error"
        : steamStatus === "pending"
          ? "Steam: Connecting..."
          : "Steam: Idle";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex min-h-screen flex-col border-r border-border/60 bg-[#151A25] transition-[width] duration-300 ease-in-out",
        collapsed ? "w-28" : "w-72"
      )}
    >
      <div
        className={cn(
          "relative flex h-20 items-center border-b border-border/60",
          collapsed ? "px-1" : "px-4"
        )}
      >
        <div
          className={cn(
            "flex items-center transition-[gap] duration-300 ease-in-out",
            collapsed ? "flex-1 justify-center gap-0" : "gap-3"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#8b5cf6] text-white",
              collapsed ? "h-10 w-10" : "h-10 w-10"
            )}
          >
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
          <div
            className={cn(
              "overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-in-out",
              collapsed ? "max-w-0" : "max-w-[180px]"
            )}
          >
            <div
              className={cn(
                "transition-[opacity,transform] duration-300 ease-in-out",
                collapsed
                  ? "-translate-x-2 opacity-0"
                  : "translate-x-0 opacity-100"
              )}
            >
              <div className="text-base font-semibold text-foreground">
                CS2 Vault
              </div>
              <div className="text-sm text-muted-foreground">
                Inventory Manager
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav
        className={cn(
          "flex flex-1 flex-col gap-2 pt-3",
          collapsed ? "px-2" : "px-4"
        )}
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <div
              key={item.label}
              className={cn("relative w-full", collapsed ? "flex justify-center" : "")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                  collapsed ? "-left-2" : "-left-4",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Link
                aria-label={item.label}
                className={cn(
                  "relative flex items-center rounded-xl text-[16px] transition-[background-color,color,padding,width,gap] duration-300 ease-in-out",
                  collapsed
                    ? "h-[52px] w-[52px] justify-center gap-0 p-0"
                    : "gap-3 px-3 py-2",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                href={item.href}
              >
                <Icon
                  className={cn(
                    collapsed ? "h-[22px] w-[22px]" : "h-5 w-5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "max-w-[160px] overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-in-out",
                    collapsed ? "max-w-0" : "max-w-[160px]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block transition-[opacity,transform] duration-300 ease-in-out",
                      collapsed
                        ? "-translate-x-2 opacity-0"
                        : "translate-x-0 opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </Link>
            </div>
          );
        })}
      </nav>
      <div className={cn("mt-auto flex flex-col gap-2 pb-6", collapsed ? "px-2" : "px-4")}>
        <div
          className={cn(
            "flex flex-col gap-2 overflow-hidden transition-[opacity,height] duration-300 ease-in-out",
            collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
          )}
        >
          <Badge
            className="flex w-full justify-center rounded-xl border border-border/60 bg-card py-1.5 text-xs font-medium"
            variant="outline"
          >
            <span className={statusStyles[steamStatus]}>{statusText}</span>
          </Badge>
          <div className="px-1 text-center text-xs text-muted-foreground">
            {userEmail ?? "Account"}
          </div>
        </div>

        <button
          className={cn(
             "flex w-full items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
             collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
          )}
          onClick={onToggle}
          type="button"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
             <ChevronLeft className="h-4 w-4" />
          )}
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out",
              collapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"
            )}
          >
            Свернуть
          </span>
        </button>

        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
