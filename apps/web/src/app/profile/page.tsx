"use client";

import { useState, useCallback } from "react";

import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import {
  AddSteamAccountCard,
  DangerZoneCard,
  ProfileOverviewCard,
  SettingsCard,
  SteamAccountsListCard,
  type SteamFormState
} from "@/components/profile";
import { cn } from "@/lib/utils";

const initialSteamForm: SteamFormState = {
  login: "",
  password: "",
  twoFactorCode: "",
  proxy: ""
};

export default function HomePage() {
  const [collapsed, setCollapsed] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const [steamForm, setSteamForm] = useState<SteamFormState>(initialSteamForm);

  const handleSteamFormValueChange = (
    field: keyof SteamFormState,
    value: string
  ) => {
    setSteamForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearSteamForm = useCallback(() => {
    setSteamForm(initialSteamForm);
  }, []);

  return (
    <PageContainer className="px-0">
      <div className="relative min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
        <div
          className={cn(
            "min-h-screen transition-[margin-left] duration-300 ease-in-out",
            collapsed ? "ml-28" : "ml-72"
          )}
        >
          <AppHeader />
          <div className="px-8 pt-6 pb-10">
            {/* Grid Layout: Main Content vs Sidebar */}
            <div className="flex flex-col gap-6 xl:grid xl:grid-cols-3 xl:items-start">
              
              {/* Main Column (Profile, Accounts List, Add Account) */}
              <div className="flex flex-col gap-4 min-w-0 xl:col-span-2">
                <ProfileOverviewCard />
                
                <SteamAccountsListCard />
                
                <AddSteamAccountCard
                  steamForm={steamForm}
                  onClearForm={handleClearSteamForm}
                  onValueChange={handleSteamFormValueChange}
                />
              </div>

              {/* Sidebar Column (Settings, Danger Zone) */}
              <div className="flex flex-col gap-4 min-w-0 xl:col-span-1">
                <SettingsCard
                  autoSyncEnabled={autoSyncEnabled}
                  priceAlertsEnabled={priceAlertsEnabled}
                  privacyEnabled={privacyEnabled}
                  onAutoSyncChange={setAutoSyncEnabled}
                  onPriceAlertsChange={setPriceAlertsEnabled}
                  onPrivacyChange={setPrivacyEnabled}
                />
                
                <DangerZoneCard />
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
