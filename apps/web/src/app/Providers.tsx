"use client";

import type { ReactNode } from "react";
import { HeroUIProvider, ToastProvider } from "@heroui/react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <ToastProvider />
      {children}
    </HeroUIProvider>
  );
}
