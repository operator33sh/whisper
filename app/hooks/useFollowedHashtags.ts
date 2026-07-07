"use client";

import { create } from "zustand";

const STORAGE_KEY = "whisper:followed-hashtags";

interface FollowedHashtagStore {
  followedHashtags: string[];
  initFollowedHashtags: () => void;
  followHashtag: (tag: string) => void;
  unfollowHashtag: (tag: string) => void;
}

export const useFollowedHashtags = create<FollowedHashtagStore>((set, get) => ({
  followedHashtags: [],

  initFollowedHashtags: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ followedHashtags: parsed });
        }
      }
    } catch {
      // keep defaults
    }
  },

  followHashtag: (tag) => {
    const normalized = tag.toLowerCase().trim();
    if (!normalized || get().followedHashtags.includes(normalized)) return;
    const followedHashtags = [...get().followedHashtags, normalized];
    set({ followedHashtags });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followedHashtags));
  },

  unfollowHashtag: (tag) => {
    const normalized = tag.toLowerCase().trim();
    const followedHashtags = get().followedHashtags.filter((t) => t !== normalized);
    set({ followedHashtags });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followedHashtags));
  },
}));
