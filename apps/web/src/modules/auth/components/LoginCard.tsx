"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";

import { useAuthStore } from "@/modules/auth/auth.store";
import { Button, Card, CardBody, CardFooter, Input } from "@heroui/react";


type LoginCardProps = {
  onSuccess?: () => void;
};

export default function LoginCard({ onSuccess }: LoginCardProps) {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const emptyCredentialsMessage = "Email and password are required.";
  const isFormComplete =
    form.email.trim().length > 0 && form.password.trim().length > 0;
  const validationError =
    hasSubmitted && !isFormComplete ? emptyCredentialsMessage : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    if (!isFormComplete) {
      return;
    }

    try {
      if (mode === "login") {
        await login({
          email: form.email,
          password: form.password
        });
      } else {
        await register({
          email: form.email,
          password: form.password
        });
      }
      const { isAuthenticated, error: loginError } =
        useAuthStore.getState();
      if (isAuthenticated && !loginError) {
        const nextPath = searchParams.get("next");
        const redirectTo =
          nextPath && nextPath.startsWith("/") ? nextPath : "/profile";
        onSuccess?.();
        router.push(redirectTo);
      }
    } catch {
      // errors are handled in the store
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#8b5cf6] text-white">
          <svg
            aria-hidden="true"
            className="h-8 w-8"
            focusable="false"
            role="img"
            viewBox="0 0 512 512"
          >
            <path
              d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6V377.4c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4V134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1v-188L288 246.6v188z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="text-3xl font-semibold text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue"
            : "Create an account to continue"}
        </p>
      </div>
      <Card className="border border-white/10 bg-[#0f0e12] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <CardBody className="space-y-5 p-6 overflow-hidden">
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                  htmlFor="email"
                >
                  Email
                </label>
                <Input
                  classNames={{
                    inputWrapper: "h-11 rounded-lg border-white/10 bg-black/30 data-[hover=true]:bg-black/40 group-data-[focus=true]:bg-black/40",
                    input: "text-sm text-foreground placeholder:text-muted-foreground/70",
                  }}
                  id="email"
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      email: value
                    }))
                  }
                  placeholder="Enter your email"
                  startContent={
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  }
                  type="email"
                  value={form.email}
                />
              </div>
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                htmlFor="password"
              >
                Password
              </label>
              <Input
                classNames={{
                  inputWrapper: "h-11 rounded-lg border-white/10 bg-black/30 data-[hover=true]:bg-black/40 group-data-[focus=true]:bg-black/40",
                  input: "text-sm text-foreground placeholder:text-muted-foreground/70",
                }}
                id="password"
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    password: value
                  }))
                }
                placeholder="Enter your password"
                startContent={
                  <Lock className="h-4 w-4 text-muted-foreground" />
                }
                type="password"
                value={form.password}
              />
            </div>
            {validationError ? (
              <p className="text-sm text-destructive">{validationError}</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </CardBody>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0">
            <Button
              className="h-11 w-full rounded-lg text-sm font-semibold"
              isDisabled={loading || !isFormComplete}
              type="submit"
              color="primary"
            >
              {loading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Log in"
                  : "Sign up"}
            </Button>
            <Button
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 text-sm font-semibold text-foreground hover:bg-white/10"
              type="button"
              variant="flat"
              onClick={() =>
                setMode((current) =>
                  current === "login" ? "register" : "login"
                )
              }
            >
              {mode === "login"
                ? "Create an account"
                : "Already have an account? Log in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        We only store your email for authentication.
      </p>
    </div>
  );
}
