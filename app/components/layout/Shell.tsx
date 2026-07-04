"use client";

import { useEffect } from "react";
import { useNsec } from "@/app/components/NsecGate";
import NewPostButton from "@/app/components/ui/NewPostButton";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useMissionControl } from "@/app/hooks/useMissionControl";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useNsec();
  const { pool } = useNostrContext();
  const loadFollows = useFollows((s) => s.loadFollows);
  const { activeView, setView, hasPendingMentions } = useMissionControl();

  useEffect(() => {
    const pubkey = getNsecPubkey();
    if (!pubkey) return;
    loadFollows(pool, pubkey);
  }, [pool, loadFollows]);

  return (
    <div className="h-screen flex">
      {/* Left navigation rail */}
      <aside className="fixed left-0 top-0 h-screen w-12 bg-[#f9f9f7]/90 backdrop-blur-sm border-r border-[#2d2d2d]/10 flex flex-col items-center pt-8 gap-8 z-20">
        <button
          onClick={() => setView("feed")}
          title="Whisper"
          className={`text-lg font-[family-name:var(--font-inter)] transition-opacity select-none ${
            activeView === "feed" ? "opacity-100" : "opacity-25 hover:opacity-60"
          }`}
        >
          w
        </button>
        <button
          onClick={() => setView("mission-control")}
          title="Mission Control"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.12em" }}
          className={`text-[10px] uppercase font-[family-name:var(--font-inter)] select-none ${
            activeView === "mission-control"
              ? "opacity-100"
              : hasPendingMentions
              ? "animate-sacred-glow"
              : "opacity-25 hover:opacity-60 transition-opacity"
          }`}
        >
          control
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
              className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
            >
              Logout
            </button>
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
