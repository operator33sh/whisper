"use client";

import { create } from "zustand";
import { RELAYS } from "@/app/lib/nostr";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import { decode } from "nostr-tools/nip19";
import type { Event, SimplePool } from "nostr-tools";

const STORAGE_KEY = "whisper:nsec";

interface FollowStore {
  follows: string[];
  setFollows: (pubkeys: string[]) => void;
  loadFollows: (pool: SimplePool, pubkey: string) => Promise<void>;
  follow: (pool: SimplePool, pubkey: string) => Promise<void>;
  unfollow: (pool: SimplePool, pubkey: string) => Promise<void>;
}

export const useFollows = create<FollowStore>((set, get) => ({
  follows: [],

  setFollows: (pubkeys) => set({ follows: pubkeys }),

  loadFollows: async (pool: SimplePool, pubkey: string) => {
    console.log("[loadFollows] fetching kind:3 for", pubkey);

    const event = await pool.get(RELAYS, {
      kinds: [3],
      authors: [pubkey],
    });

    if (!event) {
      console.warn("[loadFollows] no kind:3 event found for", pubkey);
      return;
    }

    const pubkeys = (event as Event).tags
      .filter((t) => t[0] === "p")
      .map((t) => t[1]);

    console.log("[loadFollows] loaded", pubkeys.length, "follows");
    set({ follows: pubkeys });
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
      await Promise.any(pool.publish(RELAYS, event));
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
      await Promise.any(pool.publish(RELAYS, event));
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
