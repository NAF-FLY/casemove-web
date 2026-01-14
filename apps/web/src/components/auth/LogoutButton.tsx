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

  const handleClick = async () => {
    await logout();
    router.replace("/auth/login");
  };

  return (
    <Button
      aria-label="Log out"
      className={cn(
        "w-full rounded-xl border border-destructive/40 bg-transparent px-3 py-2 text-destructive transition-[gap] duration-300 ease-in-out hover:bg-destructive/10 hover:text-destructive",
        collapsed ? "justify-center gap-0" : "justify-start gap-2",
        className
      )}
      onClick={() => void handleClick()}
      type="button"
      variant="ghost"
    >
      <LogOut className="h-4 w-4" />
      <span
        className={cn(
          "max-w-[120px] overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
          collapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
        )}
      >
        Log out
      </span>
    </Button>
  );
}
