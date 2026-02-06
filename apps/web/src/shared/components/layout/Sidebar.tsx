"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Home, Package } from "lucide-react";

import LogoutButton from "@/modules/auth/components/LogoutButton";
import { cn } from "@/shared/utils/utils";
import { useAuthStore } from "@/modules/auth/auth.store";

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
};

export default function Sidebar({ collapsed }: SidebarProps) {
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
        "fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] flex-col border-r border-border/60 bg-[#151A25] transition-[width] duration-500 ease-out",
        collapsed ? "w-24" : "w-72"
      )}
    >
      <nav
        className={cn(
          "flex flex-1 flex-col gap-2 pt-4",
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
                  "absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-primary transition-opacity duration-200 ease-out",
                  collapsed ? "-left-2" : "-left-4",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Link
                aria-label={item.label}
                className={cn(
                  "relative flex items-center rounded-xl text-[16px] transition-colors duration-150 ease-out",
                  collapsed
                    ? "h-[52px] w-[52px] justify-center p-0"
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
                <span className={cn("truncate", collapsed ? "hidden" : "inline")}>
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>
      <div className={cn("mt-auto flex flex-col gap-2 pb-6", collapsed ? "px-2" : "px-4")}>
        {!collapsed && (
          <div className="flex flex-col gap-2">
            <div
              className="flex w-full justify-center rounded-xl border border-border/60 bg-card py-1.5 text-xs font-medium"
            >
              <span className={statusStyles[steamStatus]}>{statusText}</span>
            </div>
            <div className="px-1 text-center text-xs text-muted-foreground">
              {userEmail ?? "Account"}
            </div>
          </div>
        )}

        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
