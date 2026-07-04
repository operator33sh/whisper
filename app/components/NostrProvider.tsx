"use client";

import { createContext, useContext, useState } from "react";
import { SimplePool } from "nostr-tools";

interface NostrContextValue {
  pool: SimplePool;
}

const NostrContext = createContext<NostrContextValue | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool] = useState(() => new SimplePool());

  return (
    <NostrContext.Provider value={{ pool }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostrContext() {
  const ctx = useContext(NostrContext);
  if (!ctx) throw new Error("useNostrContext must be used within NostrProvider");
  return ctx;
}
