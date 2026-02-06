"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/modules/auth/auth.store";

export default function AuthInit() {
  const initFromSession = useAuthStore((state) => state.initFromSession);

  useEffect(() => {
    void initFromSession();
  }, [initFromSession]);

  return null;
}
