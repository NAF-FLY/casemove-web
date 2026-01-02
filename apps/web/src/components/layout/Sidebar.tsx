"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Home, Package } from "lucide-react";

import LogoutButton from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Профиль", icon: Home, href: "/" },
  { label: "Инвентарь", icon: Package, href: "/inventory" },
  { label: "Хранилища", icon: Archive, href: "/storage" }
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex min-h-screen flex-col border-r border-white/10 transition-[width,background-color] duration-300 ease-in-out",
        collapsed ? "w-16 bg-[#11162E]" : "w-72 bg-[#141A33]"
      )}
    >
      <div className={cn("flex px-4 py-6", collapsed ? "justify-center" : "justify-end")}>
        <button
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#96A1C9] transition-colors hover:bg-[#1D2444] hover:text-white"
          onClick={() => setCollapsed((prev) => !prev)}
          type="button"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className={cn("flex flex-1 flex-col gap-2", collapsed ? "px-2" : "px-4")}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.label}
              aria-label={item.label}
              className={cn(
                "flex items-center rounded-xl text-sm transition-[background-color,color,padding] duration-300 ease-in-out",
                collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2",
                active
                  ? "bg-[#1D2444] text-white"
                  : "text-[#96A1C9] hover:bg-[#1D2444] hover:text-white"
              )}
              href={item.href}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-[#5BEFE3]" : "text-[#96A1C9]"
                )}
              />
              <span
                className={cn(
                  "max-w-[160px] overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
                  collapsed
                    ? "max-w-0 opacity-0"
                    : "max-w-[160px] opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("mt-auto pb-6", collapsed ? "px-2" : "px-4")}>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
