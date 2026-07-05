"use client";

import { useEffect, useState } from "react";
import { useNsec } from "@/app/components/NsecGate";
import NewPostButton from "@/app/components/ui/NewPostButton";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import { useRelays } from "@/app/hooks/useRelays";
import RelaySettings from "@/app/components/settings/RelaySettings";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { unlocked, logout } = useNsec();
  const { pool } = useNostrContext();
  const loadFollows = useFollows((s) => s.loadFollows);
  const { activeView, setView, hasPendingMentions } = useMissionControl();
  const initRelays = useRelays((s) => s.initRelays);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    initRelays();
  }, [initRelays]);

  useEffect(() => {
    if (!unlocked) return;
    const pubkey = getNsecPubkey();
    if (!pubkey) return;
    loadFollows(pool, pubkey);
  }, [pool, loadFollows, unlocked]);

  return (
    <div className="h-screen flex">
      {/* Left navigation rail */}
      <aside className="fixed left-0 top-0 h-screen w-12 bg-[#f9f9f7]/90 backdrop-blur-sm border-r border-[#2d2d2d]/10 flex flex-col items-center pt-8 gap-8 z-20">
        <button
          onClick={() => setView("feed")}
          title="Whisper"
          style={{ fontFamily: "var(--font-crimson)" }}
          className={`text-lg transition-opacity select-none p-2 ${
            activeView === "feed" ? "opacity-100" : "opacity-25 hover:opacity-60"
          }`}
        >
          W
        </button>
        <button
          onClick={() => setView("mission-control")}
          title="Mission Control"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.12em" }}
          className={`text-[10px] uppercase font-[family-name:var(--font-inter)] select-none p-2 ${
            activeView === "mission-control"
              ? "opacity-100"
              : hasPendingMentions
              ? "animate-sacred-glow"
              : "opacity-25 hover:opacity-60 transition-opacity"
          }`}
        >
          control
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="mt-auto mb-8 p-2 text-base text-[#2d2d2d]/30 hover:text-[#2d2d2d] transition-colors select-none font-[family-name:var(--font-inter)]"
        >
          ⚙
        </button>
      </aside>

      {/* Main content */}
      <div className="ml-12 flex-1 flex flex-col min-w-0">
        <div className="h-full flex flex-col px-6 w-[928px] mx-auto">
          <header className="flex items-center justify-between py-8 shrink-0">
            <div className="flex items-end gap-4">
              <h1 className="text-4xl font-bold tracking-tight">Whisper</h1>
              {activeView === "feed" && <NewPostButton />}
            </div>
            <button
              onClick={logout}
              className="bg-black text-white text-xs px-3 py-1.5 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
            >
              Logout
            </button>
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>

      {settingsOpen && <RelaySettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
