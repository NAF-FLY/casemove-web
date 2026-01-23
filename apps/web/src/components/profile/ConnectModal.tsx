"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner
} from "@heroui/react";
import { Lock, ShieldCheck } from "lucide-react";

import { useSteamAccountsStore } from "@/store/steamAccounts.store";

type ConnectModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  accountId: string | null;
  onSuccess?: () => void;
};

export default function ConnectModal({
  isOpen,
  onOpenChange,
  accountId,
  onSuccess
}: ConnectModalProps) {
  const { connectAccount, actionLoading, listError, clearListError } =
    useSteamAccountsStore();

  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const isLoading = actionLoading === accountId;

  // Clear state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setTwoFactorCode("");
      clearListError();
    }
  }, [isOpen, clearListError]);

  const handleSubmit = async () => {
    if (!accountId || !password.trim()) return;

    try {
      await connectAccount(accountId, {
        password: password.trim(),
        twoFactorCode: twoFactorCode.trim() || undefined
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Error is handled by store
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Подключение к Steam
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-muted-foreground mb-2">
                Срок действия сессии истек. Пожалуйста, введите пароль для переподключения.
              </p>

              {listError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {listError}
                </div>
              )}

              <Input
                label="Пароль"
                placeholder="••••••••"
                type="password"
                variant="bordered"
                value={password}
                onValueChange={setPassword}
                startContent={
                  <Lock className="mb-0.5 h-4 w-4 text-muted-foreground" />
                }
              />

              <Input
                label="Steam Guard"
                placeholder="123456"
                variant="bordered"
                value={twoFactorCode}
                onValueChange={setTwoFactorCode}
                startContent={
                  <ShieldCheck className="mb-0.5 h-4 w-4 text-muted-foreground" />
                }
                description="Код требуется, если включена двухфакторная аутентификация"
              />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose} isDisabled={isLoading}>
                Отмена
              </Button>
              <Button 
                color="primary" 
                onPress={handleSubmit} 
                isDisabled={!password.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner color="current" size="sm" />
                    <span className="ml-2">Подключение...</span>
                  </>
                ) : (
                  "Подключить"
                )}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
