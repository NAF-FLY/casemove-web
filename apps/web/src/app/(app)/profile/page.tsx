"use client";

import { useState, useCallback } from "react";

import {
  AddSteamAccountCard,
  DangerZoneCard,
  ProfileOverviewCard,
  SettingsCard,
  SteamAccountsListCard,
  type SteamFormState
} from "@/components/profile";

const initialSteamForm: SteamFormState = {
  login: "",
  password: "",
  twoFactorCode: "",
  proxy: ""
};

export default function HomePage() {
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
  );
}
