"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth.store";

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !token) {
      router.push("/auth/login");
    }
  }, [router, token, isInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#A1ADD6]">
        Loading...
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
