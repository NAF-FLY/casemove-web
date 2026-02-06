"use client";

import { addToast, Chip, Image, Link, Skeleton } from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Package,
  ShieldCheck,
  User,
  Activity
} from "lucide-react";

import { useSteamAccountsStore } from "@/modules/profile/steamAccounts.store";

function formatMemberSince(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function getProfileDisplayUrl(url: string | null): string {
  if (!url) return "—";
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
}

export default function ProfileOverviewCard() {
  const { accounts, activeAccountId, loading } = useSteamAccountsStore();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  const handleCopySteamId = () => {
    if (activeAccount?.steam_id) {
      navigator.clipboard.writeText(activeAccount.steam_id);
      addToast({
        title: "Copied!",
        description: "Steam ID copied to clipboard",
        color: "success",
      });
    }
  };

  const handleCopyTradeUrl = () => {
    if (activeAccount?.trade_url) {
      navigator.clipboard.writeText(activeAccount.trade_url);
      addToast({
        title: "Copied!",
        description: "Trade URL copied to clipboard",
        color: "success",
      });
    }
  };

  // Loading state
  if (loading && accounts.length === 0) {
    return (
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120]">
        <div className="p-8">
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-[2rem] bg-white/5" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64 rounded-lg bg-white/5" />
              <Skeleton className="h-5 w-80 rounded-lg bg-white/5" />
              <Skeleton className="h-5 w-60 rounded-lg bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No active account
  if (!activeAccount) {
    return (
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120]">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
            <AlertCircle className="h-8 w-8 text-white/50" />
          </div>
          <p className="text-lg font-medium text-white">
            Нет активного аккаунта
          </p>
          <p className="mt-1 text-sm text-white/50">
            Подключите Steam аккаунт чтобы видеть информацию о профиле
          </p>
        </div>
      </div>
    );
  }

  const isConnected = activeAccount.status === "connected";
  const hasAvatar = !!activeAccount.avatar_url;

  return (
    <div className="relative rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-[#0B1120]">
      {/* Background gradients */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 12% 10%, rgba(45,212,191,0.1), transparent 55%), radial-gradient(circle at 88% 90%, rgba(99,102,241,0.08), transparent 60%), linear-gradient(135deg, rgba(12,18,28,0.85), rgba(16,22,34,0.9))"
        }}
      />

      <div className="relative p-6 pt-4">
        {/* Top Row: Connected Status */}
        <div className="flex justify-end mb-4">
           <Chip
            className={`border bg-opacity-20 backdrop-blur-md ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
            size="sm"
            startContent={
              isConnected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )
            }
            variant="flat"
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Chip>
        </div>

        {/* Main Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* LEFT SECTION: Avatar + Info (Takes ~58% width on large screens) */}
          <div className="flex items-start gap-6 lg:col-span-7">
            {/* Avatar container */}
            <div className="relative shrink-0">
              <div className="relative h-[140px] w-[140px] overflow-hidden rounded-[2rem] border-[3px] border-[#1a2236] bg-[#0B1120] shadow-2xl">
                {hasAvatar ? (
                  <Image
                    alt={activeAccount.persona_name ?? "Avatar"}
                    className="h-full w-full object-cover"
                    src={activeAccount.avatar_url!}
                    radius="none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-900">
                    <User className="h-14 w-14 text-gray-600" />
                  </div>
                )}
              </div>
            </div>

            {/* User Details */}
            <div className="flex flex-col gap-2.5">
              <h1 className="mt-[-4px] text-4xl font-bold leading-tight tracking-tight text-white line-clamp-1 break-all">
                {activeAccount.persona_name || activeAccount.steam_login}
              </h1>

              {/* Steam ID */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5eead4]">
                  Steam ID
                </span>
                <div className="flex items-center gap-2 rounded-md bg-[#151b2b] px-2.5 py-1 transition-colors hover:bg-[#1c2438]">
                  <span className="font-mono text-xs text-white/90">
                    {activeAccount.steam_id ?? "—"}
                  </span>
                  {activeAccount.steam_id && (
                    <button
                      className="ml-1 text-white/40 hover:text-white"
                      onClick={handleCopySteamId}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Profile URL */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5eead4]">
                  Profile URL
                </span>
                {activeAccount.profile_url ? (
                  <Link
                    className="flex items-center gap-1 text-xs text-[#2dd4bf] hover:text-[#5eead4] truncate max-w-[200px]"
                    href={activeAccount.profile_url}
                    isExternal
                    showAnchorIcon={false}
                  >
                    {getProfileDisplayUrl(activeAccount.profile_url)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-xs text-white/50">—</span>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5eead4]">
                  Member Since
                </span>
                <span className="text-xs text-white/80">
                  {formatMemberSince(activeAccount.account_created_at)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex cursor-default items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-1.5 hover:bg-cyan-950/30 transition-colors">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/90 whitespace-nowrap">Steam Guard</span>
                </div>
                <button 
                  onClick={handleCopyTradeUrl}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-1.5 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                >
                  <Link2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/90 whitespace-nowrap">Trade URL</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION WRAPPER (Takes ~42% width) */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            {/* CENTER SECTION: Inventory Value */}
            <div className="relative flex h-full w-full flex-col items-center justify-between rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              {/* Glowing Shield Icon (Empty placeholder removed) */}
              <div className="flex w-full flex-col items-center">
  
  
                <h3 className="text-3xl font-bold text-white drop-shadow-lg whitespace-nowrap">
                  $8,492.00
                </h3>
                <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/50">
                  Total Inventory Value
                </p>
                
                <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 whitespace-nowrap">
                  <Activity className="h-3 w-3" />
                  +$124.50 (Last 7 Days)
                </div>
              </div>
  
              {/* Graph Placeholder */}
              <div className="mt-4 h-10 w-full max-w-[180px] overflow-hidden rounded-lg opacity-50 grayscale">
                <div className="flex h-full w-full items-end justify-between gap-1">
                   {/* Fake bars for visualization until graph is ready */}
                   {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                      <div key={i} className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500/20 to-emerald-500/50" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-[2px]">
                  No Info
                </div>
              </div>
            </div>
  
            {/* RIGHT SECTION: Mini Cards */}
            <div className="flex h-full flex-col gap-3">
              
              {/* Total Items Card */}
              <div className="group relative flex flex-1 flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 transition-all hover:bg-[#1E293B]/70 hover:border-white/20">
                {/* Top Row: Icon - Value - Graph */}
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                        <Package className="h-4 w-4 text-white/70" />
                      </div>
                      <div className="text-xl font-bold text-white">1,247</div>
                   </div>
                   {/* Mini Graph (Static SVG) */}
                   <div className="h-6 w-16">
                      <svg viewBox="0 0 64 24" className="w-full h-full overflow-visible">
                          <path d="M0 20 L10 16 L20 18 L30 10 L40 14 L50 6 L64 12" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                   </div>
                </div>
                
                {/* Bottom Row: Label - Change */}
                <div className="flex items-center justify-between">
                   <div className="text-[10px] uppercase tracking-wider text-white/60">Total Items</div>
                   <div className="flex items-center gap-1 text-xs font-medium text-red-400">
                      <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                      </div>
                      -32 items
                   </div>
                </div>
              </div>
  
              {/* Sync Status Card */}
              <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                <div className="flex items-center gap-3">
                   {/* Left: Radar Icon */}
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <div className="relative flex items-center justify-center">
                          <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-500/20" />
                          <div className="h-3 w-3 rounded-full bg-current shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                           {/* Radar rings effect */}
                          <div className="absolute h-6 w-6 rounded-full border border-emerald-500/30" />
                      </div>
                   </div>
  
                   {/* Right: Info */}
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                             <span className="text-sm font-semibold text-emerald-400">Active</span>
                             <span className="text-[10px] text-white/40">• 2m ago</span>
                         </div>
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" />
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/60">Last Sync Status</div>
                   </div>
                </div>
              </div>
  
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}
