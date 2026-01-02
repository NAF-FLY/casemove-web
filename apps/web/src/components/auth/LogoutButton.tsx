"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

type LogoutButtonProps = {
  collapsed?: boolean;
  className?: string;
};

export default function LogoutButton({
  collapsed = false,
  className
}: LogoutButtonProps) {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleClick = () => {
    void logout();
    router.push("/auth/login");
  };

  return (
    <Button
      aria-label="Log out"
      className={cn(
        "w-full gap-2 rounded-xl border border-[var(--danger)]/40 bg-transparent px-3 py-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]",
        collapsed ? "justify-center" : "justify-start",
        className
      )}
      onClick={handleClick}
      type="button"
      variant="ghost"
    >
      <LogOut className="h-4 w-4" />
      {collapsed ? null : <span>Log out</span>}
    </Button>
  );
}
