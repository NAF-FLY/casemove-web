import type { ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Ripple,
  useRipple
} from "@heroui/react";
import { Trash2, Unlink } from "lucide-react";

type DangerActionButtonProps = {
  children: ReactNode;
  startContent: ReactNode;
};

function DangerActionButton({ children, startContent }: DangerActionButtonProps) {
  const { ripples, onClear, onPress } = useRipple();

  return (
    <Button
      className="h-11 w-full justify-center rounded-xl border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive data-[pressed=true]:scale-100"
      color="danger"
      disableRipple
      startContent={startContent}
      type="button"
      variant="bordered"
      onPress={onPress}
    >
      {children}
      <Ripple
        color="currentColor"
        motionProps={{ transition: { duration: 1.1, ease: "easeOut" } }}
        onClear={onClear}
        ripples={ripples}
      />
    </Button>
  );
}

export default function DangerZoneCard() {
  return (
    <Card className="overflow-hidden border border-destructive/40 bg-card/80">
      <CardHeader className="flex flex-col items-start gap-1 border-b border-destructive/30 px-6 py-5">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          High impact actions that cannot be undone.
        </p>
      </CardHeader>
      <CardBody className="space-y-3 px-6 py-6">
        <DangerActionButton startContent={<Unlink className="h-4 w-4" />}>
          Disconnect Steam Account
        </DangerActionButton>
        <DangerActionButton startContent={<Trash2 className="h-4 w-4" />}>
          Delete All Data
        </DangerActionButton>
      </CardBody>
    </Card>
  );
}
