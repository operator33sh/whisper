"use client";

import { create } from "zustand";

interface Store {
  increments: Map<string, number>;
  increment: (eventId: string) => void;
}

export const useOptimisticReplyCounts = create<Store>((set) => ({
  increments: new Map(),
  increment: (eventId) =>
    set((state) => {
      const next = new Map(state.increments);
      next.set(eventId, (next.get(eventId) ?? 0) + 1);
      return { increments: next };
    }),
}));
