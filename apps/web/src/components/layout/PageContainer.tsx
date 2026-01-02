import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[#181D3E] px-8",
        className
      )}
    >
      {children}
    </div>
  );
}
