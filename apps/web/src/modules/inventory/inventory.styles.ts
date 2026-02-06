export function getRarityClass(rarity: string) {
  if (rarity === "Covert") {
    return "text-destructive";
  }

  if (rarity === "Classified") {
    return "text-primary";
  }

  return "text-muted-foreground";
}

export function getRarityDotClass(rarity: string | null | undefined) {
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
