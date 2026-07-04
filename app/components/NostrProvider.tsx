"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SimplePool } from "nostr-tools";
import { useRelays } from "@/app/hooks/useRelays";

interface NostrContextValue {
  pool: SimplePool;
  connected: boolean;
  connectedRelays: Set<string>;
}

const NostrContext = createContext<NostrContextValue | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool] = useState(() => new SimplePool());
  const [connectedRelays, setConnectedRelays] = useState<Set<string>>(new Set());
  const relays = useRelays((s) => s.relays);

  useEffect(() => {
    const sockets: { url: string; ws: WebSocket }[] = relays.map((url) => ({
      url,
      ws: new WebSocket(url),
    }));

    sockets.forEach(({ url, ws }) => {
      ws.onopen = () => setConnectedRelays((prev) => new Set([...prev, url]));
      ws.onclose = () => setConnectedRelays((prev) => { const next = new Set(prev); next.delete(url); return next; });
      ws.onerror = () => setConnectedRelays((prev) => { const next = new Set(prev); next.delete(url); return next; });
    });

    return () => {
      sockets.forEach(({ ws }) => ws.close());
      pool.close(relays);
      setConnectedRelays(new Set());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(",")]);

  return (
    <NostrContext.Provider value={{ pool, connected: connectedRelays.size > 0, connectedRelays }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostrContext() {
  const ctx = useContext(NostrContext);
  if (!ctx) throw new Error("useNostrContext must be used within NostrProvider");
  return ctx;
}
