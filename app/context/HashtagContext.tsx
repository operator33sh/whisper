"use client";

import { createContext, useContext } from "react";

interface HashtagContextValue {
  openHashtag: (tag: string) => void;
}

export const HashtagContext = createContext<HashtagContextValue | null>(null);

export function useHashtagContext() {
  return useContext(HashtagContext);
}
