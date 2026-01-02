import { Button } from "@/components/ui/button";

type FloatingActionButtonProps = {
  label: string;
  visible: boolean;
  onClick: () => void;
};

export default function FloatingActionButton({
  label,
  visible,
  onClick
}: FloatingActionButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <Button
      className="fixed bottom-10 right-10 h-[54px] w-[190px] rounded-full bg-[var(--accent)] text-sm text-black shadow-[0_0_30px_rgba(0,180,170,0.4)] before:absolute before:inset-0 before:rounded-full before:bg-[var(--accent-soft)] before:opacity-30 before:blur-[22px] after:absolute after:inset-2 after:rounded-full after:bg-[var(--accent-soft)] after:opacity-20 after:blur-[14px] overflow-visible hover:bg-[var(--accent-soft)]"
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      <span className="relative z-10">{label}</span>
    </Button>
  );
}
