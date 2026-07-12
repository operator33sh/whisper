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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  function normalize(url: string): string {
    try {
      const u = new URL(url.indexOf("://") === -1 ? "wss://" + url : url);
      u.pathname = u.pathname.replace(/\/+/g, "/");
      if (u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
      if ((u.port === "80" && u.protocol === "ws:") || (u.port === "443" && u.protocol === "wss:")) u.port = "";
      u.searchParams.sort();
      u.hash = "";
      return u.toString();
    } catch { return url; }
  }

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

  function handleBulkAdd() {
    const lines = bulkInput.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((r) => addRelay(r));
    setBulkInput("");
    setShowBulkModal(false);
  }

  const connectedCount = relays.filter((r) => poolStatus.get(normalize(r))).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg rounded-lg p-8 w-full max-w-md flex flex-col gap-6 max-h-[80vh]">
        <div>
          <h2 className="text-xl font-semibold">Relays</h2>
          <p className="mt-1 text-xs text-ink-faint font-[family-name:var(--font-inter)]">
            {connectedCount} of {relays.length} connected
          </p>
        </div>

        <ul className="flex flex-col gap-3 overflow-y-auto">
          {relays.map((relay) => {
            const isConnected = poolStatus.get(normalize(relay)) ?? false;
            return (
              <li key={relay} className="flex items-center gap-3">
                <span
                  title={isConnected ? "Connected" : "Not connected"}
                  className={`shrink-0 w-1.5 h-1.5 rounded-full transition-colors ${isConnected ? "bg-green-500" : "bg-ink/20"}`}
                />
                <span className="flex-1 text-sm font-[family-name:var(--font-inter)] text-ink/80 truncate">
                  {relay}
                </span>
                <button
                  onClick={() => removeRelay(relay)}
                  className="shrink-0 text-xs text-ink-faint hover:text-ink transition-colors font-[family-name:var(--font-inter)]"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="wss://relay.example.com"
              className="flex-1 border border-line-strong rounded px-3 py-2 text-sm font-[family-name:var(--font-inter)] bg-surface focus:outline-none focus:border-ink"
            />
            <button
              onClick={handleAdd}
              className="bg-ink text-bg text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:opacity-90 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => setShowBulkModal(true)}
              className="text-xs text-ink-faint hover:text-ink transition-colors font-[family-name:var(--font-inter)] underline"
            >
              Add relay list
            </button>
            <button
              onClick={() => {
                relays
                  .filter((r) => !poolStatus.get(normalize(r)))
                  .forEach((r) => removeRelay(r));
              }}
              className="text-xs text-ink-faint hover:text-ink transition-colors font-[family-name:var(--font-inter)] underline"
            >
              Remove offline relays
            </button>
          </div>
        </div>

        {showBulkModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60">
            <div className="bg-bg rounded-lg p-6 w-full max-w-sm flex flex-col gap-4">
              <h3 className="text-base font-semibold">Add relay list</h3>
              <p className="text-xs text-ink-faint font-[family-name:var(--font-inter)]">
                Paste one relay URL per line.
              </p>
              <textarea
                autoFocus
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={8}
                placeholder={"wss://relay.damus.io\nwss://relay.nostr.band"}
                className="border border-line-strong rounded px-3 py-2 text-sm font-[family-name:var(--font-inter)] bg-surface focus:outline-none focus:border-ink resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowBulkModal(false); setBulkInput(""); }}
                  className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-ink-soft hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAdd}
                  className="bg-ink text-bg text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:opacity-90 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-ink-soft hover:text-ink transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
