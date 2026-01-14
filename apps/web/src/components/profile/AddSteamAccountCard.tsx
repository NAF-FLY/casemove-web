import type { ReactNode } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Link2, Lock, ShieldCheck, User } from "lucide-react";

export type SteamFormState = {
  login: string;
  password: string;
  twoFactorCode: string;
  proxy: string;
};

const steamInputClassNames = {
  label: "text-black/50 dark:text-white/90",
  input: [
    "bg-transparent",
    "text-black/90 dark:text-white/90",
    "placeholder:text-default-700/50 dark:placeholder:text-white/60"
  ],
  innerWrapper: "bg-transparent",
  inputWrapper:
    "h-13 rounded-xl !border !border-border/60 bg-background/70 data-[hover=true]:border-border/80 group-data-[focus=true]:!border-primary/80 group-data-[focus=true]:data-[hover=true]:!border-primary/80"
};

type SteamInputFieldProps = {
  field: keyof SteamFormState;
  label: string;
  placeholder: string;
  type?: string;
  icon: ReactNode;
  value: string;
  onValueChange: (field: keyof SteamFormState, value: string) => void;
};

function SteamInputField({
  field,
  label,
  placeholder,
  type = "text",
  icon,
  value,
  onValueChange
}: SteamInputFieldProps) {
  return (
    <Input
      classNames={steamInputClassNames}
      label={label}
      placeholder={placeholder}
      radius="lg"
      size="md"
      startContent={icon}
      type={type}
      value={value}
      variant="bordered"
      onValueChange={(nextValue) => onValueChange(field, nextValue)}
    />
  );
}

type SteamInputFieldConfig = {
  field: keyof SteamFormState;
  label: string;
  placeholder: string;
  type?: string;
  icon: ReactNode;
};

const steamInputFields: SteamInputFieldConfig[] = [
  {
    field: "login",
    label: "Steam login",
    placeholder: "steam_login",
    icon: <User className="mb-0.5 h-4 w-4 text-muted-foreground" />
  },
  {
    field: "password",
    label: "Пароль",
    placeholder: "••••••••",
    type: "password",
    icon: <Lock className="mb-0.5 h-4 w-4 text-muted-foreground" />
  },
  {
    field: "twoFactorCode",
    label: "Steam Guard",
    placeholder: "123456",
    icon: <ShieldCheck className="mb-0.5 h-4 w-4 text-muted-foreground" />
  },
  {
    field: "proxy",
    label: "Proxy (SOCKS5)",
    placeholder: "socks5://user:pass@host:port",
    icon: <Link2 className="mb-0.5 h-4 w-4 text-muted-foreground" />
  }
];

type AddSteamAccountCardProps = {
  steamForm: SteamFormState;
  onValueChange: (field: keyof SteamFormState, value: string) => void;
};

export default function AddSteamAccountCard({
  steamForm,
  onValueChange
}: AddSteamAccountCardProps) {
  return (
    <Card className="mt-6 overflow-hidden border border-border/60 bg-card/80">
      <CardHeader className="flex flex-col items-start gap-1 border-b border-border/60 px-6 py-5">
        <h2 className="text-lg font-semibold text-foreground">
          Добавить Steam аккаунт
        </h2>
        <p className="text-sm text-muted-foreground">
          Подключение Steam будет доступно позже. Пока это черновой блок для
          интерфейса.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 px-6 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          {steamInputFields.map((field) => (
            <SteamInputField
              key={field.field}
              field={field.field}
              icon={field.icon}
              label={field.label}
              placeholder={field.placeholder}
              type={field.type}
              value={steamForm[field.field]}
              onValueChange={onValueChange}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Запуск подключения будет доступен после финального включения Steam
            интеграции.
          </p>
          <Button
            className="h-11 px-6"
            color="primary"
            isDisabled
            radius="lg"
            type="button"
          >
            Подключить Steam
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
