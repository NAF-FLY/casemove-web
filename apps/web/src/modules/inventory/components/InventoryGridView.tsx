import { cn } from "@/shared/utils/utils";
import { VirtuosoGrid } from "react-virtuoso";
import { forwardRef } from "react";

import type { InventoryDisplayItem } from "../inventory.mappers";
import InventoryGridItem from "./InventoryGridItem";

type InventoryGridViewProps = {
  items: InventoryDisplayItem[];
  onToggle: (id: string) => void;
};

const GridList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <div
      ref={ref}
      {...props}
      className={cn(
        "grid auto-rows-fr gap-3 grid-cols-2 min-[700px]:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] xl:grid-cols-4 2xl:grid-cols-6",
        props.className
      )}
    />
  )
);
GridList.displayName = "GridList";

const GridItemWrapper = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div ref={ref} {...props} className="h-full" />
));
GridItemWrapper.displayName = "GridItemWrapper";

export default function InventoryGridView({
  items,
  onToggle
}: InventoryGridViewProps) {
  return (
    <VirtuosoGrid
      useWindowScroll
      data={items}
      overscan={400}
      components={{
        List: GridList,
        Item: GridItemWrapper
      }}
      itemContent={(index, displayItem) => (
        <InventoryGridItem
          key={displayItem.item.id}
          index={index}
          displayItem={displayItem}
          onToggle={onToggle}
        />
      )}
    />
  );
}
