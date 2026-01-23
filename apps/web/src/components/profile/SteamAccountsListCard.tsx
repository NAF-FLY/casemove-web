"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Tooltip
} from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MoreHorizontal,
  Trash2,
  User,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";

import ConnectModal from "./ConnectModal";

import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";

import { useSteamAccountsStore } from "@/store/steamAccounts.store";
import type { SteamAccount } from "@/lib/api-client/steam-accounts";

type ConnectModalState = {
  isOpen: boolean;
  accountId: string | null;
  password: string;
  twoFactorCode: string;
};

function getStatusConfig(status: SteamAccount["status"]) {
  const configs = {
    connected: {
      color: "success" as const,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Connected",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    },
    idle: {
      color: "default" as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Idle",
      className: "border-border/60 bg-muted/40 text-muted-foreground"
    },
    pending: {
      color: "warning" as const,
      icon: <Spinner size="sm" />,
      label: "Connecting...",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-300"
    },
    error: {
      color: "danger" as const,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: "Error",
      className: "border-red-500/40 bg-red-500/10 text-red-300"
    }
  };

  return configs[status] || configs.idle;
}

type SteamAccountRowProps = {
  account: SteamAccount;
  isActive: boolean;
  actionLoading: string | null;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
  onSwitch: (accountId: string) => void;
  onDelete: (accountId: string) => void;
};

function SteamAccountRow({
  account,
  isActive,
  actionLoading,
  onConnect,
  onDisconnect,
  onSwitch,
  onDelete
}: SteamAccountRowProps) {
  const statusConfig = getStatusConfig(account.status);
  const isLoading = actionLoading === account.id;
  const isConnected = account.status === "connected";

  return (
    <div
      className={`group flex items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-background/60 hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-[#00d9ff]/20 via-[#4f46e5]/20 to-[#8b5cf6]/20">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {account.persona_name || account.steam_login}
            </span>
            {isActive && (
              <Chip
                className="border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                radius="full"
                size="sm"
                variant="bordered"
              >
                Active
              </Chip>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {account.steam_login}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Chip
          className={`gap-1 px-3 py-1 text-xs ${statusConfig.className}`}
          color={statusConfig.color}
          radius="full"
          size="sm"
          startContent={statusConfig.icon}
          variant="bordered"
        >
          {statusConfig.label}
        </Chip>

        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              {!isActive && (
                <Tooltip content="Switch to this account">
                  <Button
                    aria-label="Switch account"
                    className="h-8 w-8 min-w-0 border-border/60 bg-muted/40"
                    isDisabled={isLoading}
                    isIconOnly
                    radius="md"
                    size="sm"
                    variant="bordered"
                    onPress={() => onSwitch(account.id)}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="Disconnect">
                <Button
                  aria-label="Disconnect account"
                  className="h-8 w-8 min-w-0 border-border/60 bg-muted/40"
                  isDisabled={isLoading}
                  isIconOnly
                  radius="md"
                  size="sm"
                  variant="bordered"
                  onPress={() => onDisconnect(account.id)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </Tooltip>
            </>
          ) : (
            <Tooltip content="Connect">
              <Button
                aria-label="Connect account"
                className="h-8 w-8 min-w-0 border-border/60 bg-muted/40"
                isDisabled={isLoading}
                isIconOnly
                radius="md"
                size="sm"
                variant="bordered"
                onPress={() => onConnect(account.id)}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
          <Tooltip color="danger" content="Delete account">
            <Button
              aria-label="Delete account"
              className="h-8 w-8 min-w-0 border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              isDisabled={isLoading}
              isIconOnly
              radius="md"
              size="sm"
              variant="bordered"
              onPress={() => onDelete(account.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>

        {isLoading && <Spinner size="sm" />}
      </div>
    </div>
  );
}



export default function SteamAccountsListCard() {
  const {
    accounts,
    activeAccountId,
    loading,
    actionLoading,
    listError,
    loadAccounts,
    disconnectAccount,
    switchAccount,
    deleteAccount,
    tryAutoConnectAccount
  } = useSteamAccountsStore();

  const [mounted, setMounted] = useState(false);
  const [connectModal, setConnectModal] = useState<ConnectModalState>({
    isOpen: false,
    accountId: null,
    password: "",
    twoFactorCode: ""
  });

  useEffect(() => {
    setMounted(true);
    void loadAccounts();
  }, [loadAccounts]);

  useRefetchOnFocus(() => {
    void loadAccounts();
  });

  const handleConnect = async (accountId: string) => {
    // Try auto-reconnect first (using saved refresh token)
    const success = await tryAutoConnectAccount(accountId);
    if (!success) {
      // Token expired or not available, show password modal
      setConnectModal({
        isOpen: true,
        accountId,
        password: "",
        twoFactorCode: ""
      });
    }
  };

  const handleDisconnect = (accountId: string) => {
    void disconnectAccount(accountId);
  };

  const handleSwitch = (accountId: string) => {
    void (async () => {
      const result = await switchAccount(accountId);
      if (result === "passwordRequired") {
        setConnectModal({
          isOpen: true,
          accountId,
          password: "",
          twoFactorCode: ""
        });
      }
    })();
  };

  const handleDelete = (accountId: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      void deleteAccount(accountId);
    }
  };

  if (!mounted || (loading && accounts.length === 0)) {
    return (
      <Card className="overflow-hidden border border-border/60 bg-card/80">
        <CardBody className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border border-border/60 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Steam Аккаунты
            </h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length === 0
                ? "Добавьте ваш первый Steam аккаунт"
                : `${accounts.length} ${accounts.length === 1 ? "аккаунт" : "аккаунтов"}`}
            </p>
          </div>
          <Button
            className="h-9 px-4"
            isIconOnly={false}
            radius="lg"
            size="sm"
            variant="bordered"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardBody className="space-y-3 px-6 py-5">
          {listError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {listError}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                У вас пока нет добавленных Steam аккаунтов.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Используйте форму ниже для добавления аккаунта.
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <SteamAccountRow
                key={account.id}
                account={account}
                actionLoading={actionLoading}
                isActive={account.id === activeAccountId}
                onConnect={handleConnect}
                onDelete={handleDelete}
                onDisconnect={handleDisconnect}
                onSwitch={handleSwitch}
              />
            ))
          )}
        </CardBody>
      </Card>

      <ConnectModal
        accountId={connectModal.accountId}
        isOpen={connectModal.isOpen}
        onOpenChange={(isOpen) =>
          setConnectModal((prev) => ({ ...prev, isOpen }))
        }
      />
    </>
  );
}
