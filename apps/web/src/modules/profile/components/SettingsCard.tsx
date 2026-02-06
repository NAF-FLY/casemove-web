import type { ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Select,
  SelectItem,
  Switch
} from "@heroui/react";
import { Moon, RefreshCcw } from "lucide-react";

type SettingRowProps = {
  title: string;
  description: string;
  action: ReactNode;
};

function SettingRow({ title, description, action }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center justify-start sm:justify-end">{action}</div>
    </div>
  );
}

type SettingsCardProps = {
  autoSyncEnabled: boolean;
  priceAlertsEnabled: boolean;
  privacyEnabled: boolean;
  onAutoSyncChange: (value: boolean) => void;
  onPriceAlertsChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
};

export default function SettingsCard({
  autoSyncEnabled,
  priceAlertsEnabled,
  privacyEnabled,
  onAutoSyncChange,
  onPriceAlertsChange,
  onPrivacyChange
}: SettingsCardProps) {
  return (
    <Card className="overflow-hidden border border-border/60 bg-card/80">
      <CardHeader className="flex flex-col items-start gap-1 border-b border-border/60 px-6 py-5">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Control how your inventory stays fresh and protected.
        </p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-border/60">
          <SettingRow
            action={
              <Button
                className="h-9 px-4"
                color="primary"
                radius="lg"
                size="sm"
                startContent={<RefreshCcw className="h-4 w-4" />}
                type="button"
              >
                Sync Now
              </Button>
            }
            description="Sync your latest CS2 items from Steam."
            title="Refresh Inventory"
          />
          <SettingRow
            action={
              <Switch
                aria-label="Toggle auto-sync"
                color="primary"
                isSelected={autoSyncEnabled}
                size="sm"
                onValueChange={onAutoSyncChange}
              />
            }
            description="Automatically refresh inventory every hour."
            title="Auto-Sync"
          />
          <SettingRow
            action={
              <Switch
                aria-label="Toggle price alerts"
                color="primary"
                isSelected={priceAlertsEnabled}
                size="sm"
                onValueChange={onPriceAlertsChange}
              />
            }
            description="Get notified when item prices change significantly."
            title="Price Alerts"
          />
          <SettingRow
            action={
              <Select
                aria-label="Theme"
                className="min-w-[200px]"
                classNames={{
                  trigger:
                    "h-9 border-border/60 bg-background/60 data-[hover=true]:border-border/80",
                  value: "text-sm text-foreground"
                }}
                defaultSelectedKeys={["dark"]}
                radius="lg"
                size="sm"
                startContent={<Moon className="h-4 w-4 text-muted-foreground" />}
                variant="bordered"
              >
                <SelectItem key="dark">Dark (Default)</SelectItem>
                <SelectItem key="night">Night Shift</SelectItem>
                <SelectItem key="contrast">High Contrast</SelectItem>
              </Select>
            }
            description="Choose your preferred color scheme."
            title="Theme"
          />
          <SettingRow
            action={
              <Switch
                aria-label="Toggle privacy"
                color="primary"
                isSelected={privacyEnabled}
                size="sm"
                onValueChange={onPrivacyChange}
              />
            }
            description="Make your inventory visible to others."
            title="Privacy"
          />
        </div>
      </CardBody>
    </Card>
  );
}
