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
        "min-h-screen bg-background px-8 text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
