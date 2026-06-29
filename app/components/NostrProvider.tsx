"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SimplePool } from "nostr-tools";
import { RELAYS } from "@/app/lib/nostr";

interface NostrContextValue {
  pool: SimplePool;
  connected: boolean;
}

const NostrContext = createContext<NostrContextValue | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool] = useState(() => new SimplePool());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sockets = RELAYS.map((url) => new WebSocket(url));
    let openCount = 0;

    sockets.forEach((ws) => {
      ws.onopen = () => { openCount++; setConnected(openCount > 0); };
      ws.onclose = () => { openCount = Math.max(0, openCount - 1); setConnected(openCount > 0); };
      ws.onerror = () => { openCount = Math.max(0, openCount - 1); setConnected(openCount > 0); };
    });

    return () => {
      sockets.forEach((ws) => ws.close());
      pool.close(RELAYS);
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
