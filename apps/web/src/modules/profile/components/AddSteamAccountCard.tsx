"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, Button, Input, Spinner } from "@heroui/react";
import { Link2, Lock, ShieldCheck, User } from "lucide-react";

import { useSteamAccountsStore } from "@/modules/profile/steamAccounts.store";

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
  disabled?: boolean;
  onValueChange: (field: keyof SteamFormState, value: string) => void;
};

function SteamInputField({
  field,
  label,
  placeholder,
  type = "text",
  icon,
  value,
  disabled,
  onValueChange
}: SteamInputFieldProps) {
  return (
    <Input
      classNames={steamInputClassNames}
      isDisabled={disabled}
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
  onClearForm: () => void;
};

export default function AddSteamAccountCard({
  steamForm,
  onValueChange,
  onClearForm
}: AddSteamAccountCardProps) {
  const { addAccount, actionLoading, addError, clearAddError } = useSteamAccountsStore();

  const isLoading = actionLoading === "add";
  const isFormValid = steamForm.login.trim() && steamForm.password.trim();

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearAddError();

    try {
      await addAccount({
        steamLogin: steamForm.login.trim(),
        password: steamForm.password.trim(),
        twoFactorCode: steamForm.twoFactorCode.trim() || undefined,
        proxySocks5: steamForm.proxy.trim() || undefined
      });
      onClearForm();
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <Accordion 
      className="px-0 m-0" 
      variant="splitted"
    >
      <AccordionItem
        key="add-steam-account"
        aria-label="Добавить Steam аккаунт"
        classNames={{
          base: "px-0 shadow-none border border-border/60 rounded-xl overflow-hidden [&]:bg-[hsl(229,22%,10%,0.8)]",
          heading: "px-0",
          trigger: "px-6 py-5 border-b border-transparent data-[open=true]:border-border/60 transition-colors",
          content: "px-6 py-5",
          title: "text-lg font-semibold text-foreground",
          subtitle: "text-sm text-muted-foreground"
        }}
        subtitle="Введите данные Steam аккаунта для подключения."
        title="Добавить Steam аккаунт"
      >
        <div>
          {addError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {addError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {steamInputFields.map((field) => (
              <SteamInputField
                key={field.field}
                disabled={isLoading}
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Steam Guard код требуется если включена двухфакторная аутентификация.
            </p>
            <Button
              className="h-11 px-6"
              color="primary"
              isDisabled={!isFormValid || isLoading}
              radius="lg"
              type="button"
              onPress={handleSubmit}
            >
              {isLoading ? (
                <>
                  <Spinner color="current" size="sm" />
                  <span className="ml-2">Подключение...</span>
                </>
              ) : (
                "Подключить Steam"
              )}
            </Button>
          </div>
        </div>
      </AccordionItem>
    </Accordion>
  );
}

