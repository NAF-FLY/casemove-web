import { Button } from "@heroui/react";

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
      className="fixed bottom-10 right-10 h-[54px] w-[190px] rounded-full text-sm text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.35)] before:absolute before:inset-0 before:rounded-full before:bg-primary/30 before:opacity-70 before:blur-[22px] after:absolute after:inset-2 after:rounded-full after:bg-primary/20 after:opacity-60 after:blur-[14px] overflow-visible hover:bg-primary/90"
      onPress={onClick}
      type="button"
      color="primary"
    >
      <span className="relative z-10">{label}</span>
    </Button>
  );
}
