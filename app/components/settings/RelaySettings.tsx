"use client";

import { useEffect, useState } from "react";
import { useRelays } from "@/app/hooks/useRelays";
import { useNostrContext } from "@/app/components/NostrProvider";

interface Props {
  onClose: () => void;
}

export default function RelaySettings({ onClose }: Props) {
  const relays = useRelays((s) => s.relays);
  const addRelay = useRelays((s) => s.addRelay);
  const removeRelay = useRelays((s) => s.removeRelay);
  const { pool } = useNostrContext();
  const [input, setInput] = useState("");
  const [poolStatus, setPoolStatus] = useState<Map<string, boolean>>(new Map());

  // Poll pool connection status every 2s
  useEffect(() => {
    function refresh() {
      setPoolStatus(new Map(pool.listConnectionStatus()));
    }
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [pool]);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    addRelay(trimmed);
    setInput("");
  }

  const connectedCount = [...poolStatus.values()].filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#f9f9f7] rounded-lg p-8 w-full max-w-md flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold">Relays</h2>
          <p className="mt-1 text-xs text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">
            {connectedCount} of {relays.length} connected
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {relays.map((relay) => {
            const isConnected = poolStatus.get(relay) ?? poolStatus.get(relay.replace(/\/$/, "")) ?? false;
            return (
              <li key={relay} className="flex items-center gap-3">
                <span
                  title={isConnected ? "Connected" : "Not connected"}
                  className={`shrink-0 w-1.5 h-1.5 rounded-full transition-colors ${isConnected ? "bg-green-500" : "bg-[#2d2d2d]/20"}`}
                />
                <span className="flex-1 text-sm font-[family-name:var(--font-inter)] text-[#2d2d2d]/80 truncate">
                  {relay}
                </span>
                <button
                  onClick={() => removeRelay(relay)}
                  className="shrink-0 text-xs text-[#2d2d2d]/40 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="wss://relay.example.com"
            className="flex-1 border border-[#2d2d2d]/30 rounded px-3 py-2 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d]"
          />
          <button
            onClick={handleAdd}
            className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
