"use client";

import { create } from "zustand";

type Theme = "light" | "dark";

interface Store {
  theme: Theme;
  syncFromStorage: () => void;
  toggle: () => void;
}

let fadeTimer: ReturnType<typeof setTimeout> | null = null;

export const useTheme = create<Store>((set) => ({
  theme: "light", // SSR-safe default; client syncs on mount via syncFromStorage
  syncFromStorage: () => {
    // Only sync Zustand state (for the icon); the inline script in layout.tsx
    // already set the correct dark class on <html> — don't touch the DOM here.
    let next: Theme = "light";
    try {
      if (localStorage.getItem("whisper:theme") === "dark") next = "dark";
    } catch {}
    set({ theme: next });
  },
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      const html = document.documentElement;
      html.classList.add("theme-transition");
      // rAF ensures the browser commits the transition property before
      // the dark class changes — fixes instant jump in production builds.
      requestAnimationFrame(() => {
        html.classList.toggle("dark", next === "dark");
      });
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => html.classList.remove("theme-transition"), 850);
      try {
        localStorage.setItem("whisper:theme", next);
      } catch {}
      return { theme: next };
    }),
}));
