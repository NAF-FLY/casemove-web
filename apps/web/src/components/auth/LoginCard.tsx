"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginCardProps = {
  onSuccess?: () => void;
};

export default function LoginCard({ onSuccess }: LoginCardProps) {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    twoFactorCode: ""
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login({
        username: form.username,
        password: form.password,
        twoFactorCode: form.twoFactorCode || undefined
      });
      const { token, error: loginError } = useAuthStore.getState();
      if (token && !loginError) {
        onSuccess?.();
        router.push("/inventory");
      }
    } catch {
      // errors are handled in the store
    }
  };

  return (
    <Card className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-none">
      <CardHeader className="items-center text-center pb-4">
        <div className="flex items-center gap-3 text-[var(--text)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)] text-lg font-semibold">
            S
          </div>
          <span className="text-sm font-semibold tracking-[0.5em] text-[var(--text)]">
            STEAM
          </span>
        </div>
        <CardTitle className="mt-4 text-2xl font-semibold text-[var(--text)]">
          Connect to the Steam Client
        </CardTitle>
        <CardDescription className="text-sm text-[var(--text-muted)]">
          Use your Steam credentials to connect. We don&apos;t store your
          password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]">
            <div className="px-4 py-3">
              <Label className="sr-only" htmlFor="username">
                Username
              </Label>
              <Input
                className="h-10 rounded-none border-0 bg-transparent px-0 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0"
                id="username"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
                placeholder="Username"
                type="text"
                value={form.username}
              />
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Label className="sr-only" htmlFor="password">
                Password
              </Label>
              <Input
                className="h-10 rounded-none border-0 bg-transparent px-0 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0"
                id="password"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Password"
                type="password"
                value={form.password}
              />
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Label className="sr-only" htmlFor="twoFactorCode">
                Steam Guard
              </Label>
              <Input
                className="h-10 rounded-none border-0 bg-transparent px-0 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0"
                id="twoFactorCode"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    twoFactorCode: event.target.value
                  }))
                }
                placeholder="Steam Guard (optional)"
                type="text"
                value={form.twoFactorCode}
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            className="h-11 w-full rounded-md border border-white/10 bg-[#1A2232] text-sm font-semibold text-[#EEF1F9] hover:bg-[#222C40]"
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
