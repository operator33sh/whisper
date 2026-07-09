"use client";

import { create } from "zustand";
import { useRelays } from "@/app/hooks/useRelays";
import type { Event, SimplePool } from "nostr-tools";

interface EventStore {
  events: Map<string, Event>;
  fetching: Set<string>;
  fetchEvents: (pool: SimplePool, ids: string[]) => void;
}

// Batch event IDs arriving within 150ms into a single subscription
let pendingIds: string[] = [];
let batchPool: SimplePool | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let storeSet: ((fn: (s: EventStore) => Partial<EventStore>) => void) | null = null;

function flushBatch() {
  batchTimer = null;
  if (pendingIds.length === 0 || !batchPool || !storeSet) return;

  // Relays not loaded yet: retry the flush instead of sending an empty REQ
  const relays = useRelays.getState().relays;
  if (relays.length === 0) {
    batchTimer = setTimeout(flushBatch, 500);
    return;
  }

  const toFetch = pendingIds.splice(0);
  const pool = batchPool;
  batchPool = null;

  const set = storeSet;
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    set((s) => {
      const next = new Set(s.fetching);
      toFetch.forEach((id) => next.delete(id));
      return { fetching: next };
    });
    sub.close();
  }

  const sub = pool.subscribeMany(relays, [{ ids: toFetch, kinds: [1] }], {
    onevent(event: Event) {
      set((s) => {
        const next = new Map(s.events);
        next.set(event.id, event);
        return { events: next };
      });
    },
    oneose: finish,
  });

  // Safety net: a dead relay never EOSEs, which would leave ids stuck in
  // `fetching` forever and block all future retries
  setTimeout(finish, 8000);
}

export const useEvents = create<EventStore>((set, get) => {
  storeSet = set;

  return {
    events: new Map(),
    fetching: new Set(),

    fetchEvents: (pool: SimplePool, ids: string[]) => {
      const { events, fetching } = get();
      const missing = ids.filter((id) => !events.has(id) && !fetching.has(id));
      if (missing.length === 0) return;

      set((s) => {
        const next = new Set(s.fetching);
        missing.forEach((id) => next.add(id));
        return { fetching: next };
      });

      pendingIds.push(...missing);
      batchPool = pool;

      if (!batchTimer) {
        batchTimer = setTimeout(flushBatch, 150);
      }
    },
  };
});
