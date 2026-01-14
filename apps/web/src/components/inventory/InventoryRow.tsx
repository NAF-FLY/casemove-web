import { Checkbox, TableCell, TableRow } from "@heroui/react";
import {
  tableCellBaseClass,
  tableCellLeftBorderClass,
  tableCellRightBorderClass,
  tableRowClass
} from "@/components/ui/tableStyles";
import { cn } from "@/lib/utils";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  price: string | number;
  location: string;
  iconUrl?: string | null;
  rarityDot?: string | null;
};

type InventoryRowProps = {
  item: InventoryItem;
  selected: boolean;
  onToggle: (id: string) => void;
};

function getRarityClass(rarity: string) {
  if (rarity === "Covert") {
    return "text-destructive";
  }

  if (rarity === "Classified") {
    return "text-primary";
  }

  return "text-muted-foreground";
}

function getRarityDotClass(rarity: string | null | undefined) {
  switch (rarity) {
    case "Consumer":
      return "bg-slate-500";
    case "Industrial":
      return "bg-blue-500";
    case "Mil-Spec":
      return "bg-indigo-500";
    case "Restricted":
      return "bg-purple-500";
    case "Classified":
      return "bg-pink-500";
    case "Covert":
      return "bg-red-500";
    case "Contraband":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}

export default function InventoryRow({
  item,
  selected,
  onToggle
}: InventoryRowProps) {
  return (
    <TableRow
      className={tableRowClass}
      data-state={selected ? "selected" : undefined}
    >
      <TableCell
        className={cn(
          tableCellBaseClass,
          tableCellLeftBorderClass,
          "w-[32px] rounded-l-xl pl-4"
        )}
      >
        <Checkbox
          isSelected={selected}
          radius="sm"
          onValueChange={() => onToggle(item.id)}
        />
      </TableCell>
      <TableCell className={cn(tableCellBaseClass, "w-[40px] px-2")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
          {item.iconUrl ? (
            <img
              alt={item.name}
              className="h-8 w-8 rounded-md object-contain"
              src={item.iconUrl}
            />
          ) : null}
        </div>
      </TableCell>
      <TableCell className={cn(tableCellBaseClass, "px-3 truncate")}>
        <div className="flex items-center gap-2">
          {item.rarityDot ? (
            <span
              aria-hidden
              className={cn("h-2 w-2 rounded-full", getRarityDotClass(item.rarityDot))}
            />
          ) : null}
          <span>{item.name}</span>
        </div>
      </TableCell>
      <TableCell
        className={cn(tableCellBaseClass, "px-3", getRarityClass(item.rarity))}
      >
        {item.rarity}
      </TableCell>
      <TableCell className={cn(tableCellBaseClass, "px-3")}>
        {item.price}
      </TableCell>
      <TableCell
        className={cn(
          tableCellBaseClass,
          tableCellRightBorderClass,
          "rounded-r-xl px-4 text-muted-foreground"
        )}
      >
        {item.location}
      </TableCell>
    </TableRow>
  );
}
