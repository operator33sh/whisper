"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SimplePool } from "nostr-tools";
import { RELAY_URL } from "@/app/lib/nostr";

interface NostrContextValue {
  pool: SimplePool;
  connected: boolean;
}

const NostrContext = createContext<NostrContextValue | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool] = useState(() => new SimplePool());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(RELAY_URL);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      pool.close([RELAY_URL]);
    };
  }, [pool]);

  return (
    <NostrContext.Provider value={{ pool, connected }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostrContext() {
  const ctx = useContext(NostrContext);
  if (!ctx) throw new Error("useNostrContext must be used within NostrProvider");
  return ctx;
}
