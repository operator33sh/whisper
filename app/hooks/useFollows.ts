"use client";

import { create } from "zustand";
import { useRelays } from "@/app/hooks/useRelays";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import { decode } from "nostr-tools/nip19";
import type { Event, SimplePool } from "nostr-tools";

const STORAGE_KEY = "whisper:nsec";

interface FollowStore {
  follows: string[];
  loadingFollows: boolean;
  setFollows: (pubkeys: string[]) => void;
  loadFollows: (pool: SimplePool, pubkey: string) => void;
  follow: (pool: SimplePool, pubkey: string) => Promise<void>;
  unfollow: (pool: SimplePool, pubkey: string) => Promise<void>;
}

export const useFollows = create<FollowStore>((set, get) => ({
  follows: [],
  loadingFollows: true,

  setFollows: (pubkeys) => set({ follows: pubkeys }),

  loadFollows: (pool: SimplePool, pubkey: string) => {
    console.log("[loadFollows] fetching kind:3 for", pubkey);
    set({ loadingFollows: true });

    const sub = pool.subscribeMany(useRelays.getState().relays, [{ kinds: [3], authors: [pubkey], limit: 1 }], {
      onevent(event: Event) {
        const pubkeys = event.tags
          .filter((t) => t[0] === "p")
          .map((t) => t[1]);
        console.log("[loadFollows] loaded", pubkeys.length, "follows");
        set({ follows: pubkeys, loadingFollows: false });
        sub.close();
      },
      oneose() {
        set({ loadingFollows: false });
      },
    });
  },

  follow: async (pool: SimplePool, pubkey: string) => {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) throw new Error("Not logged in");

    let privateKey: Uint8Array;
    try {
      const decoded = decode(nsec);
      if (decoded.type !== "nsec") throw new Error("Invalid nsec type");
      privateKey = decoded.data as Uint8Array;
    } catch (e) {
      throw new Error(`Failed to decode nsec: ${e}`);
    }

    const currentFollows = get().follows;
    if (currentFollows.includes(pubkey)) return;

    const updatedFollows = [...currentFollows, pubkey];

    const event = finalizeEvent(
      {
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        tags: updatedFollows.map((pk) => ["p", pk]),
        content: "",
      },
      privateKey
    );

    console.log("[follow] publishing kind:3 event", event);

    try {
      await Promise.any(pool.publish(useRelays.getState().relays, event));
      console.log("[follow] relay acknowledged");
    } catch (e) {
      console.error("[follow] relay rejected or timed out:", e);
      throw e;
    }

    set({ follows: updatedFollows });
  },

  unfollow: async (pool: SimplePool, pubkey: string) => {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) throw new Error("Not logged in");

    let privateKey: Uint8Array;
    try {
      const decoded = decode(nsec);
      if (decoded.type !== "nsec") throw new Error("Invalid nsec type");
      privateKey = decoded.data as Uint8Array;
    } catch (e) {
      throw new Error(`Failed to decode nsec: ${e}`);
    }

    const updatedFollows = get().follows.filter((f) => f !== pubkey);

    const event = finalizeEvent(
      {
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        tags: updatedFollows.map((pk) => ["p", pk]),
        content: "",
      },
      privateKey
    );

    console.log("[unfollow] publishing kind:3 event", event);

    try {
      await Promise.any(pool.publish(useRelays.getState().relays, event));
      console.log("[unfollow] relay acknowledged");
    } catch (e) {
      console.error("[unfollow] relay rejected or timed out:", e);
      throw e;
    }

    set({ follows: updatedFollows });
  },
}));

export function getNsecPubkey(): string | null {
  const nsec = localStorage.getItem(STORAGE_KEY);
  if (!nsec) return null;
  try {
    const { type, data } = decode(nsec);
    if (type !== "nsec") return null;
    return getPublicKey(data as Uint8Array);
  } catch {
    return null;
  }
}
