"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/auth.store";

export default function AuthInit() {
  const initFromSession = useAuthStore((state) => state.initFromSession);

  useEffect(() => {
    void initFromSession();
  }, [initFromSession]);

  return null;
}
