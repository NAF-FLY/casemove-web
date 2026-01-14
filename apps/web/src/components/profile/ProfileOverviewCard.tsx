import { Button, Card, CardBody, Chip, Link } from "@heroui/react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  ShieldCheck
} from "lucide-react";

export default function ProfileOverviewCard() {
  return (
    <Card className="relative mt-6 overflow-hidden border border-border/60 bg-card/80">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 12% 10%, rgba(45,212,191,0.1), transparent 55%), radial-gradient(circle at 88% 90%, rgba(99,102,241,0.08), transparent 60%), linear-gradient(135deg, rgba(12,18,28,0.85), rgba(16,22,34,0.9))"
        }}
      />
      <CardBody className="relative space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Steam Account
            </p>
            <p className="text-xl font-semibold text-foreground">
              Profile Overview
            </p>
          </div>
          <Chip
            className="w-fit gap-1 border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
            color="success"
            radius="full"
            size="sm"
            startContent={<CheckCircle2 className="h-3.5 w-3.5" />}
            variant="bordered"
          >
            Connected
          </Chip>
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[#00d9ff] via-[#4f46e5] to-[#8b5cf6]">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45), transparent 55%)"
                }}
              />
              <div className="relative flex h-full w-full items-end justify-center pb-2 text-sm font-semibold text-white">
                SK
              </div>
              <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-foreground">
                  ShadowKnight
                </p>
                <Chip
                  className="border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                  radius="full"
                  size="sm"
                  variant="bordered"
                >
                  Prime
                </Chip>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                    Steam ID
                  </span>
                  <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-xs text-foreground">
                    76561198012345678
                  </span>
                  <Button
                    aria-label="Copy Steam ID"
                    className="h-7 w-7 min-w-0 border-border/60 bg-muted/40 text-muted-foreground"
                    isIconOnly
                    radius="md"
                    size="sm"
                    type="button"
                    variant="bordered"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                    Profile URL
                  </span>
                  <Link
                    className="inline-flex items-center gap-1 text-xs text-primary/90 hover:text-primary"
                    href="https://steamcommunity.com/id/shadowknight"
                    isExternal
                    showAnchorIcon={false}
                  >
                    steamcommunity.com/id/shadowknight
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                    Member since
                  </span>
                  <span className="text-foreground">January 2020</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Steam Guard
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Enabled
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Trade URL
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                Linked
              </p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
