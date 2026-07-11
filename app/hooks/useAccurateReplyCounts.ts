"use client";

import { create } from "zustand";
import type { SimplePool } from "nostr-tools";

// Accurate reply counts via NIP-45 COUNT, fetched per post when it enters
// the viewport. One COUNT per post per relay (multi-ID filters return a
// single aggregate, so batching IDs into one filter is not possible);
// we take the max across relays since counts cannot be deduplicated.

interface AccurateReplyCountsState {
  counts: Map<string, number>;
  setCount: (id: string, count: number) => void;
}

export const useAccurateReplyCounts = create<AccurateReplyCountsState>((set) => ({
  counts: new Map(),
  setCount: (id, count) =>
    set((s) => {
      if ((s.counts.get(id) ?? -1) === count) return s;
      const next = new Map(s.counts);
      next.set(id, count);
      return { counts: next };
    }),
}));

const TTL_MS = 60_000;
const FLUSH_MS = 300;
const CONCURRENCY = 4;
const COUNT_TIMEOUT_MS = 4000;

const fetchedAt = new Map<string, number>();
const queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let poolRef: SimplePool | null = null;
let relaysRef: string[] = [];

function countOnRelay(pool: SimplePool, url: string, id: string): Promise<number> {
  const work = pool
    .ensureRelay(url)
    .then((relay) => relay.count([{ kinds: [1], "#e": [id] }], {}))
    .catch(() => 0);
  const timeout = new Promise<number>((res) => setTimeout(() => res(0), COUNT_TIMEOUT_MS));
  return Promise.race([work, timeout]);
}

async function processQueue() {
  if (inFlight || !poolRef || relaysRef.length === 0) return;
  inFlight = true;
  try {
    while (queue.size > 0) {
      const batch = [...queue].slice(0, CONCURRENCY);
      batch.forEach((id) => queue.delete(id));
      await Promise.all(
        batch.map(async (id) => {
          const pool = poolRef!;
          const results = await Promise.all(relaysRef.map((url) => countOnRelay(pool, url, id)));
          const max = Math.max(0, ...results);
          fetchedAt.set(id, Date.now());
          useAccurateReplyCounts.getState().setCount(id, max);
        })
      );
    }
  } finally {
    inFlight = false;
  }
}

export function requestAccurateReplyCount(pool: SimplePool, relays: string[], eventId: string) {
  poolRef = pool;
  relaysRef = relays;
  const last = fetchedAt.get(eventId);
  if (last !== undefined && Date.now() - last < TTL_MS) return;
  if (queue.has(eventId)) return;
  queue.add(eventId);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void processQueue();
  }, FLUSH_MS);
}
