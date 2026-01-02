import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const chips = [
  { label: "Tradable", active: false },
  { label: "Covert", active: true },
  { label: "Knife", active: false },
];

export default function FiltersBar() {
  return (
    <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[rgba(229,231,235,0.2)] bg-[#1A2147] px-6 py-3">
      <Input
        className="flex-1 border-none bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Search items..."
        type="text"
      />
      <div className="flex items-center rounded-xl border border-white/10 bg-[#0F1430] p-1">
        {chips.map((chip) => (
          <Button
            key={chip.label}
            className={chip.active
              ? "rounded-lg bg-[var(--accent)] text-black hover:bg-[var(--accent-soft)]"
              : "rounded-lg border-transparent bg-transparent text-[#9AA6D2] hover:bg-white/5 hover:text-white"}
            size="sm"
            type="button"
            variant="ghost"
          >
            {chip.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
