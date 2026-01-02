"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth.store";

type RedirectIfAuthenticatedProps = {
  children: ReactNode;
};

export default function RedirectIfAuthenticated({
  children
}: RedirectIfAuthenticatedProps) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace("/inventory");
    }
  }, [router, token]);

  if (token) {
    return null;
  }

  return <>{children}</>;
}
