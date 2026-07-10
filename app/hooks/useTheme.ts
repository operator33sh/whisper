"use client";

import { create } from "zustand";

type Theme = "light" | "dark";

interface Store {
  theme: Theme;
  toggle: () => void;
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // De inline script in layout.tsx heeft de dark-class al correct gezet
  // op basis van localStorage — gebruik die als bron van waarheid.
  if (document.documentElement.classList.contains("dark")) return "dark";
  try {
    return localStorage.getItem("whisper:theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

let fadeTimer: ReturnType<typeof setTimeout> | null = null;

export const useTheme = create<Store>((set) => ({
  theme: initialTheme(),
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      const html = document.documentElement;
      html.classList.add("theme-transition");
      html.classList.toggle("dark", next === "dark");
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => html.classList.remove("theme-transition"), 850);
      try {
        localStorage.setItem("whisper:theme", next);
      } catch {}
      return { theme: next };
    }),
}));
