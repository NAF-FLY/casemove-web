import type { ReactNode } from "react";

import { cn } from "@/shared/utils/utils";

type TableContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function TableContainer({
  children,
  className
}: TableContainerProps) {
  return <div className={cn("rounded-2xl", className)}>{children}</div>;
}
