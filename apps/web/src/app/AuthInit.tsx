"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/auth.store";

export default function AuthInit() {
  const initFromStorage = useAuthStore((state) => state.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return null;
}
