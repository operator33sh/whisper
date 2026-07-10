"use client";

import { create } from "zustand";

interface Store {
  increments: Map<string, number>;
  // Event-ids van eigen gepubliceerde replies; tel-subscriptions in feeds
  // slaan deze over zodat de optimistische +1 niet dubbel telt.
  publishedIds: Set<string>;
  increment: (eventId: string, replyEventId: string) => void;
}

export const useOptimisticReplyCounts = create<Store>((set) => ({
  increments: new Map(),
  publishedIds: new Set(),
  increment: (eventId, replyEventId) =>
    set((state) => {
      const next = new Map(state.increments);
      next.set(eventId, (next.get(eventId) ?? 0) + 1);
      const published = new Set(state.publishedIds);
      published.add(replyEventId);
      return { increments: next, publishedIds: published };
    }),
}));
